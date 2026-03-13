#!/usr/bin/env npx tsx
/**
 * Glamping Resorts Research Pipeline: Tavily + Firecrawl -> GPT-4.1 -> Validation -> Supabase
 *
 * High-accuracy pipeline for discovering and enriching glamping properties (standalone units
 * with beds and linens). Uses multi-source Tavily search, Firecrawl deep scraping for
 * JS-rendered pricing/amenities, GPT-4.1 structured outputs with field-level confidence,
 * programmatic validation, and four-pass enrichment.
 *
 * Prerequisites:
 *   1. Run scripts/migrations/create-glamping-resorts-table.sql in Supabase first
 *   2. Set in .env.local: OPENAI_API_KEY, TAVILY_API_KEY, FIRECRAWL_API_KEY,
 *      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx scripts/research-glamping-resorts-openai.ts                    # Full pipeline
 *   npx tsx scripts/research-glamping-resorts-openai.ts --dry-run           # No DB writes
 *   npx tsx scripts/research-glamping-resorts-openai.ts --limit 5           # 5 per unit type
 *   npx tsx scripts/research-glamping-resorts-openai.ts --discover-only     # List only
 *   npx tsx scripts/research-glamping-resorts-openai.ts --enrich-only       # Re-enrich existing
 *   npx tsx scripts/research-glamping-resorts-openai.ts --no-web-search     # GPT-only
 *   npx tsx scripts/research-glamping-resorts-openai.ts --no-firecrawl      # Skip Firecrawl pass
 *   npx tsx scripts/research-glamping-resorts-openai.ts --unit-type domes   # Single unit type
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';
import FirecrawlApp from '@mendable/firecrawl-js';

config({ path: resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const tavilyApiKey = process.env.TAVILY_API_KEY;
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

if (!openaiApiKey) { console.error('❌ Missing OPENAI_API_KEY'); process.exit(1); }
if (!supabaseUrl || !secretKey) { console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const tavilyClient = tavilyApiKey ? tavily({ apiKey: tavilyApiKey }) : null;
const firecrawl = firecrawlApiKey ? new FirecrawlApp({ apiKey: firecrawlApiKey }) : null;

const TABLE = 'glamping_resorts';
const DEDUP_TABLE = 'all_glamping_properties';
const DELAY_MS = 2000;
const TAVILY_DELAY_MS = 600;
const FIRECRAWL_DELAY_MS = 1500;
const MAX_CONTENT_PER_RESULT = 10000;
const MAX_TOTAL_CONTENT = 40000;
const TODAY = new Date().toISOString();
const TODAY_DATE = TODAY.split('T')[0];
let gptModel = 'gpt-4.1';

interface GlampingRecord { [key: string]: string | number | null | undefined; }
interface ExtractionResult { property: Record<string, string | null>; confidence: Record<string, string>; }
interface ValidationResult { property: GlampingRecord; warnings: string[] }

// ── Unit types for discovery ──────────────────────────────────

const UNIT_TYPES = [
  'Dome', 'Cabin', 'Treehouse', 'Yurt', 'Safari Tent',
  'A-Frame', 'Tiny Home', 'Bell Tent', 'Tipi',
  'Container', 'Shepherds Hut', 'Airstream',
] as const;

const UNIT_TYPE_ALIASES: Record<string, string> = {
  domes: 'Dome', dome: 'Dome',
  cabins: 'Cabin', cabin: 'Cabin',
  treehouses: 'Treehouse', treehouse: 'Treehouse',
  yurts: 'Yurt', yurt: 'Yurt',
  'safari-tents': 'Safari Tent', 'safari-tent': 'Safari Tent', safari: 'Safari Tent',
  'a-frames': 'A-Frame', 'a-frame': 'A-Frame', aframe: 'A-Frame',
  'tiny-homes': 'Tiny Home', 'tiny-home': 'Tiny Home', tiny: 'Tiny Home',
  'bell-tents': 'Bell Tent', 'bell-tent': 'Bell Tent', bell: 'Bell Tent',
  tipis: 'Tipi', tipi: 'Tipi', teepee: 'Tipi', tepee: 'Tipi',
  containers: 'Container', container: 'Container',
  'shepherds-huts': 'Shepherds Hut', 'shepherds-hut': 'Shepherds Hut', shepherd: 'Shepherds Hut',
  airstreams: 'Airstream', airstream: 'Airstream',
};

// ── Field definitions ─────────────────────────────────────────

const STABLE_FIELDS = [
  'property_name', 'alternate_names', 'brand_or_chain', 'property_type',
  'ownership_type', 'management_company', 'description',
  'year_site_opened', 'operating_season_months',
  'address', 'city', 'state', 'zip_code', 'country', 'lat', 'lon',
  'nearest_airport_code', 'nearest_airport_miles', 'nearest_major_city', 'drive_time_from_nearest_city',
  'property_total_sites', 'quantity_of_units', 'number_of_locations',
  'unit_type', 'unit_capacity', 'unit_sq_ft', 'unit_description',
  'url', 'phone_number',
  'setting_ranch', 'setting_beach', 'setting_coastal', 'setting_suburban',
  'setting_forest', 'setting_field', 'setting_wetlands', 'setting_hot_spring',
  'setting_desert', 'setting_canyon', 'setting_waterfall', 'setting_swimming_hole',
  'setting_lake', 'setting_cave', 'setting_redwoods', 'setting_farm',
  'river_stream_or_creek', 'setting_mountainous',
  'activities_hiking', 'activities_fishing', 'activities_swimming',
  'activities_horseback_riding', 'activities_biking', 'activities_boating',
  'activities_paddling', 'activities_stargazing', 'activities_wildlife_watching',
  'activities_canoeing_kayaking', 'activities_climbing', 'activities_surfing',
  'activities_off_roading_ohv', 'activities_wind_sports', 'activities_snow_sports',
  'activities_whitewater_paddling', 'activities_fall_fun', 'activities_hunting',
  'activities_golf', 'activities_backpacking', 'activities_historic_sightseeing',
  'activities_scenic_drives',
] as const;

const DEEP_SCRAPE_FIELDS = [
  'unit_bed', 'unit_shower', 'unit_water', 'unit_electricity', 'unit_private_bathroom',
  'unit_full_kitchen', 'unit_kitchenette', 'unit_air_conditioning', 'unit_heating',
  'unit_wifi', 'unit_pets', 'unit_ada_accessibility',
  'unit_patio', 'unit_deck_or_porch', 'unit_outdoor_shower', 'unit_stargazing_feature',
  'unit_gas_fireplace', 'unit_hot_tub', 'unit_sauna', 'unit_hot_tub_or_sauna',
  'unit_wood_burning_stove', 'unit_private_fire_pit', 'unit_bbq_grill', 'unit_charcoal_grill',
  'unit_coffee_maker', 'unit_linens_provided', 'unit_towels_provided',
  'unit_mini_fridge', 'unit_bathtub', 'unit_tv', 'unit_outdoor_seating',
  'unit_cable', 'unit_campfires', 'unit_picnic_table',
  'booking_url', 'hipcamp_url', 'airbnb_url', 'glamping_hub_url',
  'check_in_time', 'check_out_time', 'check_in_type',
  'cancellation_policy', 'minimum_nights', 'max_group_size',
  'rate_avg_retail_daily_rate',
  'property_pool', 'property_hot_tub', 'property_sauna', 'property_spa',
  'property_restaurant', 'property_food_on_site', 'property_general_store',
  'property_yoga', 'property_event_space', 'property_wedding_venue',
  'property_farm_to_table', 'property_guided_tours',
  'property_bike_rental', 'property_kayak_canoe_rental',
  'property_nature_trails', 'property_communal_fire_pit', 'property_ev_charging',
  'property_laundry', 'property_playground', 'property_fitness_room',
  'property_waterfront', 'property_family_friendly', 'property_remote_work_friendly',
  'property_dog_park', 'property_clubhouse', 'property_alcohol_available',
  'property_extended_stay', 'property_has_rentals',
] as const;

const VOLATILE_FIELDS = [
  'rate_winter_weekday', 'rate_winter_weekend',
  'rate_spring_weekday', 'rate_spring_weekend',
  'rate_summer_weekday', 'rate_summer_weekend',
  'rate_fall_weekday', 'rate_fall_weekend',
  'rate_category', 'market_tier',
  'google_reviews_rating', 'google_reviews_count',
  'tripadvisor_rating', 'tripadvisor_review_count',
  'tripadvisor_url', 'booking_com_url', 'google_maps_url',
  'instagram_handle', 'facebook_url',
] as const;

const STABLE_CONFIDENCE_CATS = ['identity', 'location', 'units', 'settings_activities'] as const;
const DEEP_SCRAPE_CONFIDENCE_CATS = ['unit_amenities', 'property_amenities', 'booking'] as const;
const VOLATILE_CONFIDENCE_CATS = ['pricing', 'reviews'] as const;

const NUMERIC_FIELDS = new Set([
  'lat', 'lon', 'property_total_sites', 'quantity_of_units', 'year_site_opened',
  'number_of_locations', 'unit_sq_ft', 'quality_score', 'rate_avg_retail_daily_rate',
  'rate_winter_weekday', 'rate_winter_weekend', 'rate_spring_weekday', 'rate_spring_weekend',
  'rate_summer_weekday', 'rate_summer_weekend', 'rate_fall_weekday', 'rate_fall_weekend',
  'roverpass_occupancy_rate', 'roverpass_occupancy_year',
]);

const ALL_DB_KEYS = [
  ...STABLE_FIELDS, ...DEEP_SCRAPE_FIELDS, ...VOLATILE_FIELDS,
  'research_status', 'is_glamping_property', 'is_closed', 'slug',
  'source', 'discovery_source', 'date_added', 'date_updated', 'site_name',
  'data_source_url', 'data_confidence_score', 'enrichment_pass',
  'quality_score', 'roverpass_campground_id', 'roverpass_occupancy_rate', 'roverpass_occupancy_year',
  'amenities_raw', 'activities_raw', 'lifestyle_raw',
  'property_golf_cart_rental', 'property_waterpark', 'property_propane_refilling_station',
  'property_pickball_courts', 'property_age_restricted_55_plus', 'property_lgbtiq_friendly',
  'property_gasoline_nearby', 'property_basketball', 'property_volleyball',
  'property_jet_skiing', 'property_mobile_home_community', 'property_tennis',
  'rv_vehicle_length', 'rv_parking', 'rv_accommodates_slideout', 'rv_surface_type',
  'rv_surface_level', 'rv_vehicles_fifth_wheels', 'rv_vehicles_class_a_rvs',
  'rv_vehicles_class_b_rvs', 'rv_vehicles_class_c_rvs', 'rv_vehicles_toy_hauler',
  'rv_sewer_hook_up', 'rv_electrical_hook_up', 'rv_generators_allowed', 'rv_water_hookup',
  'raw_scraped_json',
];

// ── Schema builder ────────────────────────────────────────────

function nullable(): object { return { anyOf: [{ type: 'string' }, { type: 'null' }] }; }

function buildExtractionSchema(
  schemaName: string,
  fields: readonly string[],
  confidenceCats: readonly string[],
): object {
  const propDefs: Record<string, object> = {};
  for (const f of fields) {
    propDefs[f] = f === 'property_name' ? { type: 'string' } : nullable();
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
        property: {
          type: 'object' as const,
          properties: propDefs,
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
      required: ['property', 'confidence'],
      additionalProperties: false,
    },
  };
}

const STABLE_SCHEMA = buildExtractionSchema('glamping_stable_extraction', STABLE_FIELDS, STABLE_CONFIDENCE_CATS);
const DEEP_SCRAPE_SCHEMA = buildExtractionSchema('glamping_deep_scrape_extraction', DEEP_SCRAPE_FIELDS, DEEP_SCRAPE_CONFIDENCE_CATS);
const VOLATILE_SCHEMA = buildExtractionSchema('glamping_volatile_extraction', VOLATILE_FIELDS, VOLATILE_CONFIDENCE_CATS);

// ── Tavily multi-source search ────────────────────────────────

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

// ── Firecrawl deep scraper ────────────────────────────────────

async function firecrawlScrape(
  urls: string[],
): Promise<{ content: string; scrapedUrls: string[] }> {
  if (!firecrawl || !urls.length) return { content: '', scrapedUrls: [] };

  const parts: string[] = [];
  const scrapedUrls: string[] = [];
  let totalLen = 0;

  for (const url of urls) {
    if (!url || totalLen >= MAX_TOTAL_CONTENT) break;
    try {
      const result = await firecrawl.scrape(url, { formats: ['markdown'] }) as { markdown?: string; success?: boolean };
      const md = result.markdown || '';
      if (md) {
        const text = md.slice(0, MAX_CONTENT_PER_RESULT);
        parts.push(`[Source: ${url}]\n${text}`);
        scrapedUrls.push(url);
        totalLen += text.length;
      }
    } catch (err) {
      console.warn(`    ⚠ Firecrawl failed for ${url}: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise(r => setTimeout(r, FIRECRAWL_DELAY_MS));
  }

  return { content: parts.join('\n\n---\n\n'), scrapedUrls };
}

// ── GPT-4.1 structured extraction ─────────────────────────────

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
      const res = await openai.chat.completions.create(params as Parameters<typeof openai.chat.completions.create>[0]) as OpenAI.Chat.Completions.ChatCompletion;
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

async function extractStableData(content: string, propertyName: string): Promise<ExtractionResult | null> {
  if (!content) return null;
  const raw = await callGpt(
    [
      {
        role: 'system',
        content: `You extract structured glamping property data from web sources. Focus on STABLE, factual data: property identity, location, unit type/count, terrain setting, and available activities. Cross-reference multiple sources when available. Use null for anything not confirmed. Store all values as strings. For yes/no fields, use "Yes" or "No". For setting and activity fields, use "Yes" if confirmed present, null otherwise.`,
      },
      {
        role: 'user',
        content: `Extract stable data for the glamping property "${propertyName}" from the following web content.\n\n${content}`,
      },
    ],
    STABLE_SCHEMA,
    8000,
  );
  if (!raw) return null;
  try { return JSON.parse(raw) as ExtractionResult; } catch { return null; }
}

async function extractDeepScrapeData(content: string, propertyName: string): Promise<ExtractionResult | null> {
  if (!content) return null;
  const raw = await callGpt(
    [
      {
        role: 'system',
        content: `You extract structured glamping property data from rendered web pages. Focus on DETAILED unit amenities (bed type, kitchen, bathroom, heating, A/C, linens, towels, fire pit, hot tub, etc.), property-level amenities (pool, spa, restaurant, yoga, nature trails, etc.), booking details (booking URL, listing URLs on Hipcamp/Airbnb/Glamping Hub), guest experience (check-in/out times, minimum nights, cancellation policy), and nightly rate if visible. Use null for anything not confirmed. Store all values as strings. For yes/no amenities, use "Yes" or "No".`,
      },
      {
        role: 'user',
        content: `Extract detailed amenities, booking info, and guest experience data for "${propertyName}" from the following rendered web page content.\n\n${content}`,
      },
    ],
    DEEP_SCRAPE_SCHEMA,
    8000,
  );
  if (!raw) return null;
  try { return JSON.parse(raw) as ExtractionResult; } catch { return null; }
}

async function extractVolatileData(content: string, propertyName: string): Promise<ExtractionResult | null> {
  if (!content) return null;
  const raw = await callGpt(
    [
      {
        role: 'system',
        content: `You extract structured glamping property data from web sources. Focus on VOLATILE, frequently-changing data: seasonal nightly rates (winter/spring/summer/fall weekday/weekend in USD as numbers), rate category, market tier (luxury/premium/mid-range/budget), Google and TripAdvisor reviews/ratings, and social media handles. Use the most recent data available. Use null for anything not confirmed. Store all values as strings. For rates, use numeric strings without $ sign (e.g. "199" not "$199").`,
      },
      {
        role: 'user',
        content: `Extract current pricing, reviews, ratings, and social media info for "${propertyName}" from the following web content.\n\n${content}`,
      },
    ],
    VOLATILE_SCHEMA,
    4096,
  );
  if (!raw) return null;
  try { return JSON.parse(raw) as ExtractionResult; } catch { return null; }
}

// ── Validation layer ──────────────────────────────────────────

function parseNum(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function validateProperty(
  property: GlampingRecord,
  confidence: Record<string, string>,
): ValidationResult {
  const warnings: string[] = [];
  const p = { ...property };

  const rangeCheck = (field: string, min: number, max: number) => {
    const n = parseNum(p[field]);
    if (n !== null && (n < min || n > max)) {
      warnings.push(`${field}=${p[field]} outside range [${min}, ${max}] – nulled`);
      p[field] = null;
    }
  };

  rangeCheck('rate_avg_retail_daily_rate', 20, 2500);
  rangeCheck('rate_winter_weekday', 20, 2500);
  rangeCheck('rate_winter_weekend', 20, 2500);
  rangeCheck('rate_spring_weekday', 20, 2500);
  rangeCheck('rate_spring_weekend', 20, 2500);
  rangeCheck('rate_summer_weekday', 20, 2500);
  rangeCheck('rate_summer_weekend', 20, 2500);
  rangeCheck('rate_fall_weekday', 20, 2500);
  rangeCheck('rate_fall_weekend', 20, 2500);
  rangeCheck('quantity_of_units', 1, 500);
  rangeCheck('property_total_sites', 1, 1000);
  rangeCheck('unit_sq_ft', 50, 5000);
  rangeCheck('year_site_opened', 1900, 2030);

  const lat = parseNum(p.lat);
  const lon = parseNum(p.lon);
  if (lat !== null && (lat < 24 || lat > 72)) {
    warnings.push(`lat=${p.lat} outside USA/Canada bounds [24, 72] – nulled`);
    p.lat = null;
  }
  if (lon !== null && (lon < -170 || lon > -50)) {
    warnings.push(`lon=${p.lon} outside USA/Canada bounds [-170, -50] – nulled`);
    p.lon = null;
  }

  if (!p.property_name) warnings.push('CRITICAL: missing property_name');
  if (!p.state) warnings.push('missing state');
  if (!p.country) warnings.push('missing country');

  for (const [cat, level] of Object.entries(confidence)) {
    if (level === 'low') warnings.push(`low confidence: ${cat}`);
  }

  const highCount = Object.values(confidence).filter(v => v === 'high').length;
  const totalCats = Object.values(confidence).length;
  const hasLowCritical = confidence.units === 'low' || confidence.location === 'low';
  if (hasLowCritical) {
    p.data_confidence_score = 'low';
  } else if (totalCats > 0 && highCount >= totalCats * 0.6) {
    p.data_confidence_score = 'high';
  } else {
    p.data_confidence_score = 'medium';
  }

  return { property: p, warnings };
}

// ── Four-pass enrichment ──────────────────────────────────────

async function enrichProperty(
  property: GlampingRecord,
  useWebSearch: boolean,
  useFirecrawl: boolean,
): Promise<ValidationResult> {
  const name = String(property.property_name || '').trim();
  const state = String(property.state || '').trim();
  const website = String(property.url || '').trim();
  let allConfidence: Record<string, string> = {};
  let merged = { ...property };
  const allSourceUrls: string[] = [];

  if (!useWebSearch || !tavilyClient) {
    return { property: merged, warnings: ['no web search – using discovery data only'] };
  }

  // Pass 2: Stable data via Tavily
  console.log(`    Pass 2 (stable): identity, location, settings, activities...`);
  const stableQueries: SearchQuery[] = [
    { query: `"${name}" glamping`, domains: ['hipcamp.com'] },
    { query: `"${name}" glamping`, domains: ['glampinghub.com'] },
    { query: `"${name}" glamping ${state} accommodations units amenities` },
  ];
  if (website) {
    stableQueries.push({ query: `"${name}" glamping resort`, domains: [new URL(website).hostname] });
  }
  const { content: stableContent, sourceUrls: stableUrls } = await tavilyMultiSearch(stableQueries);
  allSourceUrls.push(...stableUrls);
  if (stableContent) {
    const stableResult = await extractStableData(stableContent, name);
    if (stableResult) {
      for (const [k, v] of Object.entries(stableResult.property)) {
        if (v !== null && v !== undefined) merged[k] = v;
      }
      Object.assign(allConfidence, stableResult.confidence);
    }
  }

  await new Promise(r => setTimeout(r, DELAY_MS));

  // Pass 3: Deep scrape via Firecrawl
  if (useFirecrawl && firecrawl) {
    console.log(`    Pass 3 (deep scrape): unit amenities, booking, pricing...`);
    const urlsToScrape: string[] = [];
    const propUrl = String(merged.url || '').trim();
    if (propUrl && propUrl.startsWith('http')) urlsToScrape.push(propUrl);
    const hipcampUrl = String(merged.hipcamp_url || '').trim();
    if (hipcampUrl && hipcampUrl.startsWith('http')) urlsToScrape.push(hipcampUrl);
    const glampingHubUrl = String(merged.glamping_hub_url || '').trim();
    if (glampingHubUrl && glampingHubUrl.startsWith('http')) urlsToScrape.push(glampingHubUrl);

    // Discover listing URLs from Tavily results if we don't have them yet
    if (!hipcampUrl) {
      const hipcampFound = allSourceUrls.find(u => u.includes('hipcamp.com'));
      if (hipcampFound) urlsToScrape.push(hipcampFound);
    }
    if (!glampingHubUrl) {
      const ghFound = allSourceUrls.find(u => u.includes('glampinghub.com'));
      if (ghFound) urlsToScrape.push(ghFound);
    }

    const uniqueUrls = Array.from(new Set(urlsToScrape)).slice(0, 3);
    if (uniqueUrls.length) {
      const { content: fcContent, scrapedUrls } = await firecrawlScrape(uniqueUrls);
      allSourceUrls.push(...scrapedUrls);
      if (fcContent) {
        const deepResult = await extractDeepScrapeData(fcContent, name);
        if (deepResult) {
          for (const [k, v] of Object.entries(deepResult.property)) {
            if (v !== null && v !== undefined) merged[k] = v;
          }
          Object.assign(allConfidence, deepResult.confidence);
        }
      }
    } else {
      console.log(`    ⚠ No URLs to deep-scrape for ${name}`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // Pass 4: Volatile data via Tavily
  console.log(`    Pass 4 (volatile): seasonal rates, reviews, social...`);
  const volatileQueries: SearchQuery[] = [
    { query: `"${name}" glamping nightly rate price per night 2025 2026 ${state}` },
    { query: `"${name}" glamping reviews rating ${state}` },
  ];
  const { content: volatileContent, sourceUrls: volatileUrls } = await tavilyMultiSearch(volatileQueries);
  allSourceUrls.push(...volatileUrls);
  if (volatileContent) {
    const volatileResult = await extractVolatileData(volatileContent, name);
    if (volatileResult) {
      for (const [k, v] of Object.entries(volatileResult.property)) {
        if (v !== null && v !== undefined) merged[k] = v;
      }
      Object.assign(allConfidence, volatileResult.confidence);
    }
  }

  const uniqueSources = Array.from(new Set(allSourceUrls));
  if (uniqueSources.length && !merged.data_source_url) {
    merged.data_source_url = uniqueSources[0];
  }

  const passCompleted = useFirecrawl && firecrawl ? 3 : 2;
  merged.enrichment_pass = passCompleted;

  const result = validateProperty(merged, allConfidence);
  if (result.warnings.length) {
    console.log(`    ⚠ Validation: ${result.warnings.join('; ')}`);
  }
  return result;
}

// ── Fuzzy dedup ───────────────────────────────────────────────

function normalizeForFuzzy(s: string): string {
  return (s || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
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

const NAME_SIM = 0.85;
const CITY_SIM = 0.9;
const STATE_SIM = 0.85;

interface ExistingRecord { property_name: string; city: string; state: string; country: string }

async function getExistingProperties(table: string): Promise<ExistingRecord[]> {
  const all: Array<{ property_name?: string | null; city?: string | null; state?: string | null; country?: string | null }> = [];
  const PAGE = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase.from(table).select('property_name, city, state, country').range(offset, offset + PAGE - 1);
    if (error) { console.warn(`    ⚠ Could not read ${table}: ${error.message}`); break; }
    if (!data?.length) break;
    all.push(...data);
    hasMore = data.length === PAGE;
    offset += PAGE;
  }
  return all.map(r => ({
    property_name: (r.property_name || '').trim(),
    city: (r.city || '').trim(),
    state: (r.state || '').trim(),
    country: (r.country || '').trim(),
  }));
}

function isDuplicate(
  p: { property_name?: string; city?: string; state?: string; country?: string },
  existing: ExistingRecord[],
): boolean {
  const pName = (p.property_name || '').trim();
  for (const e of existing) {
    if (similarity(pName, e.property_name) >= NAME_SIM) {
      const cityOk = !p.city || !e.city || similarity(p.city, e.city) >= CITY_SIM;
      const stateOk = !p.state || !e.state || similarity(p.state, e.state) >= STATE_SIM;
      if (cityOk && stateOk) return true;
    }
  }
  return false;
}

// ── Discovery ─────────────────────────────────────────────────

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
  quantity_of_units?: number | string;
  property_total_sites?: number | string;
  lat?: number | string;
  lon?: number | string;
  brand_or_chain?: string;
}

async function discoverProperties(
  unitType: string,
  country: 'USA' | 'Canada',
  limit: number,
  useWebSearch: boolean,
): Promise<DiscoveredProperty[]> {
  const limitClause = limit ? `Return exactly ${limit} properties.` : 'Return 15-25 properties.';

  let webContext = '';
  if (useWebSearch && tavilyClient) {
    console.log(`  🔍 Tavily: searching for ${unitType} glamping in ${country}...`);
    const { content } = await tavilyMultiSearch([
      { query: `${unitType} glamping resorts ${country} 2025 2026 best top` },
    ]);
    if (content) webContext = `\n\nCurrent web search results (use for accurate, up-to-date data):\n${content}`;
  }

  const prompt = `You are a glamping industry researcher. List glamping resorts/properties in ${country} that primarily offer ${unitType} accommodations.

Focus on properties where ${unitType} is a primary or significant offering — standalone units that provide beds and linens (not tent camping sites or RV pads).

Include only properties that:
- Offer standalone glamping units with beds and linens provided
- Are currently operating (not permanently closed)
- Have a professional/commercial operation (not individual Airbnb hosts renting a single unit)
- Have at least 4 ${unitType.toLowerCase()} units (minimum 4 glamping units; exclude tent campgrounds, RV parks, and hotels)
- Are glamping-focused: not a traditional campground, not an RV park, not a hotel

Include a mix of: well-known destinations, regional favorites, and newer boutique properties.

${limitClause}

For each property provide (use null for unknown):
property_name (required), city (required), state (required, 2-letter code for USA, province for Canada),
country ("USA" or "Canada"), address, zip_code, url (official website), phone_number,
description (2-4 sentences about the glamping experience), property_type (e.g. "Glamping Resort", "Eco Lodge"),
unit_type (specific: "${unitType}"), quantity_of_units, property_total_sites, lat, lon, brand_or_chain.

Store all values as strings.

Return a JSON object with a "properties" array.
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

  let parsed: { properties?: DiscoveredProperty[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return [];
  }

  return (Array.isArray(parsed.properties) ? parsed.properties : [])
    .filter((p) => p && typeof p.property_name === 'string' && String(p.property_name).trim())
    .map((p) => ({ ...p, country, unit_type: unitType }));
}

// ── DB helpers ────────────────────────────────────────────────

function toDbRow(r: GlampingRecord): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = {};
  const uniqueKeys = Array.from(new Set(ALL_DB_KEYS));
  for (const k of uniqueKeys) {
    const v = r[k];
    if (v === undefined || v === null) {
      row[k] = null;
      continue;
    }
    if (NUMERIC_FIELDS.has(k)) {
      const n = parseNum(v);
      row[k] = n;
    } else if (k === 'enrichment_pass') {
      const n = typeof v === 'number' ? v : parseInt(String(v), 10);
      row[k] = isNaN(n) ? 0 : n;
    } else {
      const s = String(v).trim();
      row[k] = s === '' ? null : s;
    }
  }
  row.country = row.country || 'USA';
  return row;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const discoverOnly = process.argv.includes('--discover-only');
  const enrichOnly = process.argv.includes('--enrich-only');
  const useWebSearch = !process.argv.includes('--no-web-search');
  const useFirecrawlFlag = !process.argv.includes('--no-firecrawl');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(String(process.argv[limitIdx + 1] || '0'), 10) || undefined : undefined;
  const unitTypeIdx = process.argv.indexOf('--unit-type');
  const unitTypeArg = unitTypeIdx >= 0 ? String(process.argv[unitTypeIdx + 1] || '').trim().toLowerCase() : null;

  const selectedTypes: string[] = unitTypeArg
    ? [UNIT_TYPE_ALIASES[unitTypeArg] || unitTypeArg]
    : [...UNIT_TYPES];

  console.log('🏕️  Glamping Resorts Research Pipeline\n');
  console.log(`   Model: ${gptModel}`);
  console.log(`   Tavily: ${tavilyClient ? '✓' : '✗ (set TAVILY_API_KEY)'}`);
  console.log(`   Firecrawl: ${firecrawl && useFirecrawlFlag ? '✓' : firecrawl ? '✗ (--no-firecrawl)' : '✗ (set FIRECRAWL_API_KEY)'}`);
  console.log(`   Pipeline: Tavily + Firecrawl → GPT structured output → Validation → Supabase`);
  console.log(`   Unit types: ${selectedTypes.join(', ')}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : discoverOnly ? 'DISCOVER ONLY' : enrichOnly ? 'ENRICH ONLY' : 'FULL PIPELINE'}\n`);

  if (!dryRun && !discoverOnly) {
    const { error: tableError } = await supabase.from(TABLE).select('id').limit(0);
    if (tableError) {
      if (tableError.code === 'PGRST116' || tableError.message?.includes('does not exist')) {
        console.error(`❌ Table "${TABLE}" does not exist. Run scripts/migrations/create-glamping-resorts-table.sql first.`);
        process.exit(1);
      }
      throw tableError;
    }
  }

  // ── Enrich-only mode ───
  if (enrichOnly) {
    const { data: existing } = await supabase.from(TABLE).select('*').limit(limit || 50);
    if (!existing?.length) { console.log('No existing properties to enrich.'); return; }
    console.log(`Re-enriching ${existing.length} existing properties...\n`);
    for (let i = 0; i < existing.length; i++) {
      const p = existing[i] as GlampingRecord;
      console.log(`  [${i + 1}/${existing.length}] ${p.property_name}`);
      const { property: enriched, warnings } = await enrichProperty(p, useWebSearch, useFirecrawlFlag);
      if (warnings.length) console.log(`    Warnings: ${warnings.length}`);
      if (!dryRun) {
        const row = toDbRow(enriched);
        row.last_scraped_at = TODAY;
        await supabase.from(TABLE).update(row).eq('id', (p as { id?: number }).id);
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
    console.log('\n✅ Enrichment complete.');
    return;
  }

  // ── Load existing records for dedup ───
  console.log('Loading existing records for fuzzy dedup...');
  const existingMain = await getExistingProperties(TABLE);
  const existingCurated = await getExistingProperties(DEDUP_TABLE);
  const allExisting = [...existingMain, ...existingCurated];
  console.log(`  ${existingMain.length} in ${TABLE}, ${existingCurated.length} in ${DEDUP_TABLE}\n`);

  // ── Discovery ───
  const allDiscovered: DiscoveredProperty[] = [];
  for (const unitType of selectedTypes) {
    for (const country of ['USA', 'Canada'] as const) {
      console.log(`📋 Discovering ${unitType} properties in ${country}...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
      const discovered = await discoverProperties(unitType, country, limit ?? 0, useWebSearch);

      const newOnly = discovered.filter(p => !isDuplicate(p, allExisting));
      console.log(`   Found ${discovered.length}, ${newOnly.length} new after dedup`);

      for (const p of newOnly) {
        allDiscovered.push(p);
        allExisting.push({
          property_name: p.property_name,
          city: p.city || '',
          state: p.state || '',
          country: p.country || 'USA',
        });
      }
    }
  }

  // Cross-dedup discoveries against each other
  const seen = new Set<string>();
  const uniqueDiscovered = allDiscovered.filter(p => {
    const key = `${normalizeForFuzzy(p.property_name)}|${normalizeForFuzzy(p.city || '')}|${normalizeForFuzzy(p.state || '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nTotal unique new properties to process: ${uniqueDiscovered.length}`);

  if (discoverOnly) {
    console.log('\n[DISCOVER ONLY] Would process:');
    uniqueDiscovered.forEach((p, i) => {
      const units = p.quantity_of_units ?? p.property_total_sites ?? '?';
      console.log(`  ${i + 1}. ${p.property_name} (${p.city}, ${p.state}) – ${p.unit_type} – ${units} units – ${p.url || 'no url'}`);
    });
    return;
  }

  // ── Enrich + validate ───
  const toInsert: GlampingRecord[] = [];
  for (let i = 0; i < uniqueDiscovered.length; i++) {
    const d = uniqueDiscovered[i];
    const baseRecord: GlampingRecord = {
      property_name: d.property_name,
      property_type: d.property_type || 'Glamping Resort',
      unit_type: d.unit_type || null,
      description: d.description || null,
      address: d.address || null,
      city: d.city || null,
      state: d.state || null,
      zip_code: d.zip_code || null,
      country: d.country || 'USA',
      lat: d.lat != null ? String(d.lat) : null,
      lon: d.lon != null ? String(d.lon) : null,
      url: d.url || null,
      phone_number: d.phone_number || null,
      quantity_of_units: d.quantity_of_units != null ? String(d.quantity_of_units) : null,
      property_total_sites: d.property_total_sites != null ? String(d.property_total_sites) : null,
      brand_or_chain: d.brand_or_chain || null,
      research_status: 'new',
      is_glamping_property: 'Yes',
      is_closed: 'No',
      source: 'Sage',
      discovery_source: `OpenAI Research - ${d.unit_type || 'Glamping'}`,
      date_added: TODAY_DATE,
      date_updated: TODAY_DATE,
    };

    console.log(`  🔬 [${i + 1}/${uniqueDiscovered.length}] Enriching: ${d.property_name} (${d.unit_type})`);
    const { property: enriched, warnings } = await enrichProperty(baseRecord, useWebSearch, useFirecrawlFlag);
    if (warnings.length) console.log(`    ✓ ${warnings.length} validation note(s)`);
    toInsert.push(enriched);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n📤 Inserting ${toInsert.length} new glamping properties...`);

  if (dryRun) {
    toInsert.forEach((p, i) => {
      const conf = p.data_confidence_score || '?';
      const rate = p.rate_avg_retail_daily_rate || '?';
      console.log(`  ${i + 1}. ${p.property_name} | ${p.unit_type} | ${p.quantity_of_units || '?'} units | $${rate}/night | confidence: ${conf}`);
    });
    return;
  }

  const BATCH_SIZE = 10;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE).map(p => ({
      ...toDbRow(p),
      last_scraped_at: TODAY,
    }));
    const { error } = await supabase.from(TABLE).insert(batch);
    if (error) { console.error('Insert error:', error); throw error; }
    inserted += batch.length;
    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows inserted`);
  }

  console.log(`\n✅ Done. Added ${inserted} glamping properties to ${TABLE}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
