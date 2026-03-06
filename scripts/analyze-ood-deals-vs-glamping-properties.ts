#!/usr/bin/env npx tsx
/**
 * Analyze ÖÖD House deals CSV against all_glamping_properties.
 * Determines how many ÖÖD unit locations match existing glamping properties.
 *
 * Usage: npx tsx scripts/analyze-ood-deals-vs-glamping-properties.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

config({ path: resolve(process.cwd(), '.env.local') });

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

// Street suffix abbreviations → canonical form for fuzzy address matching
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
  co: 'county', county: 'county', // "Co Rd 204" → "County Road 204"
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
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  unit_type: string | null;
}

async function fetchGlampingProperties(supabase: ReturnType<typeof createClient>): Promise<DbProperty[]> {
  const all: DbProperty[] = [];
  let offset = 0;
  const pageSize = 1000; // Supabase default limit per query

  while (true) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('id, property_name, address, city, state, zip_code, unit_type')
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
  _rawLocation: string,
  _dealTitle: string,
  dbProps: DbProperty[]
): { match: DbProperty | null; matchType: MatchType; reason?: string } {
  const normAddr = normalizeAddressForMatch(parsed.address);
  const normCity = normalizeForMatch(parsed.city);
  const normState = (parsed.stateAbbrev ?? parsed.state ?? '').toLowerCase();
  const normZip5 = zip5(parsed.zipCode);

  // Require state + (city or address or zip) to avoid state-only false positives
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

    // Address (fuzzy)
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

    // City (fuzzy: exact or one contains the other)
    if (normCity && dbCity) {
      if (normCity === dbCity) {
        score += 20;
        if (matchType === 'city_state') reason = 'City + state';
      } else if (normCity.includes(dbCity) || dbCity.includes(normCity)) {
        score += 10;
        if (matchType === 'city_state') reason = 'City + state (fuzzy)';
      }
    }

    // Zip (fuzzy: first 5 digits)
    if (normZip5 && dbZip5 && normZip5 === dbZip5) {
      score += 30;
      if (matchType === 'city_state') {
        matchType = 'city_state_zip';
        reason = 'City + state + zip';
      }
    }

    // State match (required, already filtered)
    score += 5;

    // Require at least one of: address match, city match, or zip match (not just state)
    if (score >= 15) {
      candidates.push({ p, score, matchType, reason });
    }
  }

  if (candidates.length === 0) return { match: null, matchType: 'no_match' };

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return { match: best.p, matchType: best.matchType, reason: best.reason };
}

async function main(): Promise<void> {
  const csvPath = resolve(process.cwd(), 'csv/ood-deals-13847150-271.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = csv.parse(csvContent, { columns: true, skip_empty_lines: true, relax_column_count: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('📥 Fetching all_glamping_properties...');
  const dbProps = await fetchGlampingProperties(supabase);
  console.log(`   Loaded ${dbProps.length} records\n`);

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
    const { match, matchType, reason } = findMatch(parsed, location, dealTitle, dbProps);

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

  console.log('='.repeat(70));
  console.log('ÖÖD House Deals vs all_glamping_properties – Match Analysis');
  console.log('='.repeat(70));
  console.log();
  console.log('📊 SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Total ÖÖD deals (unique locations): ${results.length}`);
  console.log(`MATCHED:   ${matches.length}`);
  console.log(`NO MATCH:  ${noMatches.length}`);
  console.log();
  const withAddress = results.filter((r) => r.oodRow.parsed.address);
  console.log(`ÖÖD deals with address: ${withAddress.length}`);
  console.log('Match breakdown (fuzzy: address, city, state, zip):');
  console.log(`  Exact address:    ${byType.exact_address.length}`);
  console.log(`  Partial address:  ${byType.partial_address.length}`);
  console.log(`  City + state+zip: ${byType.city_state_zip.length}`);
  console.log(`  City + state:     ${byType.city_state.length}`);
  console.log();

  console.log('✅ MATCHED (existing properties – add Mirror Cabin unit type):');
  console.log('-'.repeat(60));
  for (const r of matches) {
    const p = r.matchedProperty!;
    console.log(`  ${r.oodRow.location}`);
    console.log(`    → ${p.property_name} (id=${p.id}) [${r.matchType}] ${r.matchReason ?? ''}`);
    console.log(`    Current unit_type: ${p.unit_type ?? 'null'}`);
  }
  console.log();

  console.log('❌ NO MATCH (candidates for new property records):');
  console.log('-'.repeat(60));
  for (const r of noMatches) {
    const { parsed } = r.oodRow;
    const locParts = [parsed.address, parsed.city, parsed.stateAbbrev ?? parsed.state, parsed.zipCode].filter(Boolean);
    console.log(`  ${r.oodRow.location}`);
    console.log(`    Parsed: ${locParts.join(', ') || 'insufficient data'}`);
    console.log(`    Deal: ${r.oodRow.dealTitle}`);
  }

  console.log();
  console.log('='.repeat(70));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(70));
  console.log(`
1. FOR MATCHED PROPERTIES (${matches.length}):
   - Add "Mirror Cabin" or "ÖÖD House" to unit_type for existing records.
   - If unit_type is comma-separated (e.g. "Cabin, Yurt"), append ", Mirror Cabin".
   - Use discovery_source or a note to record "ÖÖD House" as source.

2. FOR NO-MATCH LOCATIONS (${noMatches.length}):
   - These are ÖÖD units at locations not yet in all_glamping_properties.
   - Many may be private/individual installations rather than glamping resorts.
   - Recommended: Web research each to confirm it's a glamping property before adding.
   - If confirmed: create new record with unit_type including "Mirror Cabin".
   - Enrich with: property_name, url, description, lat/lon from web search.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
