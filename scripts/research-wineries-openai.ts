#!/usr/bin/env npx tsx
/**
 * Winery Research Pipeline: Tavily -> GPT-4.1 -> Validation -> Supabase
 *
 * High-accuracy pipeline that uses multi-source Tavily web search with raw markdown
 * content, GPT-4.1 structured outputs with field-level confidence scoring,
 * programmatic validation, and two-pass enrichment (stable + volatile data).
 *
 * Prerequisites:
 *   1. Run scripts/migrations/create-wineries-table.sql in Supabase first
 *   2. Set in .env.local: OPENAI_API_KEY, TAVILY_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx scripts/research-wineries-openai.ts                    # Full pipeline
 *   npx tsx scripts/research-wineries-openai.ts --dry-run           # No DB writes
 *   npx tsx scripts/research-wineries-openai.ts --limit 50          # 50 wineries per country
 *   npx tsx scripts/research-wineries-openai.ts --country USA        # USA only
 *   npx tsx scripts/research-wineries-openai.ts --tier 1            # Major AVAs first (default)
 *   npx tsx scripts/research-wineries-openai.ts --tier 2            # Regional favorites
 *   npx tsx scripts/research-wineries-openai.ts --tier 3            # Smaller boutiques
 *   npx tsx scripts/research-wineries-openai.ts --discover-only     # List wineries, no enrichment
 *   npx tsx scripts/research-wineries-openai.ts --enrich-only       # Re-enrich existing rows
 *   npx tsx scripts/research-wineries-openai.ts --no-web-search     # GPT-only (skip Tavily)
 *   npx tsx scripts/research-wineries-openai.ts --no-firecrawl     # Skip Firecrawl pass (boutique tasting fees)
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

const TABLE = 'wineries';
const DELAY_MS = 2000;
const TAVILY_DELAY_MS = 600;
const FIRECRAWL_DELAY_MS = 1500;
const MAX_CONTENT_PER_RESULT = 10000;
const MAX_TOTAL_CONTENT = 40000;
const TODAY = new Date().toISOString();
let gptModel = 'gpt-4.1';

interface WineryRecord { [key: string]: string | null | undefined; }
interface ExtractionResult { resort: Record<string, string | null>; confidence: Record<string, string>; }
interface ValidationResult { resort: WineryRecord; warnings: string[] }

// ── Field definitions ──────────────────────────────────────────

const STABLE_FIELDS = [
  'name', 'alternate_names', 'winery_type', 'parent_company', 'description', 'year_founded',
  'address', 'city', 'state_province', 'country', 'postal_code', 'region', 'ava', 'sub_ava',
  'lat', 'lon', 'timezone', 'nearest_airport_code', 'nearest_airport_name', 'nearest_airport_miles',
  'nearest_major_city', 'drive_time_from_nearest_city',
  'acres_planted', 'annual_cases_produced', 'grape_varietals', 'wine_styles',
  'sustainable_certification', 'elevation_ft',
  'website_url', 'wikipedia_url', 'wineryguideusa_url', 'notable_facts', 'tags',
] as const;

const VOLATILE_FIELDS = [
  'tasting_room_available', 'tasting_hours', 'tasting_fee',
  'tasting_fee_range_low', 'tasting_fee_range_high', 'reservation_required',
  'tour_available', 'tour_fee', 'picnic_area', 'outdoor_seating', 'groups_welcome',
  'restaurant', 'lodging', 'event_space', 'wedding_venue',
  'wine_club', 'wine_club_membership_fee',
  'phone', 'email', 'instagram_handle', 'reservation_url',
  'overall_rating', 'review_count', 'google_reviews_rating', 'tripadvisor_rating',
  'wine_spectator_mentions', 'wine_enthusiast_mentions',
] as const;

const STABLE_CONFIDENCE_CATS = ['identity', 'location', 'production', 'varietals'] as const;
const VOLATILE_CONFIDENCE_CATS = ['tasting', 'amenities', 'ratings'] as const;

const ALL_DB_KEYS = [
  ...STABLE_FIELDS, ...VOLATILE_FIELDS,
  'acres_planted_raw',
  'data_source_url', 'data_confidence_score', 'street_address',
  'curb_side_pickup', 'shipping_available', 'dog_friendly', 'accessibility_ada',
  'facebook_url', 'twitter_handle', 'tripadvisor_review_count',
  'images_json', 'raw_scraped_json',
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

// ── Tavily multi-source search (with cache + rate limiting) ───────

type SearchQuery = { query: string; domains?: string[] };

const TAVILY_CACHE_MAX = 300;
const TAVILY_MIN_INTERVAL_MS = 800; // Rate limit: min ms between API calls
let tavilyCache = new Map<string, { content: string; sourceUrls: string[] }>();
let tavilyLastCallMs = 0;

function tavilyCacheKey(q: SearchQuery): string {
  return JSON.stringify({ query: q.query, domains: q.domains ?? [] });
}

async function tavilyMultiSearch(
  queries: SearchQuery[],
): Promise<{ content: string; sourceUrls: string[] }> {
  if (!tavilyClient) return { content: '', sourceUrls: [] };

  const allResults: Array<{ content: string; url: string; score: number }> = [];
  const uncachedQueries: SearchQuery[] = [];

  for (const q of queries) {
    const key = tavilyCacheKey(q);
    const cached = tavilyCache.get(key);
    if (cached) {
      for (const part of cached.content.split(/\n\n---\n\n/)) {
        const m = part.match(/\[Source: ([^\]]+)\]\n([\s\S]*)/);
        if (m && m[2]?.trim()) allResults.push({ content: m[2], url: m[1], score: 1 });
      }
      continue;
    }
    uncachedQueries.push(q);
  }

  for (const { query, domains } of uncachedQueries) {
    const key = tavilyCacheKey({ query, domains });
    const elapsed = Date.now() - tavilyLastCallMs;
    if (elapsed < TAVILY_MIN_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, TAVILY_MIN_INTERVAL_MS - elapsed));
    }
    try {
      tavilyLastCallMs = Date.now();
      const response = await tavilyClient.search(query, {
        searchDepth: 'advanced',
        maxResults: 3,
        includeAnswer: true,
        includeRawContent: 'markdown',
        ...(domains?.length ? { includeDomains: domains } : {}),
      });
      const urls: string[] = [];
      let content = '';
      for (const r of response.results) {
        const text = (r.rawContent || r.content || '').slice(0, MAX_CONTENT_PER_RESULT);
        if (text) {
          allResults.push({ content: text, url: r.url, score: r.score });
          content += (content ? '\n\n---\n\n' : '') + `[Source: ${r.url}]\n${text}`;
          urls.push(r.url);
        }
      }
      if (content) {
        if (tavilyCache.size >= TAVILY_CACHE_MAX) {
          const firstKey = tavilyCache.keys().next().value;
          if (firstKey) tavilyCache.delete(firstKey);
        }
        tavilyCache.set(key, { content, sourceUrls: urls });
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
  const seenUrls = new Set<string>();
  for (const r of allResults) {
    if (seenUrls.has(r.url)) continue;
    seenUrls.add(r.url);
    if (totalLen + r.content.length > MAX_TOTAL_CONTENT) {
      const remaining = MAX_TOTAL_CONTENT - totalLen;
      if (remaining > 500) {
        parts.push(`[Source: ${r.url}]\n${r.content.slice(0, remaining)}`);
        sourceUrls.push(r.url);
      }
      break;
    }
    parts.push(`[Source: ${r.url}]\n${r.content}`);
    sourceUrls.push(r.url);
    totalLen += r.content.length;
  }

  return { content: parts.join('\n\n---\n\n'), sourceUrls };
}

// ── URL validation (detect wrong winery URLs like cask23.com for Stag's Leap) ──

/** Extract domain from URL (e.g. https://www.stagsleap.com/ → stagsleap.com). */
function urlDomain(url: string): string {
  try {
    const u = url.replace(/^https?:\/\//i, '').split('/')[0] || '';
    return u.replace(/^www\./i, '').toLowerCase();
  } catch { return ''; }
}

/** Tokens from winery name for domain matching (e.g. "Stag's Leap" → ["stag", "leap"]). */
function wineryNameTokens(name: string): string[] {
  return String(name)
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/** True if URL domain likely belongs to this winery (contains name token). */
function isUrlLikelyWinery(url: string, wineryName: string): boolean {
  const domain = urlDomain(url);
  if (!domain || domain.length < 4) return false;
  const tokens = wineryNameTokens(wineryName);
  if (!tokens.length) return true;
  const domainNorm = domain.replace(/[^a-z0-9]/g, '');
  for (const t of tokens) {
    if (t.length >= 3 && domainNorm.includes(t)) return true;
  }
  return false;
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
  wineryName: string,
): Promise<ExtractionResult | null> {
  if (!content) return null;
  const raw = await callGpt(
    [
      {
        role: 'system',
        content: `You extract structured winery data from web sources. Focus on STABLE, factual data: identity, location, AVA, acreage, annual cases, grape varietals, wine styles, sustainable certifications, and history. Cross-reference multiple sources when available. Use null for anything not confirmed. Store all values as strings.`,
      },
      {
        role: 'user',
        content: `Extract stable data for "${wineryName}" from the following web content.\n\n${content}`,
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
  wineryName: string,
  options?: { fromWineryWebsite?: boolean },
): Promise<ExtractionResult | null> {
  if (!content) return null;
  const fromWebsite = options?.fromWineryWebsite ?? false;
  const systemPrompt = fromWebsite
    ? `You extract structured winery data from a winery's OWN website. PRIORITIZE tasting fees – this is critical.

For tasting_fee: Extract the exact fee text (e.g. "$50 per person", "$25–$75", "Complimentary with purchase", "Reservations from $40").
For tasting_fee_range_low and tasting_fee_range_high: Extract numeric values only when a range is given (e.g. "$25–$75" → low: "25", high: "75").
Look in: Visit/Experience pages, Tasting Room, Reservations, Book a Tasting, Wine Experiences. Fees are often in tables, bullet lists, or "from $X" text.
Use null only when no fee info is found. Store all values as strings.`
    : `You extract structured winery data from web sources. Focus on VOLATILE, frequently-changing data: tasting room hours, tasting fees, reservations, tours, amenities, ratings, and contact info.

PRIORITIZE tasting_fee, tasting_fee_range_low, tasting_fee_range_high – extract any fee mentioned (e.g. "$50 per person", "$25–$75", "Complimentary"). Use the most recent data available. Use null for anything not confirmed. Store all values as strings.`;
  const raw = await callGpt(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Extract current tasting info, hours, amenities, and ratings for "${wineryName}" from the following web content.\n\n${content}`,
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

/** Remove duplicate " AVA" (e.g. "North Coast AVA AVA" → "North Coast AVA"). */
function normalizeAva(val: string | null | undefined): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  return s.replace(/\s+AVA(\s+AVA)+/gi, ' AVA').trim();
}

/** Normalize acreage for display: strip parenthetical notes, keep number/range. */
function normalizeAcreageForDisplay(val: string | null | undefined): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  // Remove parentheticals and semicolon clauses (e.g. "(original vineyard); current estate acreage not specified")
  const stripped = s
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*;.*$/g, '')
    .trim();
  return stripped || s;
}

/** Extract numeric value for range validation; handles "160-200", "160–200", "160 to 200", "124 acres" */
function parseNumForRange(val: string | null | undefined): number | null {
  if (!val) return null;
  const s = String(val).replace(/[$,\s]/g, '');
  const match = s.match(/^(\d+(?:\.\d+)?)/);
  if (match) return parseFloat(match[1]);
  const alt = s.replace(/[^\d.-]/g, ' ').replace(/\s+/g, ' ').trim();
  const first = alt.split(/[-–—]/)[0];
  if (first) return parseFloat(first) || null;
  return null;
}

function validateWinery(
  winery: WineryRecord,
  confidence: Record<string, string>,
): ValidationResult {
  const warnings: string[] = [];
  const r = { ...winery };

  const rangeCheck = (field: string, min: number, max: number, parseFn: (v: string | null | undefined) => number | null = parseNum) => {
    const n = parseFn(r[field]);
    if (n !== null && (n < min || n > max)) {
      warnings.push(`${field}=${r[field]} outside range [${min}, ${max}] – nulled`);
      r[field] = null;
    }
  };

  rangeCheck('acres_planted', 0.5, 5000, parseNumForRange);
  rangeCheck('annual_cases_produced', 50, 5000000);
  rangeCheck('tasting_fee_range_low', 0, 500);
  rangeCheck('tasting_fee_range_high', 0, 500);
  rangeCheck('elevation_ft', 0, 12000);

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

  // Post-process AVA to remove duplicate "AVA" (e.g. "North Coast AVA AVA" → "North Coast AVA")
  if (r.ava) r.ava = normalizeAva(r.ava) ?? r.ava;
  if (r.sub_ava) r.sub_ava = normalizeAva(r.sub_ava) ?? r.sub_ava;

  // Normalize acreage for display; keep raw for reprocessing
  if (r.acres_planted) {
    r.acres_planted_raw = r.acres_planted;
    r.acres_planted = normalizeAcreageForDisplay(r.acres_planted) ?? r.acres_planted;
  }

  for (const [cat, level] of Object.entries(confidence)) {
    if (level === 'low' && cat !== 'ratings') warnings.push(`low confidence: ${cat}`);
  }

  const highCount = Object.values(confidence).filter(v => v === 'high').length;
  const totalCats = Object.values(confidence).length;
  const hasLowCritical = confidence.location === 'low' || confidence.production === 'low';
  if (hasLowCritical) {
    r.data_confidence_score = 'low';
  } else if (highCount >= totalCats * 0.6) {
    r.data_confidence_score = 'high';
  } else {
    r.data_confidence_score = 'medium';
  }

  return { resort: r, warnings };
}

// ── Enrichment (Tavily + optional Firecrawl) ────────────────────

async function enrichWinery(
  winery: WineryRecord,
  useWebSearch: boolean,
  useFirecrawl: boolean = true,
): Promise<ValidationResult> {
  const name = String(winery.name || '').trim();
  const state = String(winery.state_province || '').trim();
  let allConfidence: Record<string, string> = {};
  let merged = { ...winery };

  if (!useWebSearch || !tavilyClient) {
    return { resort: merged, warnings: ['no web search – using discovery data only'] };
  }

  // Pass 1: Stable data (identity, AVA, varietals, acreage, production)
  console.log(`    Pass 1 (stable): identity, AVA, varietals, acreage...`);
  const stableQueries: SearchQuery[] = [
    { query: `"${name}" winery ${state}` },
    { query: `"${name}" winery`, domains: ['en.wikipedia.org'] },
    { query: `"${name}" winery`, domains: ['wineenthusiast.com'] },
    { query: `"${name}" winery`, domains: ['winespectator.com'] },
    { query: `"${name}" winery AVA varietals`, domains: ['wineryguideusa.com'] },
    { query: `"${name}" winery AVA varietals`, domains: ['allamericanwineries.com'] },
    { query: `"${name}" winery ${state} acreage cases varietals` },
    { query: `"${name}" winery vineyard acreage hectares estate size` },
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

  // Pass 2: Volatile data (tasting fees, hours, reservations, ratings)
  console.log(`    Pass 2 (volatile): tasting fees, hours, reservations...`);
  const volatileQueries: SearchQuery[] = [
    { query: `"${name}" winery tasting room hours 2025 2026` },
    { query: `"${name}" winery ${state} tasting fee reservation` },
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

  let allSourceUrls = [...new Set([...stableUrls, ...volatileUrls])];

  // Pass 3: Firecrawl website when tasting fee missing (boutique wineries like RAEN)
  const needsTastingFee = !merged.tasting_fee?.trim() && !merged.tasting_fee_range_low?.trim();
  let websiteUrl = String(merged.website_url || '').trim();
  // Fallback: if missing website_url but need tasting fee, run Tavily to find winery site
  if (useFirecrawl && firecrawl && needsTastingFee && !websiteUrl && tavilyClient) {
    const { sourceUrls } = await tavilyMultiSearch([
      { query: `"${name}" winery ${state} official website` },
    ]);
    const skip = /wikipedia|yelp|tripadvisor|facebook|instagram|twitter|linkedin|pinterest/i;
    const found = sourceUrls.find((u) => !skip.test(u));
    if (found) {
      merged.website_url = found;
      websiteUrl = found;
      console.log(`    Found website_url via Tavily: ${found}`);
    }
    await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));
  }
  if (useFirecrawl && firecrawl && needsTastingFee && websiteUrl) {
    let urlToScrape = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    // Validate: skip obviously wrong URLs (e.g. cask23.com for Stag's Leap)
    if (!isUrlLikelyWinery(urlToScrape, name) && tavilyClient) {
      console.log(`    URL ${urlDomain(urlToScrape)} doesn't match winery – searching for correct site...`);
      const { sourceUrls } = await tavilyMultiSearch([
        { query: `"${name}" winery ${state} official website` },
      ]);
      const skip = /wikipedia|yelp|tripadvisor|facebook|instagram|twitter|linkedin|pinterest/i;
      const found = sourceUrls.find((u) => !skip.test(u) && isUrlLikelyWinery(u, name));
      if (found) {
        urlToScrape = found.startsWith('http') ? found : `https://${found}`;
        merged.website_url = found;
        console.log(`    Found better URL: ${found}`);
      }
      await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));
    }
    try {
      console.log(`    Pass 3 (Firecrawl): scraping website for tasting info...`);
      const { content: fcContent, scrapedUrls } = await firecrawlScrape([urlToScrape]);
      if (!fcContent && tavilyClient) {
        // Firecrawl failed (DNS, 404) – try Tavily for a different URL
        console.log(`    Firecrawl failed – searching for alternate URL...`);
        const { sourceUrls } = await tavilyMultiSearch([
          { query: `"${name}" winery ${state} tasting room website` },
        ]);
        const skip = /wikipedia|yelp|tripadvisor|facebook|instagram|twitter|linkedin|pinterest/i;
        const alt = sourceUrls.find((u) => !skip.test(u) && isUrlLikelyWinery(u, name))
          ?? sourceUrls.find((u) => !skip.test(u) && u !== urlToScrape);
        if (alt) {
          const altUrl = alt.startsWith('http') ? alt : `https://${alt}`;
          const { content: altContent, scrapedUrls: altUrls } = await firecrawlScrape([altUrl]);
          if (altContent) {
            allSourceUrls = [...new Set([...allSourceUrls, ...altUrls])];
            const volatileResult = await extractVolatileData(altContent, name, { fromWineryWebsite: true });
            if (volatileResult) {
              for (const [k, v] of Object.entries(volatileResult.resort)) {
                if (v !== null && v !== undefined) merged[k] = v;
              }
              Object.assign(allConfidence, volatileResult.confidence);
            }
          }
        }
      } else {
        allSourceUrls = [...new Set([...allSourceUrls, ...scrapedUrls])];
        if (fcContent) {
          const volatileResult = await extractVolatileData(fcContent, name, { fromWineryWebsite: true });
          if (volatileResult) {
            for (const [k, v] of Object.entries(volatileResult.resort)) {
              if (v !== null && v !== undefined) merged[k] = v;
            }
            Object.assign(allConfidence, volatileResult.confidence);
          }
        }
      }
    } catch {
      // Firecrawl optional – continue without
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  if (allSourceUrls.length && !merged.data_source_url) {
    merged.data_source_url = allSourceUrls[0];
  }

  // Validate
  const result = validateWinery(merged, allConfidence);
  if (result.warnings.length) {
    console.log(`    ⚠ Validation: ${result.warnings.join('; ')}`);
  }
  return result;
}

// ── Discovery ──────────────────────────────────────────────────

type DiscoveryTier = 1 | 2 | 3;

const TIER_PROMPTS: Record<DiscoveryTier, string> = {
  1: `PRIORITIZE MAJOR AVAS AND DESTINATION WINERIES FIRST. List the most notable wineries in the United States.
Focus on: Napa Valley (Robert Mondavi, Caymus, Opus One, Stag's Leap, etc.), Sonoma (Kendall-Jackson, Ferrari-Carano, etc.), Paso Robles, Willamette Valley (Oregon), Finger Lakes (NY), Walla Walla (WA), and other major wine regions.
These are established, well-known wineries with strong web presence.`,
  2: `PRIORITIZE REGIONAL FAVORITES. List well-known wineries that are significant but not the largest destination wineries.
Include: Temecula, Santa Barbara, Livermore, Texas Hill Country, Virginia, Michigan, New Mexico, Idaho, British Columbia (Canada), etc.
Skip the very smallest micro-wineries.`,
  3: `PRIORITIZE SMALLER BOUTIQUES. List smaller wineries, local favorites, and emerging regions.
Include: boutique producers, family-owned wineries, and hidden gems across all wine-producing states.`,
};

async function discoverWineries(
  country: 'USA' | 'Canada',
  limit: number,
  useWebSearch: boolean,
  tier: DiscoveryTier = 1,
): Promise<WineryRecord[]> {
  const limitClause = limit ? `Return exactly ${limit} wineries.` : 'Return 20-30 wineries.';

  let webContext = '';
  if (useWebSearch && tavilyClient) {
    console.log('  🔍 Tavily: fetching current winery list...');
    const { content } = await tavilyMultiSearch([
      { query: `${country} wineries list 2024 2025 best AVA tasting room` },
    ]);
    if (content) webContext = `\n\nCurrent web search results (use for accurate, up-to-date data):\n${content}`;
  }

  const tierPrompt = country === 'USA' ? TIER_PROMPTS[tier] : `List notable wineries in Canada. Prioritize British Columbia (Okanagan, etc.) and Ontario, then regional favorites.`;

  const prompt = `You are a wine industry researcher. List wineries in ${country}.

${tierPrompt}

${limitClause}

Focus on wineries with reliable, verifiable data and strong web presence. Include wineries with tasting rooms when possible.

Return a JSON object with a "wineries" array. Each winery must have (use null for unknown):
name (required), city, state_province, country ("USA" or "Canada"), website_url (REQUIRED – official winery site for Firecrawl), lat, lon,
ava, region, grape_varietals, acres_planted, annual_cases_produced, winery_type, parent_company,
year_founded, description. Store numbers as strings.
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

  let parsed: { wineries?: WineryRecord[]; resorts?: WineryRecord[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return [];
  }

  const arr = parsed.wineries ?? parsed.resorts ?? [];
  return (Array.isArray(arr) ? arr : [])
    .filter((r) => r && typeof r.name === 'string' && String(r.name).trim())
    .map((r) => ({ ...r, country }));
}

// ── DB helpers ─────────────────────────────────────────────────

function toDbRow(r: WineryRecord): Record<string, string | null> {
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

async function existingWinery(name: string, _state: string, country: string): Promise<boolean> {
  const { data } = await supabase.from(TABLE).select('id').ilike('name', name).eq('country', country).limit(1);
  return (data?.length ?? 0) > 0;
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const discoverOnly = process.argv.includes('--discover-only');
  const enrichOnly = process.argv.includes('--enrich-only');
  const useWebSearch = !process.argv.includes('--no-web-search');
  const useFirecrawl = !process.argv.includes('--no-firecrawl');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(String(process.argv[limitIdx + 1] || '0'), 10) || undefined : undefined;
  const countryIdx = process.argv.indexOf('--country');
  const countryFilter = countryIdx >= 0 ? (process.argv[countryIdx + 1] || '').toUpperCase() : null;
  const countries: ('USA' | 'Canada')[] =
    countryFilter === 'USA' ? ['USA'] : countryFilter === 'CANADA' ? ['Canada'] : ['USA', 'Canada'];
  const tierIdx = process.argv.indexOf('--tier');
  const tier = (tierIdx >= 0 ? parseInt(process.argv[tierIdx + 1] || '1', 10) : 1) as DiscoveryTier;
  const discoveryTier = tier >= 1 && tier <= 3 ? tier : 1;

  console.log('🍷  Winery Research Pipeline\n');
  console.log(`   Model: ${gptModel}  Tavily: ${tavilyClient ? '✓' : '✗ (set TAVILY_API_KEY)'}  Firecrawl: ${firecrawl && useFirecrawl ? '✓' : firecrawl ? '✗ (--no-firecrawl)' : '✗ (set FIRECRAWL_API_KEY)'}`);
  console.log(`   Pipeline: Tavily multi-search → GPT structured output → Validation → Supabase`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : discoverOnly ? 'DISCOVER ONLY' : enrichOnly ? 'ENRICH ONLY' : 'FULL PIPELINE'}`);
  if (!enrichOnly) console.log(`   Discovery tier: ${discoveryTier} (1=major AVAs, 2=regional, 3=smaller)\n`);

  if (!dryRun && !discoverOnly) {
    const { error: tableError } = await supabase.from(TABLE).select('id').limit(0);
    if (tableError) {
      if (tableError.code === 'PGRST116' || tableError.message?.includes('does not exist')) {
        console.error(`❌ Table "${TABLE}" does not exist. Run scripts/migrations/create-wineries-table.sql first.`);
        process.exit(1);
      }
      throw tableError;
    }
  }

  // ── Enrich-only mode ───
  if (enrichOnly) {
    const { data: existing } = await supabase.from(TABLE).select('*').limit(limit || 50);
    if (!existing?.length) { console.log('No existing wineries to enrich.'); return; }
    console.log(`Re-enriching ${existing.length} existing wineries...\n`);
    for (let i = 0; i < existing.length; i++) {
      const r = existing[i] as WineryRecord;
      console.log(`  [${i + 1}/${existing.length}] ${r.name}`);
      const { resort: enriched, warnings } = await enrichWinery(r, useWebSearch, useFirecrawl);
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
  const allWineries: WineryRecord[] = [];
  for (const country of countries) {
    console.log(`\n📋 Discovering ${country} wineries...`);
    await new Promise(r => setTimeout(r, DELAY_MS));
    const discovered = await discoverWineries(country, limit ?? 0, useWebSearch, discoveryTier);
    console.log(`   Found ${discovered.length} wineries`);
    allWineries.push(...discovered);
  }

  if (discoverOnly) {
    console.log('\n[DISCOVER ONLY] Would process:');
    allWineries.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} (${r.city}, ${r.state_province}, ${r.country}) – ${r.ava || r.region || '?'}`);
    });
    return;
  }

  // ── Enrich + insert (one at a time so partial progress is saved) ───
  let inserted = 0;
  for (let i = 0; i < allWineries.length; i++) {
    const r = allWineries[i];
    const name = String(r.name || '').trim();
    const state = String(r.state_province || '').trim();
    const country = String(r.country || 'USA').trim();

    const exists = await existingWinery(name, state, country);
    if (exists) { console.log(`  ⏭️  Skip (exists): ${name}`); continue; }

    console.log(`  🔬 [${i + 1}/${allWineries.length}] Enriching: ${name}`);
    const { resort: enriched, warnings } = await enrichWinery(r, useWebSearch, useFirecrawl);
    if (warnings.length) console.log(`    ✓ ${warnings.length} validation note(s)`);

    if (dryRun) {
      const conf = enriched.data_confidence_score || '?';
      console.log(`    [DRY] Would insert: ${enriched.ava || '?'} | ${enriched.acres_planted || '?'} acres | ${enriched.tasting_fee || '?'} tasting | confidence: ${conf}`);
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

  console.log(`\n✅ Done. Added ${inserted} wineries to ${TABLE}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
