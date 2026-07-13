#!/usr/bin/env npx tsx
/**
 * Analyze ÖÖD House deals CSV against all_sage_data (Phase 0 Mirror Cabin audit).
 *
 * Exports review queues under scripts/.tmp-mirror-cabin-review/:
 *   - siblings-queue.csv       — matched Sage properties missing a Mirror Cabin row
 *   - net-new-ood-queue.csv    — unmatched ÖÖD deals (prioritized by location quality)
 *   - already-has-mirror.csv   — matched properties that already have Mirror Cabin
 *   - mirror-inventory-audit.csv — USA rows that look like mirror/glass/ÖÖD inventory
 *
 * Usage: npx tsx scripts/analyze-ood-deals-vs-glamping-properties.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-mirror-cabin-review');
const TODAY = new Date().toISOString().split('T')[0];

/** Original 8 matched properties from OOD_MIRROR_CABIN_INTEGRATION_RECOMMENDATIONS.md */
const SEED_SIBLING_NAMES = [
  'Borealis Basecamp',
  'Heritage Ranch MT',
  'Inn Town Campground',
  'Hidden Flower Tiny Farm',
  'Two Capes Lookout',
  'Dupont Yurts',
  'The Yurtopian',
  'Collective Governors Island',
  'Collective Retreats Governors Island',
];

function isSeedSiblingName(name: string | null): boolean {
  const n = (name ?? '').toLowerCase().trim();
  return SEED_SIBLING_NAMES.some((s) => {
    const target = s.toLowerCase();
    return n === target || n.includes(target) || target.includes(n);
  });
}

function matchConfidence(matchType: MatchType): 'high' | 'medium' | 'low' {
  switch (matchType) {
    case 'exact_address':
    case 'partial_address':
      return 'high';
    case 'city_state_zip':
      return 'medium';
    case 'city_state':
      return 'low';
    case 'no_match':
      return 'low';
    default: {
      const _exhaustive: never = matchType;
      return _exhaustive;
    }
  }
}

const US_STATE_ABBREV: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC', 'washington d.c.': 'DC',
  'washington dc': 'DC', 'd.c.': 'DC',
};

interface ParsedLocation {
  raw: string;
  address: string | null;
  city: string | null;
  state: string | null;
  stateAbbrev: string | null;
  zipCode: string | null;
}

function parseLocation(loc: string): ParsedLocation {
  const raw = (loc || '').trim();
  if (!raw) return { raw, address: null, city: null, state: null, stateAbbrev: null, zipCode: null };

  let s = raw
    .replace(/,?\s*USA\s*$/i, '')
    .replace(/,?\s*United States\s*$/i, '')
    .trim();
  if (s.endsWith(',')) s = s.slice(0, -1).trim();

  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { raw, address: null, city: null, state: null, stateAbbrev: null, zipCode: null };

  let address: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let stateAbbrev: string | null = null;
  let zipCode: string | null = null;

  const last = parts[parts.length - 1];
  const zipMatch = last?.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i) ?? last?.match(/^(\d{5}(?:-\d{4})?)$/);
  if (zipMatch) {
    if (zipMatch[2]) {
      stateAbbrev = (zipMatch[1] as string).toUpperCase();
      zipCode = zipMatch[2];
    } else {
      zipCode = zipMatch[1];
    }
    parts.pop();
  } else if (last && /^[A-Z]{2}$/i.test(last)) {
    stateAbbrev = last.toUpperCase();
    state = last;
    parts.pop();
  } else if (last) {
    const fullState = last.toLowerCase();
    stateAbbrev = US_STATE_ABBREV[fullState] ?? (fullState.length <= 2 ? last.toUpperCase() : null);
    state = last;
    if (stateAbbrev) parts.pop();
  }

  if (parts.length >= 1) {
    city = parts[parts.length - 1];
    parts.pop();
  }
  if (parts.length >= 1) {
    address = parts.join(', ');
  }

  return { raw, address, city, state, stateAbbrev, zipCode };
}

function normalizeForMatch(s: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,#]/g, '')
    .trim();
}

const STREET_SUFFIX_MAP: Record<string, string> = {
  ave: 'avenue', avenue: 'avenue',
  st: 'street', str: 'street', street: 'street',
  rd: 'road', road: 'road',
  blvd: 'boulevard', boulevard: 'boulevard',
  dr: 'drive', drive: 'drive',
  ln: 'lane', lane: 'lane',
  hwy: 'highway', highway: 'highway',
  ct: 'court', court: 'court',
  pl: 'place', place: 'place',
  cir: 'circle', circle: 'circle',
  trl: 'trail', trail: 'trail',
  pkwy: 'parkway', parkway: 'parkway',
  way: 'way',
  loop: 'loop',
  path: 'path',
  run: 'run',
  pass: 'pass',
  row: 'row',
  ter: 'terrace', terrace: 'terrace',
  co: 'county', county: 'county',
};

function normalizeAddressForMatch(addr: string | null): string {
  if (!addr) return '';
  let s = normalizeForMatch(addr);
  for (const [abbrev, canonical] of Object.entries(STREET_SUFFIX_MAP)) {
    const re = new RegExp(`\\b${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    s = s.replace(re, canonical);
  }
  return s.replace(/\s+/g, ' ').trim();
}

interface DbProperty {
  id: number;
  property_id: string | null;
  property_name: string | null;
  site_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  unit_type: string | null;
  url: string | null;
  is_open: string | null;
  research_status: string | null;
}

function propertyGroupKey(p: Pick<DbProperty, 'property_id' | 'property_name' | 'city' | 'state'>): string {
  if (p.property_id) return `pid:${p.property_id}`;
  return `name:${normalizeForMatch(p.property_name)}|${normalizeForMatch(p.city)}|${(p.state ?? '').toLowerCase().trim()}`;
}

function looksLikeMirrorCabin(unitType: string | null, siteName: string | null): boolean {
  const u = (unitType ?? '').toLowerCase();
  const s = (siteName ?? '').toLowerCase();
  return (
    u.includes('mirror cabin') ||
    u.includes('mirror house') ||
    u === 'mirror' ||
    s.includes('mirror cabin') ||
    s.includes('mirror house')
  );
}

function looksLikeGlassOrOodSignal(row: DbProperty): boolean {
  const blob = [
    row.unit_type,
    row.site_name,
    row.property_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    looksLikeMirrorCabin(row.unit_type, row.site_name) ||
    blob.includes('ööd') ||
    blob.includes('ood house') ||
    blob.includes('ood cabin') ||
    /\bglass cabin\b/.test(blob) ||
    /\bmirrored?\b/.test(blob)
  );
}

function isUsa(country: string | null, state: string | null): boolean {
  const c = (country ?? '').toLowerCase();
  if (c.includes('united states') || c === 'usa' || c === 'us' || c === '') {
    // Empty country + US state abbrev still counts for audit
    if (!c) {
      const st = (state ?? '').trim().toUpperCase();
      return st.length === 2 && Object.values(US_STATE_ABBREV).includes(st);
    }
    return true;
  }
  return false;
}

async function fetchSageProperties(
  supabase: ReturnType<typeof createClient>
): Promise<DbProperty[]> {
  const all: DbProperty[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select(
        'id, property_id, property_name, site_name, address, city, state, zip_code, country, unit_type, url, is_open, research_status'
      )
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Supabase error: ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as DbProperty[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

type MatchType = 'exact_address' | 'partial_address' | 'city_state_zip' | 'city_state' | 'no_match';

interface MatchResult {
  oodRow: { dealTitle: string; location: string; parsed: ParsedLocation };
  matchType: MatchType;
  matchedProperty: DbProperty | null;
  matchReason?: string;
}

function zip5(z: string | null): string {
  if (!z) return '';
  const m = String(z).match(/\d{5}/);
  return m ? m[0] : '';
}

function findMatch(
  parsed: ParsedLocation,
  dbProps: DbProperty[]
): { match: DbProperty | null; matchType: MatchType; reason?: string } {
  const normAddr = normalizeAddressForMatch(parsed.address);
  const normCity = normalizeForMatch(parsed.city);
  const normState = (parsed.stateAbbrev ?? parsed.state ?? '').toLowerCase();
  const normZip5 = zip5(parsed.zipCode);

  if (!normState) return { match: null, matchType: 'no_match' };
  if (!normCity && !normAddr && !normZip5) return { match: null, matchType: 'no_match' };

  const candidates: Array<{ p: DbProperty; score: number; matchType: MatchType; reason: string }> = [];

  for (const p of dbProps) {
    const dbAddr = normalizeAddressForMatch(p.address);
    const dbCity = normalizeForMatch(p.city);
    const dbState = (p.state ?? '').toLowerCase().trim();
    const dbStateNorm = dbState.length === 2 ? dbState : (US_STATE_ABBREV[dbState] ?? dbState).toLowerCase();
    const dbZip5 = zip5(p.zip_code);

    if (normState !== dbStateNorm) continue;

    let score = 0;
    let matchType: MatchType = 'city_state';
    let reason = 'City + state';

    if (normAddr && dbAddr) {
      if (normAddr === dbAddr) {
        score += 100;
        matchType = 'exact_address';
        reason = 'Exact address';
      } else {
        const shorter = normAddr.length <= dbAddr.length ? normAddr : dbAddr;
        const longer = normAddr.length > dbAddr.length ? normAddr : dbAddr;
        if (shorter.length >= 10 && /\d/.test(shorter) && longer.includes(shorter)) {
          score += 50;
          matchType = 'partial_address';
          reason = 'Partial address';
        }
      }
    }

    if (normCity && dbCity) {
      if (normCity === dbCity) {
        score += 20;
        if (matchType === 'city_state') reason = 'City + state';
      } else if (normCity.includes(dbCity) || dbCity.includes(normCity)) {
        score += 10;
        if (matchType === 'city_state') reason = 'City + state (fuzzy)';
      }
    }

    if (normZip5 && dbZip5 && normZip5 === dbZip5) {
      score += 30;
      if (matchType === 'city_state') {
        matchType = 'city_state_zip';
        reason = 'City + state + zip';
      }
    }

    score += 5;

    if (score >= 15) {
      candidates.push({ p, score, matchType, reason });
    }
  }

  if (candidates.length === 0) return { match: null, matchType: 'no_match' };

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return { match: best.p, matchType: best.matchType, reason: best.reason };
}

type NetNewPriority = 'high' | 'medium' | 'low';

function netNewPriority(parsed: ParsedLocation): NetNewPriority {
  if (parsed.address && parsed.city && (parsed.stateAbbrev || parsed.state)) return 'high';
  if (parsed.city && (parsed.stateAbbrev || parsed.state)) return 'medium';
  return 'low';
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(path: string, headers: string[], rows: string[][]): void {
  const lines = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => escapeCsv(c ?? '')).join(',')),
  ];
  fs.writeFileSync(path, lines.join('\n') + '\n', 'utf-8');
}

async function main(): Promise<void> {
  const csvPath = resolve(process.cwd(), 'csv/ood-deals-13847150-271.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = csv.parse(csvContent, { columns: true, skip_empty_lines: true, relax_column_count: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Fetching ${ALL_SAGE_DATA_TABLE}...`);
  const dbProps = await fetchSageProperties(supabase);
  console.log(`   Loaded ${dbProps.length} records\n`);

  const byGroup = new Map<string, DbProperty[]>();
  for (const p of dbProps) {
    const key = propertyGroupKey(p);
    const list = byGroup.get(key) ?? [];
    list.push(p);
    byGroup.set(key, list);
  }

  const groupsWithMirror = new Set<string>();
  for (const [key, list] of byGroup) {
    if (list.some((r) => looksLikeMirrorCabin(r.unit_type, r.site_name))) {
      groupsWithMirror.add(key);
    }
  }

  const results: MatchResult[] = [];
  const seenLocations = new Map<string, number>();

  for (const row of rows) {
    const dealTitle = (row['Deal - Title'] ?? '').trim();
    const location = (row['Deal - Location'] ?? '').trim();
    if (!location) continue;

    const key = `${location}|${dealTitle}`;
    if (seenLocations.has(key)) continue;
    seenLocations.set(key, 1);

    const parsed = parseLocation(location);
    const { match, matchType, reason } = findMatch(parsed, dbProps);

    results.push({
      oodRow: { dealTitle, location, parsed },
      matchType,
      matchedProperty: match,
      matchReason: reason,
    });
  }

  const matches = results.filter((r) => r.matchType !== 'no_match');
  const noMatches = results.filter((r) => r.matchType === 'no_match');

  const byType = {
    exact_address: results.filter((r) => r.matchType === 'exact_address'),
    partial_address: results.filter((r) => r.matchType === 'partial_address'),
    city_state_zip: results.filter((r) => r.matchType === 'city_state_zip'),
    city_state: results.filter((r) => r.matchType === 'city_state'),
    no_match: noMatches,
  };

  // Deduplicate matched properties by group key
  type MatchedPropertyEntry = {
    property: DbProperty;
    matchType: MatchType;
    reason?: string;
    deals: MatchResult[];
  };

  const uniqueMatched = new Map<string, MatchedPropertyEntry>();
  for (const r of matches) {
    const p = r.matchedProperty!;
    const gKey = propertyGroupKey(p);
    const existing = uniqueMatched.get(gKey);
    if (!existing) {
      uniqueMatched.set(gKey, {
        property: p,
        matchType: r.matchType,
        reason: r.matchReason,
        deals: [r],
      });
    } else {
      existing.deals.push(r);
    }
  }

  const siblings: MatchedPropertyEntry[] = [];
  const alreadyHas: MatchedPropertyEntry[] = [];
  for (const [, entry] of uniqueMatched) {
    const gKey = propertyGroupKey(entry.property);
    if (groupsWithMirror.has(gKey)) alreadyHas.push(entry);
    else siblings.push(entry);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const siblingRows = siblings
    .map((entry) => {
      const p = entry.property;
      const groupRows = byGroup.get(propertyGroupKey(p)) ?? [p];
      const unitTypes = [...new Set(groupRows.map((r) => r.unit_type ?? '').filter(Boolean))].join('; ');
      const siteNames = [...new Set(groupRows.map((r) => r.site_name ?? '').filter(Boolean))].join('; ');
      const confidence = matchConfidence(entry.matchType);
      const seed = isSeedSiblingName(p.property_name) ? 'yes' : 'no';
      return {
        entry,
        confidence,
        seed,
        row: [
          seed,
          confidence,
          String(p.id),
          p.property_id ?? '',
          p.property_name ?? '',
          p.city ?? '',
          p.state ?? '',
          p.zip_code ?? '',
          p.address ?? '',
          p.url ?? '',
          p.is_open ?? '',
          p.research_status ?? '',
          unitTypes,
          siteNames,
          entry.matchType,
          entry.reason ?? '',
          String(entry.deals.length),
          entry.deals.map((d) => d.oodRow.location).join(' | '),
          entry.deals.map((d) => d.oodRow.dealTitle).join(' | '),
          TODAY,
        ],
      };
    })
    .sort((a, b) => {
      if (a.seed !== b.seed) return a.seed === 'yes' ? -1 : 1;
      const confOrder = { high: 0, medium: 1, low: 2 } as const;
      return confOrder[a.confidence as keyof typeof confOrder] - confOrder[b.confidence as keyof typeof confOrder];
    });

  writeCsv(
    join(OUT_DIR, 'siblings-queue.csv'),
    [
      'seed_list',
      'match_confidence',
      'matched_row_id',
      'property_id',
      'property_name',
      'city',
      'state',
      'zip_code',
      'address',
      'url',
      'is_open',
      'research_status',
      'existing_unit_types',
      'existing_site_names',
      'match_type',
      'match_reason',
      'ood_deal_count',
      'ood_locations',
      'ood_deal_titles',
      'audit_date',
    ],
    siblingRows.map((s) => s.row)
  );

  // Phase 1 recommended subset: seed list OR medium+ confidence matches
  const phase1Rows = siblingRows
    .filter((s) => s.seed === 'yes' || s.confidence !== 'low')
    .map((s) => s.row);
  writeCsv(
    join(OUT_DIR, 'siblings-phase1-recommended.csv'),
    [
      'seed_list',
      'match_confidence',
      'matched_row_id',
      'property_id',
      'property_name',
      'city',
      'state',
      'zip_code',
      'address',
      'url',
      'is_open',
      'research_status',
      'existing_unit_types',
      'existing_site_names',
      'match_type',
      'match_reason',
      'ood_deal_count',
      'ood_locations',
      'ood_deal_titles',
      'audit_date',
    ],
    phase1Rows
  );

  const alreadyRows = alreadyHas.map((entry) => {
    const p = entry.property;
    const groupRows = byGroup.get(propertyGroupKey(p)) ?? [p];
    const mirrorRows = groupRows.filter((r) => looksLikeMirrorCabin(r.unit_type, r.site_name));
    return [
      String(p.id),
      p.property_id ?? '',
      p.property_name ?? '',
      p.city ?? '',
      p.state ?? '',
      mirrorRows.map((r) => String(r.id)).join(';'),
      mirrorRows.map((r) => r.unit_type ?? '').join(';'),
      mirrorRows.map((r) => r.site_name ?? '').join(';'),
      entry.matchType,
      String(entry.deals.length),
      entry.deals.map((d) => d.oodRow.location).join(' | '),
      TODAY,
    ];
  });

  writeCsv(
    join(OUT_DIR, 'already-has-mirror.csv'),
    [
      'matched_row_id',
      'property_id',
      'property_name',
      'city',
      'state',
      'mirror_row_ids',
      'mirror_unit_types',
      'mirror_site_names',
      'match_type',
      'ood_deal_count',
      'ood_locations',
      'audit_date',
    ],
    alreadyRows
  );

  const netNewRows = noMatches
    .map((r) => {
      const { parsed } = r.oodRow;
      const priority = netNewPriority(parsed);
      return {
        r,
        priority,
        sort: priority === 'high' ? 0 : priority === 'medium' ? 1 : 2,
      };
    })
    .sort((a, b) => a.sort - b.sort || a.r.oodRow.location.localeCompare(b.r.oodRow.location))
    .map(({ r, priority }) => {
      const { parsed } = r.oodRow;
      return [
        priority,
        r.oodRow.dealTitle,
        r.oodRow.location,
        parsed.address ?? '',
        parsed.city ?? '',
        parsed.stateAbbrev ?? parsed.state ?? '',
        parsed.zipCode ?? '',
        TODAY,
      ];
    });

  writeCsv(
    join(OUT_DIR, 'net-new-ood-queue.csv'),
    [
      'priority',
      'deal_title',
      'raw_location',
      'parsed_address',
      'parsed_city',
      'parsed_state',
      'parsed_zip',
      'audit_date',
    ],
    netNewRows
  );

  const inventoryRows = dbProps
    .filter((p) => isUsa(p.country, p.state) && looksLikeGlassOrOodSignal(p))
    .map((p) => [
      String(p.id),
      p.property_id ?? '',
      p.property_name ?? '',
      p.site_name ?? '',
      p.unit_type ?? '',
      p.city ?? '',
      p.state ?? '',
      p.is_open ?? '',
      p.research_status ?? '',
      p.url ?? '',
      looksLikeMirrorCabin(p.unit_type, p.site_name) ? 'yes' : 'no',
      TODAY,
    ]);

  writeCsv(
    join(OUT_DIR, 'mirror-inventory-audit.csv'),
    [
      'id',
      'property_id',
      'property_name',
      'site_name',
      'unit_type',
      'city',
      'state',
      'is_open',
      'research_status',
      'url',
      'is_mirror_cabin_signal',
      'audit_date',
    ],
    inventoryRows
  );

  const highNetNew = netNewRows.filter((r) => r[0] === 'high').length;
  const mediumNetNew = netNewRows.filter((r) => r[0] === 'medium').length;
  const lowNetNew = netNewRows.filter((r) => r[0] === 'low').length;

  console.log('='.repeat(70));
  console.log(`ÖÖD House Deals vs ${ALL_SAGE_DATA_TABLE} – Phase 0 Match Analysis`);
  console.log('='.repeat(70));
  console.log();
  console.log('SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Total ÖÖD deals (unique locations): ${results.length}`);
  console.log(`MATCHED deal rows:   ${matches.length}`);
  console.log(`Unique matched properties: ${uniqueMatched.size}`);
  console.log(`  → siblings queue (need Mirror Cabin row): ${siblings.length}`);
  console.log(`  → already has Mirror Cabin:               ${alreadyHas.length}`);
  console.log(`NO MATCH deal rows:  ${noMatches.length}`);
  console.log(`  → high priority (street address): ${highNetNew}`);
  console.log(`  → medium (city+state):            ${mediumNetNew}`);
  console.log(`  → low (vague):                    ${lowNetNew}`);
  console.log(`USA mirror/glass/ÖÖD inventory signals: ${inventoryRows.length}`);
  console.log();
  console.log('Match breakdown:');
  console.log(`  Exact address:    ${byType.exact_address.length}`);
  console.log(`  Partial address:  ${byType.partial_address.length}`);
  console.log(`  City + state+zip: ${byType.city_state_zip.length}`);
  console.log(`  City + state:     ${byType.city_state.length}`);
  console.log();

  console.log('SIBLINGS QUEUE (add Mirror Cabin row):');
  console.log('-'.repeat(60));
  const seedSiblings = siblingRows.filter((s) => s.seed === 'yes');
  const medHighSiblings = siblingRows.filter((s) => s.seed === 'no' && s.confidence !== 'low');
  const lowSiblings = siblingRows.filter((s) => s.seed === 'no' && s.confidence === 'low');
  console.log(`  Seed-list (doc 8): ${seedSiblings.length}`);
  for (const s of seedSiblings) {
    console.log(`    ${s.row[4]} (id=${s.row[2]}, conf=${s.confidence})`);
  }
  console.log(`  Other medium+ confidence: ${medHighSiblings.length}`);
  for (const s of medHighSiblings) {
    console.log(`    ${s.row[4]} (id=${s.row[2]}, conf=${s.confidence}, ${s.row[14]})`);
  }
  console.log(`  Low confidence city+state only (review carefully): ${lowSiblings.length}`);
  console.log();

  // Seed coverage: look up doc-named properties even if ÖÖD fuzzy match missed them
  console.log('SEED LIST COVERAGE (doc 8):');
  console.log('-'.repeat(60));
  const seedCoverageRows: string[][] = [];
  const seedQueries: Array<{ label: string; test: (name: string) => boolean }> = [
    { label: 'Borealis Basecamp', test: (n) => n.includes('borealis basecamp') },
    { label: 'Heritage Ranch MT', test: (n) => n.includes('heritage ranch') },
    { label: 'Inn Town Campground', test: (n) => n.includes('inn town') },
    { label: 'Hidden Flower Tiny Farm', test: (n) => n.includes('hidden flower') },
    { label: 'Two Capes Lookout', test: (n) => n.includes('two capes') },
    { label: 'Dupont Yurts', test: (n) => n.includes('dupont yurt') },
    { label: 'The Yurtopian', test: (n) => n.includes('yurtopian') },
    {
      label: 'Collective Governors Island',
      test: (n) => /collective/.test(n) && /governors?\s*island/.test(n),
    },
  ];
  for (const q of seedQueries) {
    const seenGroups = new Set<string>();
    const uniqueProps: DbProperty[] = [];
    for (const p of dbProps) {
      const name = (p.property_name ?? '').toLowerCase();
      if (!q.test(name)) continue;
      const g = propertyGroupKey(p);
      if (seenGroups.has(g)) continue;
      seenGroups.add(g);
      uniqueProps.push(p);
    }
    if (uniqueProps.length === 0) {
      console.log(`  MISSING FROM DB: ${q.label}`);
      seedCoverageRows.push([q.label, 'missing_from_db', '', '', '', '', '', TODAY]);
      continue;
    }
    for (const p of uniqueProps) {
      const g = propertyGroupKey(p);
      const hasMirror = groupsWithMirror.has(g);
      const status = hasMirror ? 'already_has_mirror' : 'needs_sibling';
      console.log(`  ${status}: ${p.property_name} (id=${p.id}, ${p.city}, ${p.state})`);
      seedCoverageRows.push([
        q.label,
        status,
        String(p.id),
        p.property_id ?? '',
        p.property_name ?? '',
        p.city ?? '',
        p.state ?? '',
        TODAY,
      ]);
    }
  }
  writeCsv(
    join(OUT_DIR, 'seed-list-coverage.csv'),
    [
      'seed_name',
      'status',
      'matched_row_id',
      'property_id',
      'property_name',
      'city',
      'state',
      'audit_date',
    ],
    seedCoverageRows
  );

  console.log();
  console.log('ALREADY HAS MIRROR (skip sibling insert):');
  console.log('-'.repeat(60));
  for (const entry of alreadyHas) {
    const p = entry.property;
    console.log(`  ${p.property_name} (id=${p.id})`);
  }
  console.log();

  console.log('HIGH-PRIORITY NET-NEW (sample):');
  console.log('-'.repeat(60));
  for (const row of netNewRows.filter((r) => r[0] === 'high').slice(0, 15)) {
    console.log(`  ${row[2]}`);
    console.log(`    Deal: ${row[1]}`);
  }
  if (highNetNew > 15) console.log(`  … +${highNetNew - 15} more`);
  console.log();

  console.log(`Phase 1 recommended siblings: ${phase1Rows.length}`);
  console.log('Exports written:');
  console.log(`  ${join(OUT_DIR, 'siblings-queue.csv')}`);
  console.log(`  ${join(OUT_DIR, 'siblings-phase1-recommended.csv')}`);
  console.log(`  ${join(OUT_DIR, 'already-has-mirror.csv')}`);
  console.log(`  ${join(OUT_DIR, 'net-new-ood-queue.csv')}`);
  console.log(`  ${join(OUT_DIR, 'mirror-inventory-audit.csv')}`);
  console.log(`  ${join(OUT_DIR, 'seed-list-coverage.csv')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
