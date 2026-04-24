#!/usr/bin/env npx tsx
/**
 * Research glamping properties with AIRSTREAM unit type, minimum 5 total units.
 * North America (USA, Canada, Mexico). Fuzzy dedup on property_name, address, city, state.
 * Inserts with research_status = 'new'.
 *
 * Usage:
 *   npx tsx scripts/research-airstream-glamping-openai.ts
 *   npx tsx scripts/research-airstream-glamping-openai.ts --dry-run
 *   npx tsx scripts/research-airstream-glamping-openai.ts --limit 10
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
const DELAY_MS = 2000;
const TODAY = new Date().toISOString().split('T')[0];
const MIN_UNITS = 5;

const NAME_SIMILARITY_THRESHOLD = 0.85;
const ADDRESS_SIMILARITY_THRESHOLD = 0.8;
const CITY_SIMILARITY_THRESHOLD = 0.9;
const STATE_SIMILARITY_THRESHOLD = 0.85;

const USA_STATE_CODE: Record<string, string> = {
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

const CANADA_PROVINCE_CODE: Record<string, string> = {
  Alberta: 'AB', 'British Columbia': 'BC', Manitoba: 'MB', 'New Brunswick': 'NB',
  Newfoundland: 'NL', 'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS',
  Ontario: 'ON', 'Prince Edward Island': 'PE', Quebec: 'QC', 'Québec': 'QC',
  Saskatchewan: 'SK', 'Northwest Territories': 'NT', Nunavut: 'NU', Yukon: 'YT',
};

function toStateOrProvinceCode(s: string, country: string): string {
  const trimmed = (s || '').trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  if (country === 'Canada' || country === 'CA') {
    return CANADA_PROVINCE_CODE[trimmed] || trimmed;
  }
  return USA_STATE_CODE[trimmed] || trimmed;
}

interface DiscoveredProperty {
  property_name: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  zip_code?: string;
  url?: string;
  phone_number?: string;
  description?: string;
  property_type?: string;
  unit_type?: string;
  quantity_of_units?: number;
  property_total_sites?: number;
  lat?: number;
  lon?: number;
}

interface ExistingRecord {
  property_name: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

async function getExistingProperties(): Promise<ExistingRecord[]> {
  const all: { property_name?: string | null; address?: string | null; city?: string | null; state?: string | null; country?: string | null }[] = [];
  const PAGE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('property_name, address, city, state, country')
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

  return all.map((r) => ({
    property_name: (r.property_name || '').trim(),
    address: (r.address || '').trim(),
    city: (r.city || '').trim(),
    state: (r.state || '').trim(),
    country: (r.country || '').trim(),
  }));
}

function isDuplicateFuzzy(p: DiscoveredProperty, existing: ExistingRecord[]): boolean {
  const pName = (p.property_name || '').trim();
  const pAddr = (p.address || '').trim();
  const pCity = (p.city || '').trim();
  const pState = (p.state || '').trim();
  const pCountry = (p.country || 'USA').trim();

  for (const e of existing) {
    const nameSim = similarity(pName, e.property_name);
    if (nameSim >= NAME_SIMILARITY_THRESHOLD) {
      const cityMatch = !pCity || !e.city || similarity(pCity, e.city) >= CITY_SIMILARITY_THRESHOLD;
      const stateMatch = !pState || !e.state || similarity(pState, e.state) >= STATE_SIMILARITY_THRESHOLD;
      const countryMatch = !pCountry || !e.country || similarity(pCountry, e.country) >= 0.9;
      if (cityMatch && stateMatch && countryMatch) return true;
    }

    if (pAddr && e.address) {
      const addrSim = similarity(pAddr, e.address);
      if (addrSim >= ADDRESS_SIMILARITY_THRESHOLD) {
        const cityMatch = !pCity || !e.city || similarity(pCity, e.city) >= CITY_SIMILARITY_THRESHOLD;
        const stateMatch = !pState || !e.state || similarity(pState, e.state) >= STATE_SIMILARITY_THRESHOLD;
        if (cityMatch && stateMatch) return true;
      }
    }
  }
  return false;
}

function hasMinimumUnits(p: DiscoveredProperty): boolean {
  const units = p.quantity_of_units ?? p.property_total_sites;
  if (units == null) return true;
  const n = typeof units === 'number' ? units : parseInt(String(units), 10);
  return !isNaN(n) && n >= MIN_UNITS;
}

type ResearchQuery = { label: string; prompt: string; country: string };

function buildResearchQueries(limit?: number): ResearchQuery[] {
  const limitClause = limit
    ? `Return exactly ${limit} properties.`
    : 'Return 15-25 properties.';

  const unitRequirement = `CRITICAL: Include ONLY properties that have at least ${MIN_UNITS} Airstream units (quantity_of_units or property_total_sites >= ${MIN_UNITS}). Exclude single-unit or 1-4 unit properties.`;

  return [
    {
      label: 'USA - Airstream Resorts (5+ units)',
      country: 'USA',
      prompt: `You are a researcher for an outdoor hospitality directory. List AIRSTREAM glamping resorts in the United States.

${unitRequirement}

Include properties that:
- Offer Airstream trailers (or vintage trailers) as a primary accommodation type
- Have at least 5 Airstream/trailer units on site
- Are currently operating
- May use terms: Airstream, vintage trailer, retro trailer, silver bullet
- May also offer other units, but Airstreams must be a main offering
- Exclude RV parks where guests bring their own RVs

${limitClause}

For each property provide: property_name (required), city (required), state (required), address, zip_code, url (official website), phone_number, description (2-4 sentences emphasizing Airstream/vintage trailer experience), property_type (e.g. "Glamping Resort", "Airstream Resort"), unit_type (must include "Airstream" or "vintage trailer"), quantity_of_units (required - number of Airstream units, must be >= 5), property_total_sites (if different), lat, lon if known.

Return a JSON object with a "properties" array. Only include properties with 5+ Airstream units.`,
    },
    {
      label: 'Canada - Airstream Resorts (5+ units)',
      country: 'Canada',
      prompt: `You are a researcher for an outdoor hospitality directory. List AIRSTREAM glamping resorts in Canada.

${unitRequirement}

Include properties across provinces (BC, Ontario, Quebec, etc.) that:
- Offer Airstream trailers or vintage trailers as a primary unit type
- Have at least 5 Airstream/trailer units on site
- Are currently operating

${limitClause}

For each property provide: property_name (required), city (required), state (province), address, zip_code (postal code), url (official website), phone_number, description (2-4 sentences), property_type, unit_type (must include "Airstream"), quantity_of_units (required, >= 5), property_total_sites, lat, lon if known. Use country: "Canada".

Return a JSON object with a "properties" array. Only include properties with 5+ Airstream units.`,
    },
    {
      label: 'Mexico - Airstream Resorts (5+ units)',
      country: 'Mexico',
      prompt: `You are a researcher for an outdoor hospitality directory. List AIRSTREAM glamping resorts in Mexico.

${unitRequirement}

Include properties in Tulum, Riviera Maya, Baja California, and other regions that:
- Offer Airstream trailers or vintage trailers (remolques Airstream) as a primary unit type
- Have at least 5 Airstream/trailer units on site
- Are currently operating

${limitClause}

For each property provide: property_name (required), city (required), state (region), address, zip_code, url (official website), phone_number, description (2-4 sentences), property_type, unit_type (must include "Airstream"), quantity_of_units (required, >= 5), property_total_sites, lat, lon if known. Use country: "Mexico".

Return a JSON object with a "properties" array. Only include properties with 5+ Airstream units.`,
    },
  ];
}

async function discoverProperties(query: ResearchQuery, limit?: number, retries = 3): Promise<DiscoveredProperty[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: query.prompt }],
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
        .filter(hasMinimumUnits)
        .map((p) => {
          const country = (p.country || query.country || 'USA').trim();
          const state = p.state ? toStateOrProvinceCode(String(p.state), country) : '';
          return {
            ...p,
            property_name: String(p.property_name).trim(),
            state: state || null,
            country: country || 'USA',
            unit_type: 'Airstream',
          };
        });
    } catch (err: unknown) {
      const isRateLimit = err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 429;
      if (isRateLimit && attempt < retries) {
        const waitMs = 10000 * attempt;
        console.log(`  Rate limited. Retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})...`);
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
  return [];
}

function toDbRow(p: DiscoveredProperty): Record<string, unknown> {
  const slug = slugifyPropertyName(p.property_name);
  let url = (p.url || '').trim();
  if (url && !url.startsWith('http')) url = `https://${url}`;

  const country = (p.country || 'USA').trim();
  const units = p.quantity_of_units ?? p.property_total_sites;
  const quantityOfUnits = typeof units === 'number' ? units : units != null ? parseInt(String(units), 10) : null;

  return {
    property_name: p.property_name,
    slug,
    property_type: p.property_type || 'Glamping Resort',
    research_status: 'new',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    source: 'Sage',
    discovery_source: 'OpenAI Research - Airstreams',
    date_added: TODAY,
    date_updated: TODAY,
    address: p.address || null,
    city: p.city || null,
    state: p.state || null,
    zip_code: p.zip_code || null,
    country: country === 'USA' ? 'USA' : country === 'CA' ? 'Canada' : country,
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    url: url || null,
    phone_number: p.phone_number || null,
    description: p.description || null,
    unit_type: 'Airstream',
    quantity_of_units: quantityOfUnits ?? null,
    property_total_sites: quantityOfUnits ?? null,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(String(process.argv[limitIdx + 1] || '').replace('--limit=', '') || '0', 10)
      : undefined;

  console.log(`Researching AIRSTREAM properties (min ${MIN_UNITS} units) in North America...\n`);
  console.log('Fetching existing properties for fuzzy dedup...');
  const existing = await getExistingProperties();
  console.log(`Loaded ${existing.length} existing records.\n`);

  const allNew: DiscoveredProperty[] = [];
  const queries = buildResearchQueries(limit);

  for (const query of queries) {
    console.log(`Researching: ${query.label}...`);
    await new Promise((r) => setTimeout(r, DELAY_MS));

    const discovered = await discoverProperties(query, limit);
    const filtered = discovered.filter((p) => !isDuplicateFuzzy(p, existing));

    console.log(`  Found ${discovered.length} properties (5+ units), ${filtered.length} new after fuzzy dedup.`);

    for (const p of filtered) {
      allNew.push(p);
      existing.push({
        property_name: p.property_name,
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        country: p.country || 'USA',
      });
    }
  }

  const seen = new Set<string>();
  const uniqueNew = allNew.filter((p) => {
    const key = `${normalizeForFuzzy(p.property_name)}|${normalizeForFuzzy(p.address || '')}|${normalizeForFuzzy(p.city || '')}|${normalizeForFuzzy(p.state || '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal unique new Airstream properties to add: ${uniqueNew.length}`);

  if (uniqueNew.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would insert:');
    uniqueNew.forEach((p, i) => {
      const units = p.quantity_of_units ?? p.property_total_sites ?? '?';
      console.log(`  ${i + 1}. ${p.property_name} (${p.city}, ${p.state}) - ${units} units - ${p.url || 'no url'}`);
    });
    return;
  }

  const rows = uniqueNew.map(toDbRow);
  const BATCH_SIZE = 20;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from(TABLE).insert(batch).select('id, property_name, state, quantity_of_units');

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length ?? 0} rows`);
  }

  console.log(`\nDone. Added ${uniqueNew.length} Airstream properties (min ${MIN_UNITS} units) with research_status='new'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
