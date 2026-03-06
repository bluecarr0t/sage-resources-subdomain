#!/usr/bin/env npx tsx
/**
 * Ski Resort Research Pipeline: Tavily -> GPT-4.1 -> Validation -> Supabase
 *
 * High-accuracy pipeline that uses multi-source Tavily web search with raw markdown
 * content, GPT-4.1 structured outputs with field-level confidence scoring,
 * programmatic validation, and two-pass enrichment (stable + volatile data).
 *
 * Prerequisites:
 *   1. Run scripts/migrations/create-ski-resorts-table.sql in Supabase first
 *   2. Set in .env.local: OPENAI_API_KEY, TAVILY_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx scripts/research-ski-resorts-openai.ts                    # Full pipeline
 *   npx tsx scripts/research-ski-resorts-openai.ts --dry-run           # No DB writes
 *   npx tsx scripts/research-ski-resorts-openai.ts --limit 50          # 50 resorts per country
 *   npx tsx scripts/research-ski-resorts-openai.ts --country USA       # USA only
 *   npx tsx scripts/research-ski-resorts-openai.ts --tier 1            # Major resorts first (default)
 *   npx tsx scripts/research-ski-resorts-openai.ts --tier 2            # Regional favorites
 *   npx tsx scripts/research-ski-resorts-openai.ts --tier 3            # Smaller boutique areas
 *   npx tsx scripts/research-ski-resorts-openai.ts --discover-only     # List resorts, no enrichment
 *   npx tsx scripts/research-ski-resorts-openai.ts --enrich-only       # Re-enrich existing rows
 *   npx tsx scripts/research-ski-resorts-openai.ts --no-web-search     # GPT-only (skip Tavily)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';

config({ path: resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!openaiApiKey) { console.error('❌ Missing OPENAI_API_KEY'); process.exit(1); }
if (!supabaseUrl || !secretKey) { console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const tavilyClient = tavilyApiKey ? tavily({ apiKey: tavilyApiKey }) : null;

const TABLE = 'ski_resorts';
const DELAY_MS = 2000;
const TAVILY_DELAY_MS = 600;
const MAX_CONTENT_PER_RESULT = 10000;
const MAX_TOTAL_CONTENT = 40000;
const TODAY = new Date().toISOString();
let gptModel = 'gpt-4.1';

interface SkiResortRecord { [key: string]: string | null | undefined; }
interface ExtractionResult { resort: Record<string, string | null>; confidence: Record<string, string>; }
interface ValidationResult { resort: SkiResortRecord; warnings: string[] }

// ── Field definitions ──────────────────────────────────────────

const STABLE_FIELDS = [
  'name', 'alternate_names', 'resort_type', 'parent_company', 'description', 'year_opened',
  'address', 'city', 'state_province', 'country', 'postal_code', 'region', 'lat', 'lon', 'timezone',
  'nearest_airport_code', 'nearest_airport_name', 'nearest_airport_miles', 'nearest_major_city', 'drive_time_from_nearest_city',
  'vertical_drop_ft', 'summit_elevation_ft', 'base_elevation_ft', 'total_skiable_acres', 'total_terrain_acres',
  'number_of_trails', 'trails_easy_count', 'trails_intermediate_count', 'trails_difficult_count',
  'trails_expert_count', 'trails_double_black_count',
  'longest_run_miles', 'longest_run_name', 'terrain_parks_count', 'halfpipe', 'tree_skiing', 'backcountry_access',
  'number_of_lifts', 'gondolas_count', 'chairlifts_count', 'high_speed_quads_count',
  'surface_lifts_count', 'tram_aerial_tramway', 'total_lift_capacity_per_hour',
  'average_annual_snowfall_inches', 'snowmaking_coverage_percent', 'snowmaking_coverage_acres',
  'website_url', 'wikipedia_url', 'on_the_snow_url',
  'notable_facts', 'tags',
] as const;

const VOLATILE_FIELDS = [
  'lift_ticket_price_adult', 'lift_ticket_price_child', 'lift_ticket_price_senior',
  'lift_ticket_price_range_low', 'lift_ticket_price_range_high',
  'season_pass_price', 'season_pass_name', 'rental_package_price',
  'lesson_price_full_day', 'parking_price', 'pricing_notes',
  'opening_date', 'closing_date', 'typical_season',
  'operating_hours_weekday', 'operating_hours_weekend',
  'night_skiing_available', 'night_skiing_hours', 'summer_operations',
  'lodging_on_mountain', 'restaurants_count', 'equipment_rental',
  'tubing', 'snowshoeing', 'snowmobiling', 'ice_skating',
  'ski_school_programs', 'childcare_available', 'adaptive_skiing',
  'fine_dining', 'casual_dining', 'on_mountain_dining', 'apres_ski_rating',
  'public_transit', 'shuttle_service',
  'phone', 'email', 'instagram_handle',
  'overall_rating', 'family_friendly_rating', 'value_rating',
] as const;

const STABLE_CONFIDENCE_CATS = ['identity', 'location', 'terrain', 'lifts', 'snow'] as const;
const VOLATILE_CONFIDENCE_CATS = ['pricing', 'season', 'amenities', 'ratings'] as const;

const ALL_DB_KEYS = [
  ...STABLE_FIELDS, ...VOLATILE_FIELDS,
  'data_source_url', 'data_confidence_score', 'street_address',
  'average_snowfall_inches', 'snowmaking_notes', 'lift_notes',
  'lesson_price_half_day', 'lesson_price_private', 'night_skiing_acres',
  'lodging_units_count', 'cafeterias_count', 'bars_apres_ski_count',
  'equipment_rental_locations', 'ski_valet', 'lockers', 'wifi', 'atms',
  'medical_clinic', 'daycare', 'spa', 'fitness_center', 'indoor_pool', 'sledding',
  'childcare_age_range', 'race_programs', 'quick_service',
  'parking_spaces', 'ev_charging', 'accessibility_ada',
  'facebook_url', 'twitter_handle', 'review_count',
  'on_the_snow_rating', 'terrain_rating', 'nightlife_rating',
  'ski_com_url', 'booking_com_url', 'images_json', 'raw_scraped_json',
];

// ── Schema builder ─────────────────────────────────────────────

function nullable(): object { return { anyOf: [{ type: 'string' }, { type: 'null' }] }; }

function buildExtractionSchema(
  schemaName: string,
  fields: readonly string[],
  confidenceCats: readonly string[],
): object {
  const resortProps: Record<string, object> = {};
  for (const f of fields) {
    resortProps[f] = f === 'name' ? { type: 'string' } : nullable();
  }
  const confProps: Record<string, object> = {};
  for (const c of confidenceCats) {
    confProps[c] = { type: 'string', enum: ['high', 'medium', 'low'] };
  }
  return {
    name: schemaName,
    strict: true,
    schema: {
      type: 'object' as const,
      properties: {
        resort: {
          type: 'object' as const,
          properties: resortProps,
          required: [...fields],
          additionalProperties: false,
        },
        confidence: {
          type: 'object' as const,
          properties: confProps,
          required: [...confidenceCats],
          additionalProperties: false,
        },
      },
      required: ['resort', 'confidence'],
      additionalProperties: false,
    },
  };
}

const STABLE_SCHEMA = buildExtractionSchema('stable_data_extraction', STABLE_FIELDS, STABLE_CONFIDENCE_CATS);
const VOLATILE_SCHEMA = buildExtractionSchema('volatile_data_extraction', VOLATILE_FIELDS, VOLATILE_CONFIDENCE_CATS);

// ── Tavily multi-source search ─────────────────────────────────

type SearchQuery = { query: string; domains?: string[] };

async function tavilyMultiSearch(
  queries: SearchQuery[],
): Promise<{ content: string; sourceUrls: string[] }> {
  if (!tavilyClient) return { content: '', sourceUrls: [] };

  const allResults: Array<{ content: string; url: string; score: number }> = [];

  for (const { query, domains } of queries) {
    try {
      const response = await tavilyClient.search(query, {
        searchDepth: 'advanced',
        maxResults: 3,
        includeAnswer: true,
        includeRawContent: 'markdown',
        ...(domains?.length ? { includeDomains: domains } : {}),
      });
      for (const r of response.results) {
        const text = (r.rawContent || r.content || '').slice(0, MAX_CONTENT_PER_RESULT);
        if (text) allResults.push({ content: text, url: r.url, score: r.score });
      }
    } catch (err) {
      console.warn(`    ⚠ Tavily query failed: "${query.slice(0, 60)}…" – ${err instanceof Error ? err.message : err}`);
    }
    await new Promise(r => setTimeout(r, TAVILY_DELAY_MS));
  }

  allResults.sort((a, b) => b.score - a.score);

  let totalLen = 0;
  const parts: string[] = [];
  const sourceUrls: string[] = [];
  for (const r of allResults) {
    if (totalLen + r.content.length > MAX_TOTAL_CONTENT) {
      const remaining = MAX_TOTAL_CONTENT - totalLen;
      if (remaining > 500) parts.push(`[Source: ${r.url}]\n${r.content.slice(0, remaining)}`);
      break;
    }
    parts.push(`[Source: ${r.url}]\n${r.content}`);
    sourceUrls.push(r.url);
    totalLen += r.content.length;
  }

  return { content: parts.join('\n\n---\n\n'), sourceUrls };
}

// ── GPT-4.1 structured extraction ──────────────────────────────

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 5000;

async function callGpt(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  schema: object,
  maxTokens: number = 4096,
): Promise<string | null> {
  const params = {
    model: gptModel,
    messages,
    temperature: 0.1,
    response_format: { type: 'json_schema' as const, json_schema: schema },
    max_tokens: maxTokens,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await openai.chat.completions.create(params as Parameters<typeof openai.chat.completions.create>[0]);
      return res.choices[0]?.message?.content?.trim() || null;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const code = (err as { code?: string }).code;
      const isRetryable = status === 500 || status === 502 || status === 503 || status === 429;
      if (gptModel !== 'gpt-4o' && (status === 404 || code === 'model_not_found')) {
        console.warn(`    ⚠ ${gptModel} not available, falling back to gpt-4o`);
        gptModel = 'gpt-4o';
        (params as { model: string }).model = gptModel;
        continue;
      }
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(`    ⚠ OpenAI ${status || code} – retrying in ${delay / 1000}s (${attempt}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  return null;
}

async function extractStableData(
  content: string,
  resortName: string,
): Promise<ExtractionResult | null> {
  if (!content) return null;
  const raw = await callGpt(
    [
      {
        role: 'system',
        content: `You extract structured ski resort data from web sources. Focus on STABLE, factual data: terrain stats, elevation, snowfall, lifts, location, and identity. Cross-reference multiple sources when available. Use null for anything not confirmed. Store all values as strings.`,
      },
      {
        role: 'user',
        content: `Extract stable data for "${resortName}" from the following web content.\n\n${content}`,
      },
    ],
    STABLE_SCHEMA,
    6000,
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractionResult;
  } catch { return null; }
}

async function extractVolatileData(
  content: string,
  resortName: string,
): Promise<ExtractionResult | null> {
  if (!content) return null;
  const raw = await callGpt(
    [
      {
        role: 'system',
        content: `You extract structured ski resort data from web sources. Focus on VOLATILE, frequently-changing data: lift ticket prices, operating hours, season dates, amenities, ratings, and contact info. Use the most recent data available. Use null for anything not confirmed. Store all values as strings.`,
      },
      {
        role: 'user',
        content: `Extract current pricing, hours, amenities, and ratings for "${resortName}" from the following web content.\n\n${content}`,
      },
    ],
    VOLATILE_SCHEMA,
    4096,
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractionResult;
  } catch { return null; }
}

// ── Validation layer ───────────────────────────────────────────

function parseNum(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = String(val).replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function validateResort(
  resort: SkiResortRecord,
  confidence: Record<string, string>,
): ValidationResult {
  const warnings: string[] = [];
  const r = { ...resort };

  const rangeCheck = (field: string, min: number, max: number) => {
    const n = parseNum(r[field]);
    if (n !== null && (n < min || n > max)) {
      warnings.push(`${field}=${r[field]} outside range [${min}, ${max}] – nulled`);
      r[field] = null;
    }
  };

  rangeCheck('vertical_drop_ft', 100, 5500);
  rangeCheck('summit_elevation_ft', 500, 15000);
  rangeCheck('base_elevation_ft', 0, 12000);
  rangeCheck('total_skiable_acres', 5, 9000);
  rangeCheck('number_of_trails', 1, 500);
  rangeCheck('number_of_lifts', 1, 60);
  rangeCheck('average_annual_snowfall_inches', 20, 750);
  rangeCheck('lift_ticket_price_adult', 10, 400);
  rangeCheck('lift_ticket_price_child', 0, 300);
  rangeCheck('lift_ticket_price_senior', 5, 350);
  rangeCheck('gondolas_count', 0, 15);
  rangeCheck('terrain_parks_count', 0, 20);

  const lat = parseNum(r.lat);
  const lon = parseNum(r.lon);
  if (lat !== null && (lat < 24 || lat > 72)) {
    warnings.push(`lat=${r.lat} outside USA/Canada bounds [24, 72] – nulled`);
    r.lat = null;
  }
  if (lon !== null && (lon < -170 || lon > -50)) {
    warnings.push(`lon=${r.lon} outside USA/Canada bounds [-170, -50] – nulled`);
    r.lon = null;
  }

  if (!r.name) warnings.push('CRITICAL: missing name');
  if (!r.state_province) warnings.push('missing state_province');
  if (!r.country) warnings.push('missing country');

  for (const [cat, level] of Object.entries(confidence)) {
    if (level === 'low') warnings.push(`low confidence: ${cat}`);
  }

  const highCount = Object.values(confidence).filter(v => v === 'high').length;
  const totalCats = Object.values(confidence).length;
  const hasLowCritical = confidence.terrain === 'low' || confidence.location === 'low';
  if (hasLowCritical) {
    r.data_confidence_score = 'low';
  } else if (highCount >= totalCats * 0.6) {
    r.data_confidence_score = 'high';
  } else {
    r.data_confidence_score = 'medium';
  }

  return { resort: r, warnings };
}

// ── Two-pass enrichment ────────────────────────────────────────

async function enrichResort(
  resort: SkiResortRecord,
  useWebSearch: boolean,
): Promise<ValidationResult> {
  const name = String(resort.name || '').trim();
  const state = String(resort.state_province || '').trim();
  const website = String(resort.website_url || '').trim();
  let allConfidence: Record<string, string> = {};
  let merged = { ...resort };

  if (!useWebSearch || !tavilyClient) {
    return { resort: merged, warnings: ['no web search – using discovery data only'] };
  }

  // Pass 1: Stable data (terrain, elevation, snowfall, location)
  console.log(`    Pass 1 (stable): terrain, snowfall, lifts...`);
  const stableQueries: SearchQuery[] = [
    { query: `"${name}" ski resort terrain elevation snowfall`, domains: ['onthesnow.com'] },
    { query: `"${name}" ski resort`, domains: ['en.wikipedia.org'] },
    { query: `"${name}" ski resort statistics`, domains: ['skiresort.info'] },
    { query: `"${name}" ski resort ${state} vertical drop trails lifts snowfall` },
  ];
  const { content: stableContent, sourceUrls: stableUrls } = await tavilyMultiSearch(stableQueries);
  if (stableContent) {
    const stableResult = await extractStableData(stableContent, name);
    if (stableResult) {
      for (const [k, v] of Object.entries(stableResult.resort)) {
        if (v !== null && v !== undefined) merged[k] = v;
      }
      Object.assign(allConfidence, stableResult.confidence);
    }
  }

  await new Promise(r => setTimeout(r, DELAY_MS));

  // Pass 2: Volatile data (pricing, hours, amenities, ratings)
  console.log(`    Pass 2 (volatile): pricing, hours, amenities...`);
  const volatileQueries: SearchQuery[] = [
    { query: `"${name}" ski resort lift ticket prices 2025 2026` },
    { query: `"${name}" ski resort ${state} operating hours season dates amenities ratings` },
  ];
  const { content: volatileContent, sourceUrls: volatileUrls } = await tavilyMultiSearch(volatileQueries);
  if (volatileContent) {
    const volatileResult = await extractVolatileData(volatileContent, name);
    if (volatileResult) {
      for (const [k, v] of Object.entries(volatileResult.resort)) {
        if (v !== null && v !== undefined) merged[k] = v;
      }
      Object.assign(allConfidence, volatileResult.confidence);
    }
  }

  const allSourceUrls = [...new Set([...stableUrls, ...volatileUrls])];
  if (allSourceUrls.length && !merged.data_source_url) {
    merged.data_source_url = allSourceUrls[0];
  }

  // Validate
  const result = validateResort(merged, allConfidence);
  if (result.warnings.length) {
    console.log(`    ⚠ Validation: ${result.warnings.join('; ')}`);
  }
  return result;
}

// ── Discovery ──────────────────────────────────────────────────

type DiscoveryTier = 1 | 2 | 3;

const TIER_PROMPTS: Record<DiscoveryTier, string> = {
  1: `PRIORITIZE MAJOR DESTINATION RESORTS FIRST. List the largest, premier ski resorts in the United States.
Focus on: Colorado (Vail, Aspen, Breckenridge, Keystone, Copper, Winter Park, Steamboat, etc.), Utah (Park City, Deer Valley, Snowbird, Alta, etc.), California (Mammoth, Heavenly, Northstar, Squaw Valley, etc.), and Vermont (Killington, Stowe, Sugarbush, Okemo, etc.).
These are the biggest resorts by vertical drop, skiable acres, and lift count. Exclude smaller regional hills.`,
  2: `PRIORITIZE REGIONAL FAVORITES. List well-known ski resorts that are significant but not the largest destination resorts.
Include: Wyoming (Jackson Hole), Idaho (Sun Valley, Schweitzer), Montana (Big Sky, Whitefish), New Mexico (Taos, Angel Fire), Washington, Oregon, New Hampshire, Maine, New York (Whiteface, Gore), Pennsylvania, Michigan, etc.
Skip the very smallest mom-and-pop hills.`,
  3: `PRIORITIZE SMALLER BOUTIQUE AREAS. List smaller ski areas, local favorites, and hidden gems.
Include: smaller independents, family-owned areas, and lesser-known resorts across all states.`,
};

async function discoverResorts(
  country: 'USA' | 'Canada',
  limit: number,
  useWebSearch: boolean,
  tier: DiscoveryTier = 1,
): Promise<SkiResortRecord[]> {
  const limitClause = limit ? `Return exactly ${limit} resorts.` : 'Return 20-30 resorts.';

  let webContext = '';
  if (useWebSearch && tavilyClient) {
    console.log('  🔍 Tavily: fetching current resort list...');
    const { content } = await tavilyMultiSearch([
      { query: `${country} ski resorts list 2024 2025 vertical drop snowfall lift ticket prices` },
    ]);
    if (content) webContext = `\n\nCurrent web search results (use for accurate, up-to-date data):\n${content}`;
  }

  const tierPrompt = country === 'USA' ? TIER_PROMPTS[tier] : `List notable ski resorts in Canada. Prioritize major destinations (Whistler, Banff/Lake Louise, Revelstoke, etc.) first, then regional favorites.`;

  const prompt = `You are a ski industry researcher. List ski resorts in ${country}.

${tierPrompt}

${limitClause}

Focus on resorts with reliable, verifiable stats and strong web presence.

Return a JSON object with a "resorts" array. Each resort must have (use null for unknown):
name (required), city, state_province, country ("USA" or "Canada"), website_url, lat, lon,
vertical_drop_ft, number_of_trails, average_annual_snowfall_inches, resort_type, parent_company,
region, description. Store numbers as strings.
${webContext}`;

  let raw: string | undefined;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: gptModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 8000,
      });
      raw = response.choices[0]?.message?.content?.trim();
      break;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const isRetryable = status === 500 || status === 502 || status === 503 || status === 429;
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(`  ⚠ Discovery API ${status} – retrying in ${delay / 1000}s (${attempt}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  if (!raw) return [];

  let parsed: { resorts?: SkiResortRecord[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return [];
  }

  return (Array.isArray(parsed.resorts) ? parsed.resorts : [])
    .filter((r) => r && typeof r.name === 'string' && String(r.name).trim())
    .map((r) => ({ ...r, country }));
}

// ── DB helpers ─────────────────────────────────────────────────

function toDbRow(r: SkiResortRecord): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  const uniqueKeys = [...new Set(ALL_DB_KEYS)];
  for (const k of uniqueKeys) {
    const v = r[k];
    if (v === undefined || v === null) {
      row[k] = null;
    } else {
      const s = String(v).trim();
      row[k] = s === '' ? null : s;
    }
  }
  row.country = row.country || 'USA';
  return row;
}

async function existingResort(name: string, _state: string, country: string): Promise<boolean> {
  const { data } = await supabase.from(TABLE).select('id').ilike('name', name).eq('country', country).limit(1);
  return (data?.length ?? 0) > 0;
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const discoverOnly = process.argv.includes('--discover-only');
  const enrichOnly = process.argv.includes('--enrich-only');
  const useWebSearch = !process.argv.includes('--no-web-search');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(String(process.argv[limitIdx + 1] || '0'), 10) || undefined : undefined;
  const countryIdx = process.argv.indexOf('--country');
  const countryFilter = countryIdx >= 0 ? (process.argv[countryIdx + 1] || '').toUpperCase() : null;
  const countries: ('USA' | 'Canada')[] =
    countryFilter === 'USA' ? ['USA'] : countryFilter === 'CANADA' ? ['Canada'] : ['USA', 'Canada'];
  const tierIdx = process.argv.indexOf('--tier');
  const tier = (tierIdx >= 0 ? parseInt(process.argv[tierIdx + 1] || '1', 10) : 1) as DiscoveryTier;
  const discoveryTier = tier >= 1 && tier <= 3 ? tier : 1;

  console.log('🏔️  Ski Resort Research Pipeline\n');
  console.log(`   Model: ${gptModel}  Tavily: ${tavilyClient ? '✓' : '✗ (set TAVILY_API_KEY)'}`);
  console.log(`   Pipeline: Tavily multi-search → GPT structured output → Validation → Supabase`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : discoverOnly ? 'DISCOVER ONLY' : enrichOnly ? 'ENRICH ONLY' : 'FULL PIPELINE'}`);
  if (!enrichOnly) console.log(`   Discovery tier: ${discoveryTier} (1=major, 2=regional, 3=smaller)\n`);

  if (!dryRun && !discoverOnly) {
    const { error: tableError } = await supabase.from(TABLE).select('id').limit(0);
    if (tableError) {
      if (tableError.code === 'PGRST116' || tableError.message?.includes('does not exist')) {
        console.error(`❌ Table "${TABLE}" does not exist. Run scripts/migrations/create-ski-resorts-table.sql first.`);
        process.exit(1);
      }
      throw tableError;
    }
  }

  // ── Enrich-only mode ───
  if (enrichOnly) {
    const { data: existing } = await supabase.from(TABLE).select('*').limit(limit || 50);
    if (!existing?.length) { console.log('No existing resorts to enrich.'); return; }
    console.log(`Re-enriching ${existing.length} existing resorts...\n`);
    for (let i = 0; i < existing.length; i++) {
      const r = existing[i] as SkiResortRecord;
      console.log(`  [${i + 1}/${existing.length}] ${r.name}`);
      const { resort: enriched, warnings } = await enrichResort(r, useWebSearch);
      if (warnings.length) console.log(`    Warnings: ${warnings.length}`);
      if (!dryRun) {
        await supabase.from(TABLE).update({ ...toDbRow(enriched), last_scraped_at: TODAY })
          .eq('id', (r as { id?: number }).id);
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
    console.log('\n✅ Enrichment complete.');
    return;
  }

  // ── Discovery ───
  const allResorts: SkiResortRecord[] = [];
  for (const country of countries) {
    console.log(`\n📋 Discovering ${country} ski resorts...`);
    await new Promise(r => setTimeout(r, DELAY_MS));
    const discovered = await discoverResorts(country, limit ?? 0, useWebSearch, discoveryTier);
    console.log(`   Found ${discovered.length} resorts`);
    allResorts.push(...discovered);
  }

  if (discoverOnly) {
    console.log('\n[DISCOVER ONLY] Would process:');
    allResorts.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} (${r.city}, ${r.state_province}, ${r.country}) – ${r.vertical_drop_ft || '?'}ft vert`);
    });
    return;
  }

  // ── Enrich + insert (one at a time so partial progress is saved) ───
  let inserted = 0;
  for (let i = 0; i < allResorts.length; i++) {
    const r = allResorts[i];
    const name = String(r.name || '').trim();
    const state = String(r.state_province || '').trim();
    const country = String(r.country || 'USA').trim();

    const exists = await existingResort(name, state, country);
    if (exists) { console.log(`  ⏭️  Skip (exists): ${name}`); continue; }

    console.log(`  🔬 [${i + 1}/${allResorts.length}] Enriching: ${name}`);
    const { resort: enriched, warnings } = await enrichResort(r, useWebSearch);
    if (warnings.length) console.log(`    ✓ ${warnings.length} validation note(s)`);

    if (dryRun) {
      const conf = enriched.data_confidence_score || '?';
      console.log(`    [DRY] Would insert: ${enriched.vertical_drop_ft || '?'}ft | ${enriched.average_annual_snowfall_inches || '?'}" snow | ${enriched.lift_ticket_price_adult || '?'} | confidence: ${conf}`);
    } else {
      const row = { ...toDbRow(enriched), last_scraped_at: TODAY };
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) {
        console.error(`    ❌ Insert failed: ${error.message}`);
      } else {
        inserted++;
        console.log(`    ✓ Inserted (${inserted} total)`);
      }
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n✅ Done. Added ${inserted} ski resorts to ${TABLE}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
