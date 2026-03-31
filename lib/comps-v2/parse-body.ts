import {
  COMPS_V2_PROPERTY_KINDS,
  ALL_SOURCES_DISABLED,
  QUALITY_TIERS,
  type CompsV2PropertyKind,
  type QualityTier,
  type SourceToggles,
} from '@/lib/comps-v2/types';

/** Merged candidate cap (server + UI). */
export const COMPS_V2_MAX_RESULTS_MIN = 1;
export const COMPS_V2_MAX_RESULTS_MAX = 2000;
export const COMPS_V2_MAX_RESULTS_DEFAULT = 300;

/** Default rows fetched per market table before merge (server `rowLimitPerTable`). */
export const COMPS_V2_ROW_LIMIT_PER_TABLE_DEFAULT = 400;

export function parsePropertyKinds(raw: unknown): CompsV2PropertyKind[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...COMPS_V2_PROPERTY_KINDS];
  }
  const out = raw.filter(
    (k): k is CompsV2PropertyKind =>
      typeof k === 'string' && COMPS_V2_PROPERTY_KINDS.includes(k as CompsV2PropertyKind)
  );
  return out.length ? out : [...COMPS_V2_PROPERTY_KINDS];
}

export function parseQualityTiers(raw: unknown): QualityTier[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = raw.filter(
    (t): t is QualityTier => typeof t === 'string' && QUALITY_TIERS.includes(t as QualityTier)
  );
  return out.length ? out : null;
}

/**
 * Opt-in: each source runs only if explicitly `true`.
 * Missing `sources` → nothing queried (safe for raw API clients).
 */
export function parseSourceToggles(raw: unknown): SourceToggles {
  if (!raw || typeof raw !== 'object') return { ...ALL_SOURCES_DISABLED };
  const o = raw as Record<string, unknown>;
  return {
    pastReports: o.pastReports === true,
    all_glamping_properties: o.all_glamping_properties === true,
    hipcamp: o.hipcamp === true,
    all_roverpass_data_new: o.all_roverpass_data_new === true,
    campspot: o.campspot === true,
    web_search: o.web_search === true,
  };
}

export function parseMaxResults(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  const base = Number.isFinite(n) ? n : COMPS_V2_MAX_RESULTS_DEFAULT;
  return clamp(base, COMPS_V2_MAX_RESULTS_MIN, COMPS_V2_MAX_RESULTS_MAX);
}

/** Tavily: distinct search queries per gap-fill run (API calls before Firecrawl). */
export const COMPS_V2_TAVILY_MAX_QUERIES_MIN = 1;
export const COMPS_V2_TAVILY_MAX_QUERIES_MAX = 10;
export const COMPS_V2_TAVILY_MAX_QUERIES_DEFAULT = 10;

/** Tavily: max raw results per query (billed rows from Tavily). */
export const COMPS_V2_TAVILY_RESULTS_PER_QUERY_MIN = 1;
export const COMPS_V2_TAVILY_RESULTS_PER_QUERY_MAX = 10;
export const COMPS_V2_TAVILY_RESULTS_PER_QUERY_DEFAULT = 7;

export function parseTavilyMaxQueries(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  const base = Number.isFinite(n) ? Math.floor(n) : COMPS_V2_TAVILY_MAX_QUERIES_DEFAULT;
  return clamp(base, COMPS_V2_TAVILY_MAX_QUERIES_MIN, COMPS_V2_TAVILY_MAX_QUERIES_MAX);
}

export function parseTavilyResultsPerQuery(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  const base = Number.isFinite(n) ? Math.floor(n) : COMPS_V2_TAVILY_RESULTS_PER_QUERY_DEFAULT;
  return clamp(base, COMPS_V2_TAVILY_RESULTS_PER_QUERY_MIN, COMPS_V2_TAVILY_RESULTS_PER_QUERY_MAX);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
