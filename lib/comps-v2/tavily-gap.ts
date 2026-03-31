/**
 * Tavily search for comps-v2 gap fill (additional properties not in DB).
 */

import { tavily } from '@tavily/core';
import type { ComparableProperty, SeasonalRates } from '@/lib/ai-report-builder/types';
import type { CompsV2PropertyKind, QualityTier } from '@/lib/comps-v2/types';
import type { TavilyGapStats } from '@/lib/comps-v2/web-research-diagnostics';
import { compsV2WebVsMarketDedupeKey } from '@/lib/comps-v2/candidate-dedupe-keys';
import {
  parseTavilyMaxQueries,
  parseTavilyResultsPerQuery,
} from '@/lib/comps-v2/parse-body';
import { isLikelyTransientNetworkError, sleepBackoffMs } from '@/lib/comps-v2/retry-transient';

const TAVILY_DELAY_MS = 500;
const TAVILY_QUERY_MAX_ATTEMPTS = 3;
const TAVILY_RETRY_BASE_MS = 450;
const DEFAULT_MAX_GAP_COMPS = 12;
/** Hard ceiling on distinct query strings (UI may request fewer via `maxQueries`). */
const MAX_DISTINCT_QUERIES = 10;

function resolvedMaxGapComps(override?: number): number {
  const envN = Number(process.env.COMPS_V2_MAX_GAP_COMPS);
  const fromEnv = Number.isFinite(envN) ? Math.floor(envN) : DEFAULT_MAX_GAP_COMPS;
  const cap = Math.min(40, Math.max(4, fromEnv));
  if (override != null && Number.isFinite(override)) {
    return Math.min(40, Math.max(4, Math.floor(override)));
  }
  return cap;
}

const EMPTY_SEASONAL: SeasonalRates = {
  winter_weekday: null,
  winter_weekend: null,
  spring_weekday: null,
  spring_weekend: null,
  summer_weekday: null,
  summer_weekend: null,
  fall_weekday: null,
  fall_weekend: null,
};

/** Maps UI quality tiers to Tavily-oriented rate/positioning language (ADR heuristic alignment). */
const TIER_SEARCH_KEYWORDS: Record<QualityTier, string> = {
  budget: 'budget affordable nightly rates under $100',
  economy: 'economy mid-range nightly rates',
  mid: 'mid-range nightly rates',
  upscale: 'upscale premium boutique nightly rates',
  luxury: 'luxury high-end exclusive resort rates',
};

/**
 * Builds distance context for web search queries (matches comps radius filter intent).
 */
export function radiusSearchContext(
  city: string,
  stateAbbr: string,
  radiusMiles: number
): string {
  const r = Math.round(Math.min(400, Math.max(10, radiusMiles)));
  const cityTrim = city.trim();
  const anchor = cityTrim ? `${cityTrim} ${stateAbbr}` : `central ${stateAbbr}`;
  return `within ${r} miles of ${anchor}`;
}

function qualityTierSearchClause(tiers: QualityTier[] | null | undefined): string {
  if (!tiers?.length) return '';
  const parts = tiers.map((t) => TIER_SEARCH_KEYWORDS[t]).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.join(' ');
}

function searchLocationLine(city: string, stateAbbr: string): string {
  const c = city.trim();
  const st = stateAbbr.trim().toUpperCase().slice(0, 2);
  if (c.length >= 2 && st.length === 2) return `${c} ${st}`;
  if (st.length === 2) return st;
  return c.length >= 2 ? c : stateAbbr.trim();
}

/**
 * Tavily query strings from property kinds, radius, and optional quality-tier filters.
 * Glamping uses “in / around / near [location]” phrasing plus radius context to find property sites.
 */
export function buildGapFillQueries(params: {
  city: string;
  stateAbbr: string;
  propertyKinds: CompsV2PropertyKind[];
  radiusMiles: number;
  qualityTiers: QualityTier[] | null;
  /** Cap distinct queries (1–10). Defaults to full planner output (up to 10). */
  maxQueries?: number;
}): string[] {
  const { city, stateAbbr, propertyKinds: kinds, radiusMiles, qualityTiers, maxQueries } = params;
  const dist = radiusSearchContext(city, stateAbbr, radiusMiles);
  const loc = searchLocationLine(city, stateAbbr);
  const tierClause = qualityTierSearchClause(qualityTiers);
  const withTier = (q: string) => (tierClause ? `${q} ${tierClause}` : q);

  const bases: string[] = [];
  if (kinds.includes('glamping') || kinds.includes('landscape_hotel')) {
    bases.push(`Glamping in ${loc} ${dist} official website book direct`);
    bases.push(`Glamping around ${loc} ${dist} nearby unique stays yurts treehouse`);
    bases.push(`Glamping near ${loc} ${dist} nightly rates safari tents domes`);
    bases.push(`luxury glamping ${loc} ${dist} boutique cabins resort`);
  }
  if (kinds.includes('rv') || kinds.includes('campground')) {
    bases.push(`RV parks in ${loc} ${dist} nightly rates pull-through sites`);
    bases.push(`Campgrounds around ${loc} ${dist} camping reservations official site`);
  }
  if (kinds.includes('marina')) {
    bases.push(`marina waterfront RV camping ${loc} ${dist}`);
  }
  if (bases.length === 0) {
    bases.push(`outdoor hospitality lodging ${loc} ${dist}`);
  }

  const expanded: string[] = [];
  for (const b of bases) {
    expanded.push(withTier(b));
    if (tierClause) {
      expanded.push(b);
    }
  }

  const unique = [...new Set(expanded.map((q) => q.replace(/\s+/g, ' ').trim()))];
  const cap = Math.min(
    MAX_DISTINCT_QUERIES,
    Math.max(1, Math.floor(maxQueries ?? MAX_DISTINCT_QUERIES))
  );
  return unique.slice(0, cap);
}

function fallbackNameFromUrl(url: string, title: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').split('.')[0] || title;
  } catch {
    return title;
  }
}

/**
 * Turn SERP / listing titles into a short property name for the results table.
 * City/state should still be parsed from the original `title` when possible (see fetch loop).
 */
export function normalizeWebResearchPropertyTitle(title: string, url: string): string {
  let s = title.trim();
  if (!s) return fallbackNameFromUrl(url, title);

  // "NAME - Campground Reviews (City, ST)" / Tripadvisor-style
  const reviewParts = s.split(/\s*[-–—]\s*(?:Campground\s+Reviews|Read\s+Reviews)\b/i);
  if (reviewParts.length > 1 && reviewParts[0].trim().length >= 3) {
    s = reviewParts[0].trim();
  }

  // OTA / directory tails
  s = s
    .replace(
      /\s*[-|–—]\s*(Hipcamp|RoverPass|Campspot|Google|Yelp|Tripadvisor|TripAdvisor|Booking\.com|Expedia)\b.*/i,
      ''
    )
    .trim();

  // Trailing "(City, ST)" or "(City, ST 12345)" — display name only; city comes from extractCityHint / original title
  s = s.replace(/\s*\([A-Za-z][A-Za-z\s.'-]{1,48},\s*[A-Z]{2}(?:\s+\d{5})?\)\s*$/i, '').trim();

  if (s.length > 5) return s;
  return fallbackNameFromUrl(url, title);
}

export function extractRateFromWebText(text: string): number | null {
  const range = text.match(
    /\$(\d{2,4})(?:\.\d{2})?\s*[-–]\s*\$(\d{2,4})(?:\.\d{2})?(?:\s*(?:\/|per)\s*night|\s+nightly|\s+per\s+day)?/i
  );
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const mid = (a + b) / 2;
      if (mid >= 15 && mid <= 2500) return Math.round(mid * 10) / 10;
    }
  }

  const patterns: RegExp[] = [
    /\$(\d{2,4})(?:\.\d{2})?\s*(?:\/\s*)?(?:night|nightly|per night)/i,
    /\$(\d{2,4})(?:\.\d{2})?\s*\/\s*night/i,
    /(?:from|starting at|starts at|rates from)\s*\$?\s*(\d{2,4})\b/i,
    /\$\s*(\d{2,4})\s*(?:\+|plus)?\s*(?:per|\/)\s*(?:night|day)/i,
    /(?:nightly|per night)\s*(?:from|as low as)?\s*\$?\s*(\d{2,4})\b/i,
    /(?:daily|nightly)\s+(?:rate|fee|starting)[s:]?\s*\$?\s*(\d{2,4})\b/i,
    /(?:rates?|pricing)\s*:?\s*\$?\s*(\d{2,4})\b(?:\s*[-–]\s*\$?\s*\d{2,4})?\s*(?:\/|\s+per\s+)?(?:night|day|nightly)?/i,
    /\$\s*(\d{2,4})\s*(?:USD)?\s*(?:\/|\s+per\s+)(?:night|day|stay)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = parseFloat(m[1]);
      if (n >= 15 && n <= 2500) return n;
    }
  }
  return null;
}

/** Nightly dollar range from marketing copy; mid suitable as ADR when no single rate found. */
export function extractRateRangeFromWebText(text: string): { low: number; high: number; mid: number } | null {
  const range = text.match(
    /\$(\d{2,4})(?:\.\d{2})?\s*[-–]\s*\$(\d{2,4})(?:\.\d{2})?(?:\s*(?:\/|per)\s*night|\s+nightly|\s+per\s+day)?/i
  );
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      if (low >= 15 && high <= 2500) {
        const mid = Math.round(((low + high) / 2) * 10) / 10;
        return { low, high, mid };
      }
    }
  }
  return null;
}

const SITE_COUNT_MAX = 2500;

/**
 * Best-effort RV site / pad / campsite count from scraped or snippet text.
 */
export function extractSiteCountFromWebText(text: string): number | null {
  const t = text.replace(/\s+/g, ' ');
  const candidates: number[] = [];

  const push = (n: number) => {
    if (Number.isFinite(n) && n >= 3 && n <= SITE_COUNT_MAX) candidates.push(Math.round(n));
  };

  const patternSources = [
    '(?:over|more than|up to|nearly|almost)\\s+(\\d{1,4})\\s+(?:full[-\\s]?hookup\\s+)?(?:RV\\s+)?(?:sites?|spaces|pads?)',
    '(\\d{1,4})\\s*\\+\\s*(?:RV\\s+)?(?:sites?|campsites|spaces)',
    '(\\d{1,4})\\s+(?:full[-\\s]?hookup\\s+)?(?:RV\\s+)?(?:pull[-\\s]?through\\s+)?(?:sites?|pads?|spaces)\\b',
    '(?:park|campground|resort)\\s+(?:features|offers|has|with)\\s+(\\d{1,4})\\s+(?:RV\\s+)?(?:sites?|spaces)',
    '(\\d{1,4})\\s+(?:campsites?|camping\\s+sites?)\\b',
    '(\\d{1,3})\\s+(?:luxury\\s+)?(?:glamping\\s+)?(?:units|tents|yurts|domes|pods|structures|accommodations|stays)\\b',
    '(\\d{1,3})\\s+(?:glamping\\s+)?(?:units|tents|yurts|domes|pods|structures|accommodations|stays)\\b',
    '(?:we\\s+(?:have|offer)|features?|collection\\s+of)\\s+(\\d{1,3})\\s+(?:glamping|unique|luxury)\\s+(?:units|tents|yurts|cabins|domes)\\b',
  ];

  for (const src of patternSources) {
    const r = new RegExp(src, 'gi');
    for (const m of t.matchAll(r)) {
      push(parseFloat(m[1]));
    }
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/**
 * City embedded in listing titles, e.g. "… in Johnson City, TX" or "(Johnson City, TX)".
 */
export function extractCityFromPropertyName(name: string, stateAbbr: string): string {
  const st = stateAbbr.trim().toUpperCase().slice(0, 2);
  if (st.length !== 2) return '';
  const esc = st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let m = name.match(new RegExp(`\\bin\\s+([A-Za-z][A-Za-z .'\\-]{1,48})\\s*,\\s*${esc}\\b`, 'i'));
  if (m) {
    const c = m[1].trim();
    if (c.length >= 2 && c.length <= 50) return c;
  }
  m = name.match(new RegExp(`\\(([A-Za-z][A-Za-z .'\\-]{1,48})\\s*,\\s*${esc}\\)`, 'i'));
  if (m) {
    const c = m[1].trim();
    if (c.length >= 2 && c.length <= 50) return c;
  }
  return '';
}

/** Best-effort city from title/snippet; avoids stamping the search anchor city on every row. */
export function extractCityHint(title: string, content: string, stateAbbr: string): string {
  const head = `${title}\n${content.slice(0, 800)}`;
  const re = new RegExp(
    `([A-Za-z][A-Za-z .'\\-]{1,48})\\s*,\\s*${stateAbbr}\\b`,
    'i'
  );
  const m = head.match(re);
  if (m) {
    const c = m[1].trim();
    if (c.length >= 2 && c.length <= 50) return c;
  }
  return '';
}

function isRelevant(title: string, content: string): boolean {
  const t = `${title} ${content}`.toLowerCase();
  const strong = [
    'glamp',
    'glamping',
    'rv park',
    'rv resort',
    'campground',
    'campsite',
    'yurt',
    'safari tent',
    'treehouse',
    'canvas tent',
    'tipi',
    'teepee',
    'airstream',
    'tiny cabin',
    'boutique cabin',
  ];
  if (strong.some((k) => t.includes(k))) return true;
  const moderate = ['cabin rental', 'cabin stay', 'marina rv', 'waterfront rv', 'rv camping'];
  if (moderate.some((k) => t.includes(k))) return true;
  const lodgingPair =
    (t.includes('resort') || t.includes('lodg') || t.includes('cabin')) &&
    (t.includes('camp') || t.includes('outdoor') || t.includes('rv'));
  return lodgingPair;
}

/**
 * Heuristic: skip roundup/listicle/directory SERP hits that are not a single bookable property.
 * Exported for tests.
 */
export function isLikelyAggregateWebResult(title: string, url: string): boolean {
  const t = title.trim();
  if (t.length < 6) return true;
  const lower = t.toLowerCase();

  // "20 Best …", "Top 10 …"
  if (/^\d+\s+best\b/i.test(t)) return true;
  if (/\btop\s+\d+\b/i.test(t)) return true;

  // "The best luxury camping near …" / generic SEO roundups (no digit — those caught above)
  if (
    /^the\s+best\s+(?:luxury\s+)?(?:camping|glamping|rv\s+parks?|campgrounds?|cabin\s+rentals?|cabins|hotels|lodging|places\s+to\s+stay|vacation\s+rentals?|stays)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (/^best\s+(?:luxury\s+)?camping\s+near\b/i.test(t)) return true;
  if (/^best\s+campgrounds?\s+near\b/i.test(t)) return true;
  if (/^best\s+cabin\s+rentals?\s+near\b/i.test(t)) return true;

  // Directory-style titles (Hipcamp / OTAs / hubs)
  if (/^glamping\s+near\b/i.test(t)) return true;
  if (/^rv\s+parks?\s+near\b/i.test(t)) return true;
  if (/^rv\s+camping\s+near\b/i.test(t)) return true;
  if (/^campgrounds?\s+near\b/i.test(t)) return true;

  // "THE BEST 10 RV PARKS near …" — digit + roundup category (not e.g. "The Best 100 Acres")
  if (
    /^the\s+best\s+\d+\s+(?:rv\s+parks?|campgrounds?|glamping|cabin\s+rentals?|cabins?|hotels?|places\s+to\s+stay|vacation\s+rentals?|things\s+to\s+do)\b/i.test(
      t
    )
  ) {
    return true;
  }

  // Multi-category landing pages
  if (/cabins\s*&\s*hotels\s+in\b/i.test(lower)) return true;
  if (/\bhotels\s+in\s+.+\s\|\s+/i.test(t)) return true;
  if (/\s\|\s+.*\blodging\b/i.test(lower)) return true;

  // "Guide to …", "things to do", generic ideas lists
  if (/\bguide\s+to\s+(?:the\s+)?best\b/i.test(lower)) return true;
  if (/\bbest\s+places\s+to\s+(stay|camp|glamp)\b/i.test(lower)) return true;
  if (/\bthings\s+to\s+do\s+(in|near)\b/i.test(lower)) return true;

  // Year-suffixed travel roundups (e.g. "… 2026") — only with roundup cues to avoid "Est. 2024" venues
  {
    const trimmedEnd = t.replace(/[.,)\]]+$/g, '').trim();
    if (
      /\b20[2-4]\d\s*$/i.test(trimmedEnd) &&
      /\b(best|top\s+\d|guide\s+to|rentals?\s+near)\b/i.test(lower)
    ) {
      return true;
    }
  }

  try {
    const u = new URL(url.trim());
    const path = u.pathname.toLowerCase();
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (/\/(articles?|roundup|round-ups|listicles?|lists?|ideas)\b/.test(path)) return true;
    if (/\/best[-_/]/.test(path)) return true;
    if (/\/top[-_\s]?\d/.test(path)) return true;

    if (host.includes('tripadvisor.') && /\/(attractions|travel-guides|list)\b/i.test(path)) {
      return true;
    }
    if (host.includes('thedyrt.com') && /\/magazine\/|\/blog\/|\/articles?\//i.test(path)) {
      return true;
    }
  } catch {
    // ignore bad URLs
  }

  return false;
}

export { canonicalUrlKeyForDedupe } from '@/lib/comps-v2/canonical-url';

export interface FetchTavilyGapCompsResult {
  rows: ComparableProperty[];
  stats: TavilyGapStats;
}

export async function fetchTavilyGapComps(
  city: string,
  stateAbbr: string,
  propertyKinds: CompsV2PropertyKind[],
  options: {
    radiusMiles: number;
    qualityTiers: QualityTier[] | null;
    maxGapComps?: number;
    tavilyMaxQueries?: number;
    tavilyResultsPerQuery?: number;
  }
): Promise<FetchTavilyGapCompsResult> {
  const maxGap = resolvedMaxGapComps(options.maxGapComps);
  const maxQueries = parseTavilyMaxQueries(options.tavilyMaxQueries);
  const resultsPerQuery = parseTavilyResultsPerQuery(options.tavilyResultsPerQuery);
  const stats: TavilyGapStats = {
    apiConfigured: false,
    queriesPlanned: 0,
    queriesCompleted: 0,
    rawResultRowsFromApi: 0,
    afterRelevanceRows: 0,
    skippedAggregatePages: 0,
    tavilyRowsEmitted: 0,
    queryErrors: [],
    maxGapCompsCap: maxGap,
    maxQueriesBudget: maxQueries,
    maxResultsPerQueryBudget: resultsPerQuery,
  };

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[tavily-gap] TAVILY_API_KEY not set');
    return { rows: [], stats };
  }
  stats.apiConfigured = true;

  const client = tavily({ apiKey });
  const queries = buildGapFillQueries({
    city,
    stateAbbr,
    propertyKinds,
    radiusMiles: options.radiusMiles,
    qualityTiers: options.qualityTiers,
    maxQueries,
  });
  stats.queriesPlanned = queries.length;

  const rows: ComparableProperty[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (rows.length >= maxGap) break;
    let response: { results?: Array<{ title?: string; url?: string; rawContent?: string; content?: string }> } | null =
      null;
    for (let attempt = 0; attempt < TAVILY_QUERY_MAX_ATTEMPTS; attempt++) {
      try {
        response = await client.search(query, {
          searchDepth: 'advanced',
          maxResults: resultsPerQuery,
          includeAnswer: false,
          includeRawContent: 'markdown',
        });
        stats.queriesCompleted += 1;
        break;
      } catch (e) {
        const canRetry =
          attempt < TAVILY_QUERY_MAX_ATTEMPTS - 1 && isLikelyTransientNetworkError(e);
        if (!canRetry) {
          const msg = e instanceof Error ? e.message : String(e);
          stats.queryErrors.push(msg.slice(0, 200));
          console.warn('[tavily-gap] query failed', e);
        } else {
          console.warn('[tavily-gap] query transient failure, retrying', e);
          await sleepBackoffMs(attempt, TAVILY_RETRY_BASE_MS);
        }
      }
    }
    if (response) {
      for (const r of response.results ?? []) {
        stats.rawResultRowsFromApi += 1;
        if (rows.length >= maxGap) break;
        const title = r.title || '';
        const raw = r.rawContent ?? r.content ?? '';
        const url = r.url ?? '';
        if (!isRelevant(title, raw)) continue;
        if (isLikelyAggregateWebResult(title, url)) {
          stats.skippedAggregatePages += 1;
          continue;
        }
        stats.afterRelevanceRows += 1;
        const name = normalizeWebResearchPropertyTitle(title, url);
        const snippet = raw.length > 400 ? raw.slice(0, 400) + '…' : raw;
        const cityHint = extractCityHint(title, raw, stateAbbr);
        const cityFromName =
          extractCityFromPropertyName(title, stateAbbr) || extractCityFromPropertyName(name, stateAbbr);
        const cityResolved = cityHint || cityFromName;
        const dedupeKey = compsV2WebVsMarketDedupeKey(name, cityResolved || undefined, stateAbbr);
        if (!dedupeKey || seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        rows.push({
          property_name: name,
          city: cityResolved,
          state: stateAbbr,
          unit_type: null,
          property_total_sites: null,
          quantity_of_units: null,
          avg_retail_daily_rate: extractRateFromWebText(raw),
          high_rate: null,
          low_rate: null,
          seasonal_rates: { ...EMPTY_SEASONAL },
          operating_season_months: null,
          url: r.url ?? null,
          description: snippet || null,
          distance_miles: null,
          source_table: 'tavily_gap_fill',
        });
      }
    }
    await new Promise((res) => setTimeout(res, TAVILY_DELAY_MS));
  }

  stats.tavilyRowsEmitted = rows.length;
  return { rows, stats };
}
