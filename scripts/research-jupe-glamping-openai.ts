#!/usr/bin/env npx tsx
/**
 * Research USA properties with branded Jupe modular shelters.
 * Writes candidates to scripts/.tmp-jupe-review/openai-candidates.jsonl by default.
 * Does NOT auto-insert unless --insert is passed.
 *
 * Usage:
 *   npx tsx scripts/research-jupe-glamping-openai.ts --dry-run
 *   npx tsx scripts/research-jupe-glamping-openai.ts --limit 15
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
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-jupe-review');
const CANDIDATES_PATH = join(OUT_DIR, 'openai-candidates.jsonl');
const DISCOVERY_SOURCE = 'openai_research_jupe_us_2026_07_13';
const CANONICAL = normalizeGlampingUnitTypeForStorage('Jupe') ?? 'Jupe';

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
  return 1 - levenshtein(na, nb) / maxLen;
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
  const all: ExistingRecord[] = [];
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
    all.push(
      ...data.map((r) => ({
        property_name: (r.property_name || '').trim(),
        address: (r.address || '').trim(),
        city: (r.city || '').trim(),
        state: (r.state || '').trim(),
        country: (r.country || '').trim(),
      }))
    );
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
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
    : 'Return 8-15 properties.';

  const shared = `You are a researcher for an outdoor hospitality directory (Sage).

CRITICAL: Jupe is a **branded modular shelter** (aerospace-engineered tent/pod hybrid by Jupe / jupe.com) — not a generic A-frame or bell tent.
- unit_type must be "Jupe".
- Include ONLY properties that explicitly market Jupe / Jupe Tent / Jupes as lodging.
- Prefer commercial resorts, lodges, ranches, or campgrounds (not private single Airbnbs).
- USA only. country = "United States".
- Known examples already in directories (do NOT invent duplicates): Jupe Redwoods (Davenport CA), Flying Flags Avila Beach, CampV / Camp V (CO), Trout Creek Wilderness Lodge (OR).
- Prefer real official URLs (property site or jupe.com destination pages). Do not invent fake domains.

${limitClause}

For each property provide: property_name, city, state, address, zip_code, url, phone_number, description (2-4 sentences emphasizing Jupe product), property_type ("Glamping"), unit_type ("Jupe"), quantity_of_units, property_total_sites, lat, lon if known.

Return JSON object with "properties" array.`;

  return [
    {
      label: 'USA - West Jupe partners',
      prompt: `${shared}\nFocus on CA, OR, WA, CO, MT, UT, AZ, NM, TX.`,
    },
    {
      label: 'USA - Rest of country Jupe partners',
      prompt: `${shared}\nFocus on Mountain West, Midwest, South, Northeast, West Virginia, and any other USA partner sites.`,
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
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 3500,
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
        .map((p) => ({
          ...p,
          property_name: String(p.property_name).trim(),
          state: p.state ? toStateCode(String(p.state)) : undefined,
          country: 'United States',
          unit_type: CANONICAL,
          research_batch: query.label,
        }));
    } catch (err: unknown) {
      const isRateLimit =
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status?: number }).status === 429;
      if (isRateLimit && attempt < retries) {
        const waitMs = 10000 * attempt;
        console.log(`  Rate limited. Retrying in ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
  return [];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const doInsert = process.argv.includes('--insert');
  const limitIdx = process.argv.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(String(process.argv[limitIdx + 1] || '0'), 10)
      : undefined;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(CANDIDATES_PATH, '', 'utf-8');

  console.log(`Researching USA Jupe properties → ${TABLE}`);
  console.log(`Candidates: ${CANDIDATES_PATH}`);
  console.log(
    `Mode: ${dryRun ? 'DRY RUN' : doInsert ? 'INSERT' : 'CANDIDATES ONLY'}\n`
  );

  const existing = await getExistingProperties();
  console.log(`Loaded ${existing.length} existing records.\n`);

  const allNew: DiscoveredProperty[] = [];
  for (const query of buildResearchQueries(limit)) {
    console.log(`Researching: ${query.label}...`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
    const discovered = await discoverProperties(query);
    const filtered = discovered.filter((p) => !isDuplicateFuzzy(p, existing));
    console.log(
      `  Found ${discovered.length}, ${filtered.length} new after fuzzy dedup.`
    );
    for (const p of filtered) {
      allNew.push(p);
      existing.push({
        property_name: p.property_name,
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        country: 'United States',
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

  console.log(`\nTotal unique Jupe candidates: ${uniqueNew.length}`);
  for (const p of uniqueNew) {
    appendFileSync(CANDIDATES_PATH, JSON.stringify(p) + '\n', 'utf-8');
    console.log(
      `  ${p.property_name} (${p.city}, ${p.state}) qty=${p.quantity_of_units ?? '?'} ${p.url || 'no url'}`
    );
  }

  if (!doInsert || dryRun) {
    console.log(
      `\nWrote candidates. Review, then use scripts/insert-jupe-us-2026-07-13.ts.`
    );
    console.log(`Tag would be: ${DISCOVERY_SOURCE}`);
    return;
  }

  console.log('--insert not recommended for Jupe; use curated insert script.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
