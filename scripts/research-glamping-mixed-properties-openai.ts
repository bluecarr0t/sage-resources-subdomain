#!/usr/bin/env npx tsx
/**
 * Research Glamping Resorts, Marinas, Outdoor Resorts, and Landscape Hotels
 * in NY, VA, TN, MD, AZ, ID with 40%+ glamping units.
 *
 * Glamping units: Safari Tents, Treehouses, Cabins, Domes, Yurts, Airstreams, etc.
 * Deduplicates by address and fuzzy match on property_name.
 * Inserts with research_status = 'new'.
 *
 * Usage:
 *   npx tsx scripts/research-glamping-mixed-properties-openai.ts
 *   npx tsx scripts/research-glamping-mixed-properties-openai.ts --dry-run
 *   npx tsx scripts/research-glamping-mixed-properties-openai.ts --limit 10
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

function slugifyPropertyName(name: string): string {
  const transliterated = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function normalizeForFuzzy(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalizeForFuzzy(a);
  const nb = normalizeForFuzzy(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.95;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

config({ path: resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY in .env.local');
  process.exit(1);
}
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'all_glamping_properties';
const DELAY_MS = 1500;
const TODAY = new Date().toISOString().split('T')[0];
const NAME_SIMILARITY_THRESHOLD = 0.85;
const ADDRESS_SIMILARITY_THRESHOLD = 0.8;

const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO',
  Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH',
  Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA',
  Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};

function toStateCode(s: string): string {
  const trimmed = (s || '').trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_NAME_TO_CODE[trimmed] || trimmed;
}

const TARGET_STATES = [
  { name: 'New York', code: 'NY' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Idaho', code: 'ID' },
] as const;

interface DiscoveredProperty {
  property_name: string;
  city?: string;
  state: string;
  address?: string;
  zip_code?: string;
  url?: string;
  phone_number?: string;
  description?: string;
  property_type?: string;
  unit_type?: string;
  lat?: number;
  lon?: number;
}

interface ExistingRecord {
  property_name: string;
  address: string;
}

async function getExistingProperties(): Promise<ExistingRecord[]> {
  const all: { property_name?: string | null; address?: string | null }[] = [];
  const PAGE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('property_name, address')
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error('Error fetching existing properties:', error);
      break;
    }
    if (!data?.length) break;
    all.push(...data);
    hasMore = data.length === PAGE;
    offset += PAGE;
  }

  return all.map((r: { property_name?: string | null; address?: string | null }) => ({
    property_name: (r.property_name || '').trim(),
    address: (r.address || '').trim(),
  }));
}

function isDuplicateFuzzy(p: DiscoveredProperty, existing: ExistingRecord[]): boolean {
  const pName = (p.property_name || '').trim();
  const pAddr = (p.address || '').trim();

  for (const e of existing) {
    const nameSim = similarity(pName, e.property_name);
    if (nameSim >= NAME_SIMILARITY_THRESHOLD) return true;

    if (pAddr && e.address) {
      const addrSim = similarity(pAddr, e.address);
      if (addrSim >= ADDRESS_SIMILARITY_THRESHOLD) return true;
    }
  }
  return false;
}

async function discoverPropertiesForState(
  stateName: string,
  stateCode: string,
  limit?: number
): Promise<DiscoveredProperty[]> {
  const limitClause = limit ? `Return up to ${limit} properties.` : 'Return 8-20 properties.';

  const prompt = `You are a researcher for an outdoor hospitality directory. List real properties in ${stateName}, USA that meet ALL of these criteria:

1. PROPERTY TYPES: Include only properties that are one or more of:
   - Glamping Resorts (safari tents, domes, treehouses, cabins, yurts, Airstreams, shepherd huts)
   - Marinas with lodging (marina + cabins, cottages, glamping units on-site)
   - Outdoor Resorts (campgrounds/resorts with significant glamping accommodations)
   - Landscape Hotels (luxury lodges with floor-to-ceiling windows, panoramic nature views, architecture blending into nature)

2. GLAMPING UNIT THRESHOLD: At least 40% of the property's accommodations must be glamping-style units such as:
   - Safari tents, glamping tents, bell tents
   - Treehouses, treehouse cabins
   - Cabins, cottages, tiny homes
   - Domes, geodesic domes, bubble tents
   - Yurts, shepherd huts, Airstreams, vintage trailers
   - Luxury canvas lodges, platform tents

   EXCLUDE: Traditional RV parks where most sites are RV pads, standard campgrounds with mostly tent sites, hotels with only conventional rooms.

3. Currently operating (not permanently closed).

${limitClause}

For each property provide: property_name (required), city (required), state (required), address, zip_code, url (official website), phone_number, description (2-4 sentences), property_type (e.g. "Glamping Resort", "Marina with Glamping", "Outdoor Resort", "Landscape Hotel"), unit_type (e.g. "safari tents, treehouses, cabins"), lat, lon if known.

Return a JSON object with a "properties" array. Be accurate - only include properties you are confident exist and meet the 40% glamping unit threshold.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) return [];

  let parsed: { properties?: DiscoveredProperty[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return [];
  }

  const list = Array.isArray(parsed.properties) ? parsed.properties : [];
  return list
    .filter((p) => p && typeof p.property_name === 'string' && p.property_name.trim())
    .map((p) => ({
      ...p,
      property_name: String(p.property_name).trim(),
      state: toStateCode(p.state || stateCode),
    }));
}

function toDbRow(p: DiscoveredProperty): Record<string, unknown> {
  const slug = slugifyPropertyName(p.property_name);
  let url = (p.url || '').trim();
  if (url && !url.startsWith('http')) url = `https://${url}`;

  return {
    property_name: p.property_name,
    slug,
    property_type: p.property_type || 'Glamping',
    research_status: 'new',
    is_glamping_property: 'Yes',
    is_closed: 'No',
    source: 'Sage',
    discovery_source: 'OpenAI Research - Mixed Properties (40%+ Glamping)',
    date_added: TODAY,
    date_updated: TODAY,
    address: p.address || null,
    city: p.city || null,
    state: toStateCode(p.state || '') || null,
    zip_code: p.zip_code || null,
    country: 'USA',
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    url: url || null,
    phone_number: p.phone_number || null,
    description: p.description || null,
    unit_type: p.unit_type || null,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(String(process.argv[limitIdx + 1] || '').replace('--limit=', '') || '0', 10)
      : undefined;

  console.log('Researching Glamping Resorts, Marinas, Outdoor Resorts, Landscape Hotels');
  console.log('States: NY, VA, TN, MD, AZ, ID (40%+ glamping units)\n');
  console.log('Fetching existing properties for fuzzy dedup...');
  const existing = await getExistingProperties();
  console.log(`Loaded ${existing.length} existing records.\n`);

  const allNew: DiscoveredProperty[] = [];

  for (const state of TARGET_STATES) {
    console.log(`Researching ${state.name} (${state.code})...`);
    await new Promise((r) => setTimeout(r, DELAY_MS));

    const discovered = await discoverPropertiesForState(state.name, state.code, limit);
    const filtered = discovered.filter((p) => !isDuplicateFuzzy(p, existing));

    console.log(`  Found ${discovered.length} properties, ${filtered.length} new after fuzzy dedup.`);

    for (const p of filtered) {
      allNew.push(p);
      existing.push({
        property_name: p.property_name,
        address: p.address || '',
      });
    }
  }

  // Dedup within allNew (same property might appear for multiple states)
  const seen = new Set<string>();
  const uniqueNew = allNew.filter((p) => {
    const key = `${normalizeForFuzzy(p.property_name)}|${normalizeForFuzzy(p.address || '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal unique new properties to add: ${uniqueNew.length}`);

  if (uniqueNew.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would insert:');
    uniqueNew.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.property_name} (${p.city}, ${p.state}) - ${p.property_type || 'N/A'} - ${p.address || 'no address'}`);
    });
    return;
  }

  const rows = uniqueNew.map(toDbRow);
  const BATCH_SIZE = 20;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from(TABLE).insert(batch).select('id, property_name, state');

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length ?? 0} rows`);
  }

  console.log(`\nDone. Added ${uniqueNew.length} new properties with research_status='new'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
