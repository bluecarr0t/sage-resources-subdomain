/**
 * Shared helpers for Sage AI tool modules: table allowlists, column/filter
 * validation, empty-result retry machinery, and small serialization utils.
 * Extracted from the former tools.ts monolith — behavior-preserving.
 */

import { ALL_GLAMPING_PROPERTY_COLUMNS } from '@/lib/sage-ai/all-glamping-properties-columns';

/** Normalized scrape-layer views (`hipcamp.*` / `campspot.*` exposed in public). */
export const HIPCAMP_RAW_TABLES = [
  'hipcamp_old_data_table',
  'hipcamp_propertydetails',
  'hipcamp_propertys',
  'hipcamp_scrapings',
  'hipcamp_sitedetails',
  'hipcamp_sites',
  'hipcamp_siteseasonals',
] as const;

export const CAMPSPOT_RAW_TABLES = [
  'campspot_old_data_table',
  'campspot_propertydetails',
  'campspot_propertys',
  'campspot_scrapings',
  'campspot_sitedetails',
  'campspot_sites',
  'campspot_siteseasonals',
] as const;

export const RAW_OTA_TABLES = [
  ...HIPCAMP_RAW_TABLES,
  ...CAMPSPOT_RAW_TABLES,
] as const;

export type RawOtaTable = (typeof RAW_OTA_TABLES)[number];

export const RAW_OTA_TABLE_DESCRIPTIONS: Record<RawOtaTable, string> = {
  hipcamp_old_data_table: 'Legacy Hipcamp archive rows (pre-normalized scrape).',
  hipcamp_propertydetails: 'Hipcamp property-level detail records from scrape pipeline.',
  hipcamp_propertys: 'Hipcamp property/park records (normalized `hipcamp.propertys`).',
  hipcamp_scrapings: 'Hipcamp scrape run metadata (import batches, timestamps).',
  hipcamp_sitedetails: 'Hipcamp site-level detail records from scrape pipeline.',
  hipcamp_sites: 'Hipcamp individual site rows (normalized `hipcamp.sites`).',
  hipcamp_siteseasonals: 'Hipcamp seasonal pricing / availability per site.',
  campspot_old_data_table: 'Legacy Campspot archive rows (pre-normalized scrape).',
  campspot_propertydetails: 'Campspot property-level detail records from scrape pipeline.',
  campspot_propertys: 'Campspot property/park records (normalized `campspot.propertys`).',
  campspot_scrapings: 'Campspot scrape run metadata (import batches, timestamps).',
  campspot_sitedetails: 'Campspot site-level detail records from scrape pipeline.',
  campspot_sites: 'Campspot individual site rows (normalized `campspot.sites`).',
  campspot_siteseasonals: 'Campspot seasonal pricing / availability per site.',
};

export const ALLOWED_TABLES = [
  'all_sage_data',
  'hipcamp',
  'campspot',
  ...RAW_OTA_TABLES,
  'all_roverpass_data_new',
  'reports',
  'county-population',
  'ski_resorts',
  'national-parks',
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

/**
 * Column allowlists per table. Keys are the canonical columns the AI is permitted
 * to reference in `select` / filter operations. For tables with volatile schemas
 * (campspot, all_roverpass_data_new) we don't enumerate columns; instead we fall
 * back to a strict identifier regex.
 *
 * Glamping uses many per-feature `unit_*` / `property_*` / `activities_*` /
 * `setting_*` / `rv_*` text columns (typically "Yes" / "No") — not a single
 * `amenities` column. See `GLAMPING_AMENITIES_SCHEMA_BLURB` in tool descriptions.
 */
const PROPERTIES_COLUMN_ALLOWLIST = ALL_GLAMPING_PROPERTY_COLUMNS as unknown as readonly string[];

const HIPCAMP_COLUMN_ALLOWLIST = [
  'id',
  'name',
  'url',
  'city',
  'state',
  'country',
  'property_type',
  'price',
  'rating',
  'review_count',
  'amenities',
  'created_at',
  'updated_at',
] as const;

// Aligned to the actual `reports` table schema (Postgres `public.reports`).
// Do NOT add columns the model would like to exist (e.g. `report_name`,
// `project_type`) — Postgres will reject the SELECT and we'll burn a turn on
// a hallucinated query. Verified against information_schema 2026-04.
const REPORTS_COLUMN_ALLOWLIST = [
  'id',
  'client_id',
  'client_name',
  'client_entity',
  'title',
  'property_name',
  'state',
  'city',
  'county',
  'country',
  'address',
  'zip_code',
  'market_type',
  'report_purpose',
  'service',
  'development_phase',
  'resort_type',
  'resort_name',
  'status',
  'study_id',
  'report_date',
  'total_sites',
  'has_comparables',
  'comp_count',
  'comp_unit_count',
  'created_at',
  'updated_at',
  'completed_at',
] as const;

const COUNTY_POPULATION_COLUMN_ALLOWLIST = [
  'state',
  'county',
  'population',
  'year',
  'fips',
] as const;

const SKI_RESORTS_COLUMN_ALLOWLIST = [
  'id',
  'name',
  'state',
  'country',
  'trails',
  'lifts',
  'elevation',
  'skiable_acres',
  'url',
] as const;

const NATIONAL_PARKS_COLUMN_ALLOWLIST = [
  'id',
  'name',
  'state',
  'acres',
  'visitors',
  'year_established',
  'url',
] as const;

const RAW_OTA_COLUMN_POLICY = Object.fromEntries(
  RAW_OTA_TABLES.map((table) => [table, 'dynamic' as const])
) as Record<RawOtaTable, 'dynamic'>;

export const COLUMN_ALLOWLIST_BY_TABLE: Record<
  AllowedTable,
  readonly string[] | 'dynamic'
> = {
  all_sage_data: PROPERTIES_COLUMN_ALLOWLIST,
  hipcamp: HIPCAMP_COLUMN_ALLOWLIST,
  reports: REPORTS_COLUMN_ALLOWLIST,
  'county-population': COUNTY_POPULATION_COLUMN_ALLOWLIST,
  ski_resorts: SKI_RESORTS_COLUMN_ALLOWLIST,
  'national-parks': NATIONAL_PARKS_COLUMN_ALLOWLIST,
  // Schema of these scraped sources drifts; restrict to safe identifiers only.
  campspot: 'dynamic',
  all_roverpass_data_new: 'dynamic',
  ...RAW_OTA_COLUMN_POLICY,
};

/** Accept only Postgres-safe identifiers (no quotes, no dots, no whitespace). */
export const SAFE_IDENTIFIER = /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/;

/** All-sage-data column allowlist, exported for order_by / projection checks. */
export { PROPERTIES_COLUMN_ALLOWLIST };

/**
 * Validate a list of column names against the allowlist for `table`. Unknown
 * columns are dropped and returned in `rejected` so callers can surface a
 * helpful error to the model.
 */
export function validateColumns(
  table: AllowedTable,
  columns: readonly string[] | undefined
): { allowed: string[]; rejected: string[] } {
  if (!columns || columns.length === 0) return { allowed: [], rejected: [] };
  const policy = COLUMN_ALLOWLIST_BY_TABLE[table];
  const allowed: string[] = [];
  const rejected: string[] = [];
  for (const col of columns) {
    if (!SAFE_IDENTIFIER.test(col)) {
      rejected.push(col);
      continue;
    }
    if (policy === 'dynamic') {
      allowed.push(col);
    } else if (policy.includes(col)) {
      allowed.push(col);
    } else {
      rejected.push(col);
    }
  }
  return { allowed, rejected };
}

/**
 * Validate filter keys (column names used as lhs of equality/ilike predicates).
 * Uses the same allowlist as select columns.
 */
export function validateFilterKeys(
  table: AllowedTable,
  filters: Record<string, string> | undefined
): { allowed: Record<string, string>; rejected: string[] } {
  if (!filters) return { allowed: {}, rejected: [] };
  const policy = COLUMN_ALLOWLIST_BY_TABLE[table];
  const allowed: Record<string, string> = {};
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (!SAFE_IDENTIFIER.test(key)) {
      rejected.push(key);
      continue;
    }
    if (policy === 'dynamic' || policy.includes(key)) {
      allowed[key] = value;
    } else {
      rejected.push(key);
    }
  }
  return { allowed, rejected };
}

/**
 * Strip filter entries the model passed as empty/whitespace strings.
 *
 * Models (especially smaller/faster ones) often "fill out" every optional
 * filter slot with `""` instead of omitting the key. The Postgres aggregate
 * RPC then runs `column ILIKE ''` which matches NOTHING (an empty pattern
 * only matches an empty string, and our data has no empty-string values),
 * so the call returns 0 rows and the model — having received what looks
 * like a legitimate empty result — narrates "no data available". This
 * helper makes the tools tolerant: an empty/whitespace filter value is
 * treated identically to omitting the field, which is what the model
 * almost certainly meant.
 */
export function stripEmptyFilters<T extends Record<string, unknown> | undefined>(
  filters: T
): T {
  if (!filters) return filters;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') continue;
      out[key] = trimmed;
    } else if (value === null || value === undefined) {
      continue;
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/** PostgREST often returns `numeric` columns as strings; keep aggregates numeric for UI. */
export function coerceRpcNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Stable serialization for retry counter keys. Recursively sorts object keys
 * so `{a:1,b:2}` and `{b:2,a:1}` collide, and tolerates anything JSON can hold.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

/**
 * How many times we let the model re-attempt the same data tool with the same
 * exact args after it returns an empty result, before we surface a hard error.
 * "1" means: first empty -> retry signal, second empty -> hard error. Increase
 * cautiously; each retry burns an LLM step and a DB roundtrip.
 */
const MAX_EMPTY_RESULT_RETRIES = 1;

/**
 * Sentinel returned by data tools when a query yielded zero rows but we want
 * the model to retry with different parameters. The UI hides tiles carrying
 * this marker so the user only sees the eventual successful (or
 * `_emptyRetryExhausted`) attempt — empty intermediate tiles are noise.
 */
export interface EmptyRetrySignal {
  _emptyRetry: true;
  attempt: number;
  message: string;
  hint?: string;
}

export interface EmptyRetryExhausted {
  error: string;
  _emptyRetryExhausted: true;
  attempts: number;
  data: null;
}

export type EmptyResultHandler = <T extends object>(
  toolName: string,
  args: unknown,
  payload: T,
  isEmpty: boolean,
  hint?: string
) => T | EmptyRetrySignal | EmptyRetryExhausted;

/**
 * Build a per-request empty-result handler. The returned function tracks how
 * many times each (tool, args) pair has come back empty; the counter lives in
 * the closure so it naturally resets between chat turns (`createSageAiTools`
 * is called fresh per request in chat/route.ts).
 *
 * Returns either the original payload (when non-empty), an `EmptyRetrySignal`
 * the UI hides (so we silently re-roll), or a hard error after we've burned
 * the retry budget. `args` should be the deduplicated tool call arguments;
 * we serialize them so the same exact retry collides into one counter slot.
 */
export function createEmptyResultHandler(): EmptyResultHandler {
  const emptyResultAttempts = new Map<string, number>();

  return function handleEmptyResult<T extends object>(
    toolName: string,
    args: unknown,
    payload: T,
    isEmpty: boolean,
    hint?: string
  ): T | EmptyRetrySignal | EmptyRetryExhausted {
    if (!isEmpty) return payload;

    const key = `${toolName}:${stableStringify(args)}`;
    const prev = emptyResultAttempts.get(key) ?? 0;
    const next = prev + 1;
    emptyResultAttempts.set(key, next);

    if (next > MAX_EMPTY_RESULT_RETRIES) {
      return {
        error: `${toolName} returned no results after ${next} attempts with these parameters. The data does not match — report "no data available" to the user instead of retrying again.`,
        _emptyRetryExhausted: true,
        attempts: next,
        data: null,
      };
    }

    return {
      _emptyRetry: true,
      attempt: next,
      message: `${toolName} returned 0 rows on attempt ${next}. Try different parameters (broaden filters, drop a constraint, or call get_column_values to find valid values) before retrying.`,
      ...(hint ? { hint } : {}),
    };
  };
}
