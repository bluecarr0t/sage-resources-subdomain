#!/usr/bin/env npx tsx
/**
 * Research USA glamping properties with A-Frame unit type.
 * Writes candidates to scripts/.tmp-a-frame-review/openai-candidates.jsonl by default.
 * Does NOT auto-insert unless --insert is passed (prefer curated insert script).
 *
 * Usage:
 *   npx tsx scripts/research-a-frame-glamping-openai.ts --dry-run
 *   npx tsx scripts/research-a-frame-glamping-openai.ts --limit 20
 *   npx tsx scripts/research-a-frame-glamping-openai.ts --insert   # optional live insert as research_status=new
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY in .env.local');
  process.exit(1);
}
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = ALL_SAGE_DATA_TABLE;
const DELAY_MS = 2000;
const TODAY = new Date().toISOString().split('T')[0];
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-a-frame-review');
const CANDIDATES_PATH = join(OUT_DIR, 'openai-candidates.jsonl');
const DISCOVERY_SOURCE = 'openai_research_a_frame_us_2026_07_13';
const CANONICAL = normalizeGlampingUnitTypeForStorage('A-Frame') ?? 'A-Frame';

const NAME_SIMILARITY_THRESHOLD = 0.85;
const ADDRESS_SIMILARITY_THRESHOLD = 0.8;
const CITY_SIMILARITY_THRESHOLD = 0.9;
const STATE_SIMILARITY_THRESHOLD = 0.85;

const USA_STATE_CODE: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA',
  Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI',
  Wyoming: 'WY', 'District of Columbia': 'DC',
};

function slugifyPropertyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function toStateCode(s: string): string {
  const trimmed = (s || '').trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
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
  research_batch?: string;
}

interface ExistingRecord {
  property_name: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

async function getExistingProperties(): Promise<ExistingRecord[]> {
  const all: {
    property_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }[] = [];
  const PAGE = 1000;
  let offset = 0;

  while (true) {
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
    if (data.length < PAGE) break;
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

function isDuplicateFuzzy(
  p: DiscoveredProperty,
  existing: ExistingRecord[]
): boolean {
  const pName = (p.property_name || '').trim();
  const pAddr = (p.address || '').trim();
  const pCity = (p.city || '').trim();
  const pState = (p.state || '').trim();
  const pCountry = (p.country || 'United States').trim();

  for (const e of existing) {
    const nameSim = similarity(pName, e.property_name);
    if (nameSim >= NAME_SIMILARITY_THRESHOLD) {
      const cityMatch =
        !pCity || !e.city || similarity(pCity, e.city) >= CITY_SIMILARITY_THRESHOLD;
      const stateMatch =
        !pState ||
        !e.state ||
        similarity(pState, e.state) >= STATE_SIMILARITY_THRESHOLD;
      const countryMatch =
        !pCountry ||
        !e.country ||
        similarity(pCountry, e.country) >= 0.9;
      if (cityMatch && stateMatch && countryMatch) return true;
    }

    if (pAddr && e.address) {
      const addrSim = similarity(pAddr, e.address);
      if (addrSim >= ADDRESS_SIMILARITY_THRESHOLD) {
        const cityMatch =
          !pCity || !e.city || similarity(pCity, e.city) >= CITY_SIMILARITY_THRESHOLD;
        const stateMatch =
          !pState ||
          !e.state ||
          similarity(pState, e.state) >= STATE_SIMILARITY_THRESHOLD;
        if (cityMatch && stateMatch) return true;
      }
    }
  }
  return false;
}

type ResearchQuery = { label: string; prompt: string };

function buildResearchQueries(limit?: number): ResearchQuery[] {
  const limitClause = limit
    ? `Return exactly ${limit} properties.`
    : 'Return 12-20 properties.';

  const shared = `You are a researcher for an outdoor hospitality directory (Sage).

CRITICAL unit type rules:
- Include ONLY properties that offer hard-walled triangular A-Frame cabins (steep roof planes meeting at a ridge).
- unit_type must be "A-Frame" (canonical). Aliases: A Frame, A-Frames, aframe.
- Do NOT include A-frame shaped tents / "A-frame tents" unless they are solid hard-walled cabins.
- Prefer commercial glamping resorts, boutique cabin resorts, or hospitality properties (not private single Airbnb with no brand).
- USA only. country must be "United States".
- Include official website URL when known.
- quantity_of_units may be 1+ (small A-Frame properties are OK).

${limitClause}

For each property provide: property_name (required), city (required), state (required 2-letter or full name), address, zip_code, url (official website preferred), phone_number, description (2-4 sentences emphasizing the A-Frame product), property_type ("Glamping"), unit_type ("A-Frame"), quantity_of_units, property_total_sites, lat, lon if known.

Return a JSON object with a "properties" array.`;

  return [
    {
      label: 'USA - West / Mountain A-Frames',
      prompt: `${shared}

Focus on California, Oregon, Washington, Colorado, Utah, Montana, Idaho, Wyoming, New Mexico, Arizona.`,
    },
    {
      label: 'USA - Midwest / South A-Frames',
      prompt: `${shared}

Focus on Texas, Tennessee, North Carolina, South Carolina, Georgia, Kentucky, Ohio, Michigan, Wisconsin, Minnesota, Missouri, Arkansas.`,
    },
    {
      label: 'USA - Northeast / Mid-Atlantic A-Frames',
      prompt: `${shared}

Focus on New York, Pennsylvania, Vermont, New Hampshire, Maine, Massachusetts, Virginia, West Virginia.`,
    },
  ];
}

async function discoverProperties(
  query: ResearchQuery,
  retries = 3
): Promise<DiscoveredProperty[]> {
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
        .filter(
          (p) => p && typeof p.property_name === 'string' && p.property_name.trim()
        )
        .map((p) => {
          const state = p.state ? toStateCode(String(p.state)) : '';
          return {
            ...p,
            property_name: String(p.property_name).trim(),
            state: state || undefined,
            country: 'United States',
            unit_type: CANONICAL,
            research_batch: query.label,
          };
        });
    } catch (err: unknown) {
      const isRateLimit =
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status?: number }).status === 429;
      if (isRateLimit && attempt < retries) {
        const waitMs = 10000 * attempt;
        console.log(
          `  Rate limited. Retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})...`
        );
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

  const units = p.quantity_of_units ?? p.property_total_sites;
  const quantityOfUnits =
    typeof units === 'number'
      ? units
      : units != null
        ? parseInt(String(units), 10)
        : null;

  return {
    property_name: p.property_name,
    site_name: 'A-Frame',
    slug,
    property_type: p.property_type || 'Glamping',
    research_status: 'new',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    source: 'Sage',
    discovery_source: DISCOVERY_SOURCE,
    date_added: TODAY,
    date_updated: TODAY,
    address: p.address || null,
    city: p.city || null,
    state: p.state || null,
    zip_code: p.zip_code || null,
    country: 'United States',
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    url: url || null,
    phone_number: p.phone_number || null,
    description: p.description || null,
    unit_type: CANONICAL,
    quantity_of_units: quantityOfUnits != null && !Number.isNaN(quantityOfUnits)
      ? String(quantityOfUnits)
      : null,
    property_total_sites:
      quantityOfUnits != null && !Number.isNaN(quantityOfUnits)
        ? String(quantityOfUnits)
        : null,
    land_operator_category: 'private_commercial',
  };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const doInsert = process.argv.includes('--insert');
  const limitIdx = process.argv.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(
          String(process.argv[limitIdx + 1] || '').replace('--limit=', '') || '0',
          10
        )
      : undefined;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(CANDIDATES_PATH, '', 'utf-8');

  console.log(`Researching USA A-Frame properties → ${TABLE}`);
  console.log(`Candidates file: ${CANDIDATES_PATH}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no write)' : doInsert ? 'INSERT' : 'CANDIDATES ONLY'}\n`);

  console.log('Fetching existing properties for fuzzy dedup...');
  const existing = await getExistingProperties();
  console.log(`Loaded ${existing.length} existing records.\n`);

  const allNew: DiscoveredProperty[] = [];
  const queries = buildResearchQueries(limit);

  for (const query of queries) {
    console.log(`Researching: ${query.label}...`);
    await new Promise((r) => setTimeout(r, DELAY_MS));

    const discovered = await discoverProperties(query);
    const filtered = discovered.filter((p) => !isDuplicateFuzzy(p, existing));

    console.log(
      `  Found ${discovered.length} properties, ${filtered.length} new after fuzzy dedup.`
    );

    for (const p of filtered) {
      allNew.push(p);
      existing.push({
        property_name: p.property_name,
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        country: p.country || 'United States',
      });
    }
  }

  const seen = new Set<string>();
  const uniqueNew = allNew.filter((p) => {
    const key = `${normalizeForFuzzy(p.property_name)}|${normalizeForFuzzy(p.city || '')}|${normalizeForFuzzy(p.state || '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal unique new A-Frame candidates: ${uniqueNew.length}`);

  for (const p of uniqueNew) {
    appendFileSync(CANDIDATES_PATH, JSON.stringify(p) + '\n', 'utf-8');
  }

  if (uniqueNew.length === 0) {
    console.log('Nothing to write.');
    return;
  }

  uniqueNew.forEach((p, i) => {
    const units = p.quantity_of_units ?? p.property_total_sites ?? '?';
    console.log(
      `  ${i + 1}. ${p.property_name} (${p.city}, ${p.state}) - ${units} units - ${p.url || 'no url'}`
    );
  });

  if (dryRun || !doInsert) {
    console.log(
      `\nWrote ${uniqueNew.length} candidates to ${CANDIDATES_PATH}`
    );
    console.log(
      'Review candidates, then use scripts/insert-a-frame-us-2026-07-13.ts for curated inserts.'
    );
    return;
  }

  const rows = uniqueNew.map(toDbRow);
  const BATCH_SIZE = 20;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from(TABLE)
      .insert(batch)
      .select('id, property_name, state');
    if (error) {
      console.error('Insert error:', error);
      throw error;
    }
    console.log(
      `Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length ?? 0} rows`
    );
  }

  console.log(
    `\nDone. Inserted ${uniqueNew.length} A-Frame rows with research_status='new'.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
