/**
 * Sage AI Tools - Read-only Supabase query tools for the AI assistant.
 * These tools allow the AI to query data but never modify it.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enforceDailyQuota } from '@/lib/upstash';
import { withToolTelemetry } from '@/lib/sage-ai/tool-telemetry';
import { createGeoTools } from '@/lib/sage-ai/geo-tools';
import { createSemanticTools } from '@/lib/sage-ai/semantic-tools';
import { createComposedTools } from '@/lib/sage-ai/composed-tools';
import { createVisualizationTools } from '@/lib/sage-ai/visualization-tools';
import { fetchWithTimeout } from '@/lib/sage-ai/fetch-with-timeout';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  ALL_GLAMPING_PROPERTY_COLUMNS,
  GLAMPING_AMENITIES_SCHEMA_BLURB,
  isGlampingEqFilterColumn,
  isGlampingGroupByColumn,
  isGlampingDistinctColumn,
} from '@/lib/sage-ai/all-glamping-properties-columns';
import {
  effectiveGlampingRetailAdrFromRow,
  GLAMPING_SEASONAL_RATE_COLUMN_KEYS,
} from '@/lib/sage-ai/effective-glamping-retail-adr';
import { robustGlampingRateStats, type RateRow } from '@/lib/sage-ai/robust-rate-stats';
import {
  isAllowlistBlockedDistinctError,
  scanGlampingColumnDistinctFrequencies,
} from '@/lib/sage-ai/glamping-distinct-fallback';
import {
  GLAMPING_FIELD_GUIDE_VERSION,
  searchFieldGuide,
} from '@/lib/sage-ai/glamping-field-guide';

/** PostgREST often returns `numeric` columns as strings; keep aggregates numeric for UI. */
function coerceRpcNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Per-call timeout caps for external HTTP integrations (ms). These were
 * picked to comfortably fit inside the route's `maxDuration = 60` budget so a
 * single hung peer can't exhaust the whole turn.
 */
const TIMEOUT_GOOGLE_PLACES = 10_000;
const TIMEOUT_TAVILY = 20_000;
const TIMEOUT_FIRECRAWL_SCRAPE = 25_000;
const TIMEOUT_FIRECRAWL_CRAWL_KICKOFF = 15_000;
const TIMEOUT_FIRECRAWL_CRAWL_POLL = 8_000;

export interface SageAiToolsContext {
  /** Stable subject for quota tracking (typically auth user id). */
  userId: string;
  /**
   * managed_users.role for the calling user. Used to gate admin-only tools
   * like build_feasibility_brief. Defaults to 'user' when omitted.
   */
  userRole?: 'user' | 'admin' | 'editor' | null;
  /** Correlation id to stitch tool events to the chat turn. */
  correlationId?: string;
  /**
   * When true, Tavily + Firecrawl tools (web_search, scrape_webpage, crawl_website) are registered.
   * Default false — omit so paid web research cannot run unless the user enables it in the UI.
   */
  webResearchEnabled?: boolean;
  /**
   * When true, location/proximity tools (geocode_property, nearest_attractions) and the
   * `near` filter on query_properties are registered. Default gated by env flag
   * SAGE_AI_GEO_TOOLS to allow dark rollout.
   */
  geoToolsEnabled?: boolean;
  /**
   * When true, the `semantic_search_properties` tool is registered. Requires
   * the property_embeddings table to be populated and OPENAI_API_KEY.
   * Default gated by env flag SAGE_AI_SEMANTIC_SEARCH.
   */
  semanticSearchEnabled?: boolean;
  /**
   * When true, composed tools (competitor_comparison, build_feasibility_brief)
   * are registered. Default gated by env flag SAGE_AI_COMPOSED_TOOLS.
   * build_feasibility_brief additionally requires userRole='admin'.
   */
  composedToolsEnabled?: boolean;
  /**
   * When true, the React-rendered visualization tools
   * (generate_dashboard, visualize_on_map) are registered. Default gated by
   * env flag SAGE_AI_VISUALIZATION_TOOLS.
   */
  visualizationToolsEnabled?: boolean;
}

/** Per-user daily quotas for external tools (env-overridable). */
const QUOTAS = {
  google_places_search: Number(process.env.SAGE_AI_QUOTA_GOOGLE_PLACES ?? 200),
  google_place_details: Number(process.env.SAGE_AI_QUOTA_GOOGLE_PLACES ?? 200),
  web_search: Number(process.env.SAGE_AI_QUOTA_WEB_SEARCH ?? 100),
  scrape_webpage: Number(process.env.SAGE_AI_QUOTA_SCRAPE ?? 50),
  crawl_website: Number(process.env.SAGE_AI_QUOTA_CRAWL ?? 5),
  geocode_property: Number(process.env.SAGE_AI_QUOTA_GEOCODE ?? 300),
} as const;

async function quotaGate(
  toolName: keyof typeof QUOTAS,
  userId: string | undefined
): Promise<{ error: string; data: null } | null> {
  // External, paid tools (Google/Tavily/Firecrawl) MUST be billed to a user.
  // A missing userId means we cannot enforce the daily quota, so deny rather
  // than silently bypass — otherwise an unauthenticated/misrouted call would
  // burn the shared API key with no rate limit.
  if (!userId) {
    return {
      error: `${toolName} requires an authenticated user to enforce daily quota.`,
      data: null,
    };
  }
  const quota = QUOTAS[toolName];
  const { allowed, used } = await enforceDailyQuota(toolName, userId, quota);
  if (!allowed) {
    return {
      error: `Daily quota exceeded for ${toolName} (used ${used} of ${quota}). Try again tomorrow or ask an admin to raise the limit.`,
      data: null,
    };
  }
  return null;
}

const ALLOWED_TABLES = [
  'all_glamping_properties',
  'hipcamp',
  'campspot',
  'all_roverpass_data_new',
  'reports',
  'county-population',
  'ski_resorts',
  'national-parks',
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const PROPERTIES_FILTERABLE_COLUMNS = [
  'state',
  'city',
  'country',
  'unit_type',
  'property_type',
  'source',
  'discovery_source',
  'research_status',
  'is_glamping_property',
  'is_closed',
] as const;

const PROPERTIES_SUMMARY_COLUMNS = [
  'id',
  'property_name',
  'city',
  'state',
  'country',
  'unit_type',
  'property_type',
  'url',
  'property_total_sites',
  'quantity_of_units',
  'rate_avg_retail_daily_rate',
  'research_status',
] as const;

/** Default `select` for `query_properties` when `columns` is omitted: summary + seasonal `rate_*` for `effective_retail_adr`. */
const PROPERTIES_QUERY_DEFAULT_SELECT = [
  ...PROPERTIES_SUMMARY_COLUMNS,
  ...GLAMPING_SEASONAL_RATE_COLUMN_KEYS,
] as const;

function addEffectiveRetailAdrToPropertyRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return rows.map((row) => ({
    ...row,
    effective_retail_adr: effectiveGlampingRetailAdrFromRow(row),
  }));
}

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

const COLUMN_ALLOWLIST_BY_TABLE: Record<
  AllowedTable,
  readonly string[] | 'dynamic'
> = {
  all_glamping_properties: PROPERTIES_COLUMN_ALLOWLIST,
  hipcamp: HIPCAMP_COLUMN_ALLOWLIST,
  reports: REPORTS_COLUMN_ALLOWLIST,
  'county-population': COUNTY_POPULATION_COLUMN_ALLOWLIST,
  ski_resorts: SKI_RESORTS_COLUMN_ALLOWLIST,
  'national-parks': NATIONAL_PARKS_COLUMN_ALLOWLIST,
  // Schema of these scraped sources drifts; restrict to safe identifiers only.
  campspot: 'dynamic',
  all_roverpass_data_new: 'dynamic',
};

/** Accept only Postgres-safe identifiers (no quotes, no dots, no whitespace). */
const SAFE_IDENTIFIER = /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/;

/**
 * Fields the model is allowed to request from Google Place Details. The
 * `fields` parameter on the Places API drives billing tier (Basic / Contact /
 * Atmosphere), so accepting arbitrary strings would let a prompt-injected
 * response opt us into the most expensive tier on every call. Anything outside
 * this list is silently dropped at request time.
 */
const GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS = [
  // Basic data SKU
  'address_component',
  'address_components',
  'adr_address',
  'business_status',
  'formatted_address',
  'geometry',
  'icon',
  'icon_mask_base_uri',
  'icon_background_color',
  'name',
  'permanently_closed',
  'photo',
  'photos',
  'place_id',
  'plus_code',
  'type',
  'types',
  'url',
  'utc_offset',
  'vicinity',
  // Contact data SKU
  'formatted_phone_number',
  'international_phone_number',
  'opening_hours',
  'website',
  // Atmosphere data SKU — kept narrow on purpose
  'price_level',
  'rating',
  'reviews',
  'user_ratings_total',
] as const;

/** Cap per-page scraped content fed back to the model (bytes, UTF-16 approx). */
const SCRAPED_CONTENT_MAX_CHARS = 8_000;

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
interface EmptyRetrySignal {
  _emptyRetry: true;
  attempt: number;
  message: string;
  hint?: string;
}

interface EmptyRetryExhausted {
  error: string;
  _emptyRetryExhausted: true;
  attempts: number;
  data: null;
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
function stripEmptyFilters<T extends Record<string, unknown> | undefined>(
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

/**
 * Stable serialization for retry counter keys. Recursively sorts object keys
 * so `{a:1,b:2}` and `{b:2,a:1}` collide, and tolerates anything JSON can hold.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

/** Escape characters that could break out of the source attribute. */
function escapeSourceAttr(url: string): string {
  return url.replace(/"/g, '%22').replace(/[\r\n]/g, ' ');
}

/**
 * Wrap externally scraped content in neutral tags so the model treats it as
 * untrusted data, not instructions. Truncates to SCRAPED_CONTENT_MAX_CHARS.
 */
function wrapUntrustedContent(source: string, content: string): string {
  const safeSource = escapeSourceAttr(source);
  const trimmed =
    content.length > SCRAPED_CONTENT_MAX_CHARS
      ? `${content.slice(0, SCRAPED_CONTENT_MAX_CHARS)}\n...(truncated from ${content.length} characters)`
      : content;
  return `<UNTRUSTED_CONTENT source="${safeSource}">\n${trimmed}\n</UNTRUSTED_CONTENT>`;
}

/**
 * Validate a list of column names against the allowlist for `table`. Unknown
 * columns are dropped and returned in `rejected` so callers can surface a
 * helpful error to the model.
 */
function validateColumns(
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
function validateFilterKeys(
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

export function createSageAiTools(
  supabase: SupabaseClient,
  context?: SageAiToolsContext
) {
  const userId = context?.userId;
  const telemetryCtx = context
    ? {
        supabase,
        userId: context.userId,
        correlationId: context.correlationId,
      }
    : null;

  /**
   * Per-request counter of how many times each (tool, args) pair has come back
   * empty. Lives in this closure so it naturally resets between chat turns
   * (`createSageAiTools` is called fresh per request in chat/route.ts).
   */
  const emptyResultAttempts = new Map<string, number>();

  /**
   * Returns either the original payload (when non-empty), an `EmptyRetrySignal`
   * the UI hides (so we silently re-roll), or a hard error after we've burned
   * the retry budget. `args` should be the deduplicated tool call arguments;
   * we serialize them so the same exact retry collides into one counter slot.
   */
  function handleEmptyResult<T extends object>(
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
  }

  const baseTools = {
    list_tables: tool({
      description:
        'List available database tables and views that can be queried. Returns table names with brief descriptions.',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          tables: [
            {
              name: 'all_glamping_properties',
              description:
                'Glamping properties (unit-level rows). Features/amenities are many `unit_*`, `property_*`, `activities_*`, `setting_*`, `rv_*` columns — not one `amenities` field. Use `column_eq_filters` or `get_column_values` on a specific flag column.',
              row_count_estimate: 'thousands',
              category: 'Glamping',
            },
            {
              name: 'hipcamp',
              description:
                'Hipcamp listings (Glamping & RV). For **RV market / RV park** questions, prefer `campspot` and `all_roverpass_data_new` first; Hipcamp is a lower-quality secondary source for RV.',
              row_count_estimate: 'thousands',
              category: 'Glamping & RV',
            },
            {
              name: 'campspot',
              description:
                '**Primary** Sage dataset for **RV** parks and RV site supply (use with `all_roverpass_data_new` for RV market work).',
              row_count_estimate: 'thousands',
              category: 'RV',
            },
            {
              name: 'all_roverpass_data_new',
              description:
                '**Primary** Sage dataset for **RV** parks and listings (use with `campspot` for RV market work).',
              row_count_estimate: 'thousands',
              category: 'RV',
            },
            {
              name: 'reports',
              description:
                'Feasibility study reports. Key columns: title (NOT report_name), market_type / report_purpose / service (NOT project_type), property_name, client_name, state, city, status, study_id, report_date, total_sites.',
              row_count_estimate: 'hundreds',
              category: 'Reports',
            },
            {
              name: 'county-population',
              description:
                'US county population data for demographic analysis and market research',
              row_count_estimate: 'thousands',
              category: 'Demographics',
            },
            {
              name: 'ski_resorts',
              description:
                'Ski resorts and snow parks data including location, trails, lifts, and mountain attractions',
              row_count_estimate: 'hundreds',
              category: 'Attractions',
            },
            {
              name: 'national-parks',
              description:
                'National Parks data including location, acreage, visitor statistics, and park details',
              row_count_estimate: 'hundreds',
              category: 'Attractions',
            },
          ],
        };
      },
    }),

    query_properties: tool({
      description:
        'Query the all_glamping_properties table with optional filters. **Data grain:** rows are **by unit** (unit-type / unit offering at a physical **`address`**), not one row per property — the same resort may appear on multiple rows. For **property counts**, dedupe by **`address`** (trimmed); if `address` is null/empty, use **`property_name` + `city` + `state` + `country`**. **`quantity_of_units` is the authoritative per-row physical unit count** — for **any** total units, inventory, or unit-weighted calculation, **always sum `quantity_of_units`** over the result set (do not use `len(rows)` or `property_total_sites` unless the user explicitly asked for rows or sites). Returns name, location, pricing, and related fields. Use filters (state/city/country/unit_type/etc.) to narrow results. Limit defaults to 50.\n\n' +
        '**AMENITIES & FEATURES —** ' +
        GLAMPING_AMENITIES_SCHEMA_BLURB +
        ' Use `column_eq_filters` for exact matches, e.g. `[{ column: "property_pool", value: "Yes" }]`, optionally combined with `filters.state` / `filters.country`.\n\n' +
        'STATE & REGION QUERIES — use the `filters.state` field, NOT the `near` parameter. Example: { filters: { state: "Texas" } }. The `state` filter accepts both 2-letter codes ("TX") and full names ("Texas") and is normalized server-side.\n\n' +
        'PROXIMITY QUERIES — only set `near` when the user asked for results within a radius of a specific point (e.g. "within 50 km of Austin", "near Collective Retreats Vail"). When `near` is set, you MUST first call geocode_property (or have the user supply real lat/lng); NEVER hand-write coordinates and NEVER pass {latitude:0, longitude:0} as a placeholder — that is dropped server-side. You **may** combine `near` with `column_eq_filters` (e.g. amenity flags) or rate-related columns: the tool loads full `all_glamping_properties` rows for the in-radius ids and applies those filters in memory. Closest-`limit` matches from the RPC are still the candidate set before that filter, so a tight radius with many `column_eq` constraints can return 0 rows — widen the radius if needed.\n\n' +
        '**PRICING / RETAIL ADR** — each row includes `rate_avg_retail_daily_rate` and a server-computed **`effective_retail_adr`** (USD/night, two decimals). When the average is null or stale, `effective_retail_adr` uses the seasonal `rate_winter_*` / `rate_spring_*` / `rate_summer_*` / `rate_fall_*` fields when any are present (same rules as `count_unique_properties`). For questions like "any units over $X/night", prefer **`effective_retail_adr`** over `rate_avg_retail_daily_rate` alone.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z
              .string()
              .optional()
              .describe(
                'US state: 2-letter code (TX, CO) or full name (Texas, Colorado) — normalized for matching'
              ),
            city: z.string().optional().describe('City name'),
            country: z.string().optional().describe('Country (e.g., USA, Canada)'),
            unit_type: z
              .string()
              .optional()
              .describe('Type of glamping unit (e.g., cabin, yurt, tent, treehouse)'),
            property_type: z.string().optional().describe('Property type classification'),
            is_glamping_property: z
              .enum(['Yes', 'No'])
              .optional()
              .describe('Filter to glamping properties only'),
            is_closed: z.enum(['Yes', 'No']).optional().describe('Filter by open/closed status'),
          })
          .optional()
          .describe('Filters to apply to the query'),
        near: z
          .object({
            latitude: z
              .number()
              .min(-90)
              .max(90)
              .describe('Origin latitude in decimal degrees'),
            longitude: z
              .number()
              .min(-180)
              .max(180)
              .describe('Origin longitude in decimal degrees'),
            radius_km: z.number().min(1).max(500).describe('Search radius in kilometers (max 500)'),
          })
          .optional()
          .describe(
            'OPTIONAL proximity filter. ONLY include this object when the user explicitly asked for results near a coordinate, address, or named place. ' +
              'When omitted, results are filtered by `filters` only (state/city/etc). ' +
              'Do NOT pass placeholder zeros — if you do not have real coordinates, OMIT this field entirely instead of sending {latitude:0, longitude:0, radius_km:1}. ' +
              'Use geocode_property first to resolve an origin from a property name/id/address.'
          ),
        column_eq_filters: z
          .array(
            z.object({
              column: z.string().min(1).max(64),
              value: z.string().min(1).max(200),
            })
          )
          .max(30)
          .optional()
          .describe(
            'Exact `.eq` filters on allowlisted columns (amenity/activity/setting/RV flags use "Yes"/"No", e.g. property_pool, unit_hot_tub). Works with `near` after the server re-hydrates full rows for in-radius property ids.'
          ),
        columns: z
          .array(z.string())
          .optional()
          .describe(
            'Specific allowlisted columns to return. If omitted, the tool selects summary columns plus seasonal `rate_*` fields (so `effective_retail_adr` can be filled). Every row also includes `effective_retail_adr` (computed).'
          ),
        limit: z.number().min(1).max(500).optional().default(50).describe('Max rows to return'),
        offset: z.number().min(0).optional().default(0).describe('Offset for pagination'),
        order_by: z.string().optional().describe('Column to order by'),
        order_ascending: z.boolean().optional().default(true).describe('Sort direction'),
      }),
      execute: async ({
        filters,
        near,
        column_eq_filters,
        columns,
        limit,
        offset,
        order_by,
        order_ascending,
      }) => {
        // Drop empty-string filter values the model sometimes emits when it
        // "fills out" every optional slot. See `stripEmptyFilters` for why
        // this matters (an empty string would translate to `column ILIKE ''`
        // and silently match zero rows).
        filters = stripEmptyFilters(filters) as typeof filters;
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'all_glamping_properties',
          columns
        );
        const selectColumns = allowedCols.length
          ? allowedCols.join(', ')
          : PROPERTIES_QUERY_DEFAULT_SELECT.join(', ');

        const validColumnEq: Array<{ column: string; value: string }> = [];
        const rejectedColumnEq: string[] = [];
        for (const row of column_eq_filters ?? []) {
          if (!isGlampingEqFilterColumn(row.column)) {
            rejectedColumnEq.push(row.column);
            continue;
          }
          validColumnEq.push(row);
        }

        // Defensively scrub the `(0, 0)` placeholder the model sometimes emits
        // when it mistakenly thinks `near` is a required parameter. Returning
        // an error here was the original fix, but the model proved unable to
        // self-correct mid-turn and kept resending the same payload, so the
        // user saw a wall of red error tiles for what should have been a plain
        // state-filtered query. Silently dropping `near` lets us fall through
        // to the filter-only branch and actually answer the question; we tag
        // the response with `near_placeholder_dropped` so the model can learn
        // for next turn (and so we can detect the pattern in telemetry).
        let droppedNearPlaceholder = false;
        if (near && near.latitude === 0 && near.longitude === 0) {
          near = undefined;
          droppedNearPlaceholder = true;
        }

        // Proximity: `properties_within_radius` for distance-ordered ids (PostGIS),
        // then re-fetch full all_glamping_properties rows so `column_eq_filters`
        // and `filters.is_glamping_property` / `is_closed` match the non-near path.
        if (near) {
          const baseSelectCols: string[] = allowedCols.length
            ? [...allowedCols]
            : [...PROPERTIES_QUERY_DEFAULT_SELECT];
          const nearSelectSet = new Set<string>(baseSelectCols);
          for (const { column } of validColumnEq) {
            if (isGlampingEqFilterColumn(column)) {
              nearSelectSet.add(column);
            }
          }
          if (filters?.is_glamping_property) {
            nearSelectSet.add('is_glamping_property');
          }
          if (filters?.is_closed) {
            nearSelectSet.add('is_closed');
          }
          const nearSelectString = [...nearSelectSet]
            .filter((c) => (PROPERTIES_COLUMN_ALLOWLIST as readonly string[]).includes(c))
            .join(', ');

          const { data: nearRows, error: nearErr } = await supabase.rpc(
            'properties_within_radius',
            {
              lat: near.latitude,
              lng: near.longitude,
              radius_km: near.radius_km,
              limit_rows: limit ?? 50,
            }
          );
          if (nearErr) {
            return { error: nearErr.message, data: null, total_count: 0 };
          }
          const nearList = (nearRows ?? []) as Array<Record<string, unknown>>;

          const toFiniteId = (raw: unknown): number | null => {
            if (raw == null) return null;
            if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
            if (typeof raw === 'string' && /^\d+$/.test(raw)) return parseInt(raw, 10);
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          };

          const idOrder: number[] = [];
          const distanceById = new Map<number, number>();
          for (const r of nearList) {
            const id = toFiniteId(r.id);
            if (id == null) continue;
            idOrder.push(id);
            const d = r.distance_km;
            const num =
              typeof d === 'number' ? d : parseFloat(String(d ?? 'NaN'));
            distanceById.set(id, Number.isFinite(num) ? num : 0);
          }

          if (idOrder.length === 0) {
            return handleEmptyResult(
              'query_properties',
              {
                filters,
                near,
                column_eq_filters,
                columns,
                limit,
                offset,
                order_by,
                order_ascending,
              },
              {
                data: [],
                total_count: 0,
                returned_count: 0,
                limit: limit ?? 50,
                offset: 0,
                near: { ...near, unit: 'km' },
                ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
                ...(rejectedColumnEq.length ? { rejected_column_eq: rejectedColumnEq } : {}),
              },
              true,
              'Try a larger radius_km or a different origin coordinate.'
            );
          }

          const { data: fullRows, error: fullErr } = await supabase
            .from('all_glamping_properties')
            .select(nearSelectString)
            .in('id', idOrder);
          if (fullErr) {
            return { error: fullErr.message, data: null, total_count: 0 };
          }

          const byId = new Map<number, Record<string, unknown>>();
          for (const row of fullRows ?? []) {
            const r = row as Record<string, unknown>;
            const id = toFiniteId(r.id);
            if (id != null) byId.set(id, r);
          }

          let rows: Array<Record<string, unknown>> = [];
          for (const id of idOrder) {
            const base = byId.get(id);
            if (base) {
              rows.push({ ...base, distance_km: distanceById.get(id) });
            }
          }

          const matchesIlikeContains = (val: unknown, needle: string) => {
            if (val == null) return false;
            return String(val).toLowerCase().includes(needle.toLowerCase());
          };
          const matchesIlikeExact = (val: unknown, needle: string) => {
            if (val == null) return false;
            return String(val).toLowerCase() === needle.toLowerCase();
          };

          rows = rows.filter((row) => {
            if (filters) {
              if (filters.state) {
                const stateVal =
                  normalizeState(filters.state) ?? filters.state.trim();
                if (!matchesIlikeExact(row.state, stateVal)) return false;
              }
              if (filters.city && !matchesIlikeContains(row.city, filters.city)) return false;
              if (filters.country && !matchesIlikeContains(row.country, filters.country))
                return false;
              if (filters.unit_type && !matchesIlikeContains(row.unit_type, filters.unit_type))
                return false;
              if (
                filters.property_type &&
                !matchesIlikeContains(row.property_type, filters.property_type)
              )
                return false;
              if (filters.is_glamping_property) {
                if (String(row.is_glamping_property ?? '') !== filters.is_glamping_property) {
                  return false;
                }
              }
              if (filters.is_closed) {
                if (String(row.is_closed ?? '') !== filters.is_closed) return false;
              }
            }
            for (const { column, value } of validColumnEq) {
              const cell = row[column];
              if (String(cell ?? '') !== value) return false;
            }
            return true;
          });

          const distancePassthrough = ['distance_km', 'distance', 'geom'];
          const projection = allowedCols.length ? allowedCols : [...PROPERTIES_SUMMARY_COLUMNS];
          const projectionSet = new Set<string>([
            ...projection,
            ...distancePassthrough,
            ...validColumnEq.map((v) => v.column),
          ]);
          const projectedRows = rows.map((row) => {
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(row)) {
              if (projectionSet.has(key)) out[key] = row[key];
            }
            out.effective_retail_adr = effectiveGlampingRetailAdrFromRow(row);
            return out;
          });

          return handleEmptyResult(
            'query_properties',
            {
              filters,
              near,
              column_eq_filters,
              columns,
              limit,
              offset,
              order_by,
              order_ascending,
            },
            {
              data: projectedRows,
              total_count: projectedRows.length,
              returned_count: projectedRows.length,
              limit: limit ?? 50,
              offset: 0,
              near: { ...near, unit: 'km' },
              ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
              ...(rejectedColumnEq.length ? { rejected_column_eq: rejectedColumnEq } : {}),
            },
            projectedRows.length === 0,
            'Try a larger radius_km, fewer filters / column_eq constraints, or a different origin coordinate.'
          );
        }

        if (order_by && !SAFE_IDENTIFIER.test(order_by)) {
          return {
            error: `Invalid order_by column: ${order_by}`,
            data: null,
            total_count: 0,
          };
        }
        if (
          order_by &&
          !(PROPERTIES_COLUMN_ALLOWLIST as readonly string[]).includes(order_by)
        ) {
          return {
            error: `order_by column "${order_by}" is not in the allowlist for all_glamping_properties`,
            data: null,
            total_count: 0,
          };
        }

        let query = supabase
          .from('all_glamping_properties')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) {
            const stateVal =
              normalizeState(filters.state) ?? filters.state.trim();
            query = query.ilike('state', stateVal);
          }
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
          if (filters.country) query = query.ilike('country', `%${filters.country}%`);
          if (filters.unit_type) query = query.ilike('unit_type', `%${filters.unit_type}%`);
          if (filters.property_type) query = query.ilike('property_type', `%${filters.property_type}%`);
          if (filters.is_glamping_property) query = query.eq('is_glamping_property', filters.is_glamping_property);
          if (filters.is_closed) query = query.eq('is_closed', filters.is_closed);
        }
        for (const { column, value } of validColumnEq) {
          query = query.eq(column, value);
        }

        if (order_by) {
          query = query.order(order_by, { ascending: order_ascending ?? true });
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        const dataWithAdr = addEffectiveRetailAdrToPropertyRows(
          (data ?? []) as Array<Record<string, unknown>>
        );

        return handleEmptyResult(
          'query_properties',
          {
            filters,
            near,
            column_eq_filters,
            columns,
            limit,
            offset,
            order_by,
            order_ascending,
          },
          {
            data: dataWithAdr,
            total_count: count ?? 0,
            returned_count: dataWithAdr.length,
            limit: limit ?? 50,
            offset: offset ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
            ...(rejectedColumnEq.length ? { rejected_column_eq: rejectedColumnEq } : {}),
            ...(droppedNearPlaceholder
              ? {
                  near_placeholder_dropped: true,
                  note:
                    'Ignored placeholder near={latitude:0, longitude:0} and ran a state/filter-only query against all_glamping_properties. ' +
                    'For state- or country-level questions, OMIT the `near` parameter — proximity (`near`) is only for "within X km of [coordinate/place]" questions.',
                }
              : {}),
          },
          (data?.length ?? 0) === 0,
          'Try removing a filter or calling get_column_values to discover valid filter values.'
        );
      },
    }),

    query_hipcamp: tool({
      description:
        'Query Hipcamp listings (Glamping & RV). For **RV-park or RV market** questions, use `query_campspot` and `query_roverpass` first; Hipcamp is a lower-quality supplement for RV.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state - can be abbreviation (TX) or full name (Texas)'),
            city: z.string().optional().describe('City name'),
            country: z.string().optional().describe('Country'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(500).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'hipcamp',
          columns
        );
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from('hipcamp')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', `%${filters.state}%`);
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
          if (filters.country) query = query.ilike('country', `%${filters.country}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return handleEmptyResult(
          'query_hipcamp',
          { filters, columns, limit, offset },
          {
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          },
          (data?.length ?? 0) === 0,
          'Try removing a filter or broadening the location.'
        );
      },
    }),

    query_campspot: tool({
      description:
        '**Primary** tool for **RV** supply: Campspot `campspot` table. Use with `query_roverpass` for RV markets. Query without filters first to discover columns, then filter (e.g. state).',
      inputSchema: z.object({
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value filters to apply. Query without filters first to see available columns.'),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return. Leave empty to see all columns.'),
        limit: z.number().min(1).max(500).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'campspot',
          columns
        );
        const { allowed: allowedFilters, rejected: rejectedFilters } =
          validateFilterKeys('campspot', filters);
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from('campspot')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

        for (const [key, value] of Object.entries(allowedFilters)) {
          query = query.ilike(key, `%${value}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return handleEmptyResult(
          'query_campspot',
          { filters, columns, limit, offset },
          {
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
            ...(rejectedFilters.length ? { rejected_filters: rejectedFilters } : {}),
          },
          (data?.length ?? 0) === 0,
          'Run without filters first to discover available column values.'
        );
      },
    }),

    query_roverpass: tool({
      description:
        '**Primary** tool for **RV** supply: RoverPass `all_roverpass_data_new` table. Use with `query_campspot` for RV markets. Query without filters first to discover columns, then filter (e.g. state).',
      inputSchema: z.object({
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value filters to apply. Query without filters first to see available columns.'),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return. Leave empty to see all columns.'),
        limit: z.number().min(1).max(500).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'all_roverpass_data_new',
          columns
        );
        const { allowed: allowedFilters, rejected: rejectedFilters } =
          validateFilterKeys('all_roverpass_data_new', filters);
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from('all_roverpass_data_new')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

        for (const [key, value] of Object.entries(allowedFilters)) {
          query = query.ilike(key, `%${value}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return handleEmptyResult(
          'query_roverpass',
          { filters, columns, limit, offset },
          {
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
            ...(rejectedFilters.length ? { rejected_filters: rejectedFilters } : {}),
          },
          (data?.length ?? 0) === 0,
          'Run without filters first to discover available column values.'
        );
      },
    }),

    query_reports: tool({
      description:
        'Query feasibility study reports. Returns report metadata including client, location, project type and status.\n\n' +
        'IMPORTANT — column names: the report title lives in `title` (NOT `report_name`); ' +
        'the project/market category lives in `market_type` (e.g. "glamping", "RV", "hotel"), `report_purpose`, or `service` ' +
        '(NOT `project_type`). Other useful columns: `property_name`, `client_name`, `client_entity`, `resort_type`, ' +
        '`development_phase`, `study_id`, `report_date`, `total_sites`, `has_comparables`. Always pick from this list when ' +
        'specifying `columns` or filters — Postgres will reject unknown column names.',
      inputSchema: z.object({
        filters: z
          .object({
            client_id: z.string().optional().describe('Filter by client UUID'),
            client_name: z.string().optional().describe('Partial match on client_name'),
            state: z.string().optional().describe('US state abbreviation'),
            city: z.string().optional().describe('City name (partial match)'),
            title: z.string().optional().describe('Partial match on report title'),
            market_type: z
              .string()
              .optional()
              .describe('Project category (e.g. "glamping", "RV", "hotel"). Case-insensitive partial match.'),
            report_purpose: z
              .string()
              .optional()
              .describe('Reason for the report (e.g. "feasibility", "appraisal"). Partial match.'),
            service: z.string().optional().describe('Service line (partial match)'),
            status: z.string().optional().describe('Workflow status (exact match)'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe(
            'Specific columns to return. Allowed: id, client_id, client_name, client_entity, title, property_name, ' +
              'state, city, county, country, address, zip_code, market_type, report_purpose, service, ' +
              'development_phase, resort_type, resort_name, status, study_id, report_date, total_sites, ' +
              'has_comparables, comp_count, comp_unit_count, created_at, updated_at, completed_at.'
          ),
        limit: z.number().min(1).max(100).optional().default(25),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'reports',
          columns
        );
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from('reports')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 25) - 1)
          .order('created_at', { ascending: false });

        if (filters) {
          if (filters.client_id) query = query.eq('client_id', filters.client_id);
          if (filters.client_name) query = query.ilike('client_name', `%${filters.client_name}%`);
          if (filters.state) query = query.ilike('state', filters.state);
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
          if (filters.title) query = query.ilike('title', `%${filters.title}%`);
          if (filters.market_type) query = query.ilike('market_type', `%${filters.market_type}%`);
          if (filters.report_purpose)
            query = query.ilike('report_purpose', `%${filters.report_purpose}%`);
          if (filters.service) query = query.ilike('service', `%${filters.service}%`);
          if (filters.status) query = query.eq('status', filters.status);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return handleEmptyResult(
          'query_reports',
          { filters, columns, limit, offset },
          {
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          },
          (data?.length ?? 0) === 0,
          'Try removing the client_id, state, or city filter.'
        );
      },
    }),

    query_county_population: tool({
      description:
        'Query US county population data for demographic analysis. Useful for market research and understanding population density near properties.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state name or abbreviation'),
            county: z.string().optional().describe('County name'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(500).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'county-population',
          columns
        );
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from('county-population')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', `%${filters.state}%`);
          if (filters.county) query = query.ilike('county', `%${filters.county}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return handleEmptyResult(
          'query_county_population',
          { filters, columns, limit, offset },
          {
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          },
          (data?.length ?? 0) === 0,
          'Try a state-only filter, or remove the county filter.'
        );
      },
    }),

    query_ski_resorts: tool({
      description:
        'Query ski resorts and snow parks. Returns data about ski mountains including trails, lifts, location, and facilities. Use for questions about skiing, snowboarding, or mountain attractions.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state abbreviation'),
            name: z.string().optional().describe('Resort name (partial match)'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(500).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'ski_resorts',
          columns
        );
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from('ski_resorts')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', filters.state);
          if (filters.name) query = query.ilike('name', `%${filters.name}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return handleEmptyResult(
          'query_ski_resorts',
          { filters, columns, limit, offset },
          {
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          },
          (data?.length ?? 0) === 0,
          'Try a different state or remove the resort name filter.'
        );
      },
    }),

    query_national_parks: tool({
      description:
        'Query National Parks data. Returns information about US National Parks including location, acreage, visitor statistics, and park details.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state abbreviation'),
            name: z.string().optional().describe('Park name (partial match)'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'national-parks',
          columns
        );
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from('national-parks')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', `%${filters.state}%`);
          if (filters.name) query = query.ilike('name', `%${filters.name}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return handleEmptyResult(
          'query_national_parks',
          { filters, columns, limit, offset },
          {
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          },
          (data?.length ?? 0) === 0,
          'Try a different state or remove the park name filter.'
        );
      },
    }),

    count_rows: tool({
      description:
        'Get the count of rows in a table, optionally with filters. ' +
        'IMPORTANT: passing no `filters` returns the WHOLE-TABLE count — never ' +
        'narrate that number as a state/region/segment count. The result ' +
        'envelope includes a `scope` ("whole_table" | "filtered") and a ' +
        '`summary` string you must repeat verbatim (or paraphrase faithfully) ' +
        'when citing the number.\n\n' +
        'TABLE GRAIN — `all_glamping_properties`: rows are **unit-level** (unit-type lines tied to an `address`). ' +
        'This tool counts **rows**, not unique properties or total units. For "how many properties", count **distinct addresses** ' +
        '(fallback: `property_name`+`city`+`state`+`country` when `address` is empty) via `query_properties` and dedupe in your reasoning. ' +
        'For "how many units" or any **unit inventory** total on `all_glamping_properties`, you must **sum `quantity_of_units`** (or call `count_unique_properties` for `total_units`). **Never** use this tool\'s row `count` as unit count; `quantity_of_units` is the per-record unit count.',
      inputSchema: z.object({
        table: z.enum(ALLOWED_TABLES).describe('Table to count rows from'),
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value pairs for equality filters'),
      }),
      execute: async ({ table, filters }) => {
        const cleanedFilters = stripEmptyFilters(filters);
        const { allowed: allowedFilters, rejected: rejectedFilters } =
          validateFilterKeys(table, cleanedFilters);

        let query = supabase.from(table).select('*', { count: 'exact', head: true });

        for (const [key, value] of Object.entries(allowedFilters)) {
          query = query.eq(key, value);
        }

        const { count, error } = await query;

        if (error) {
          return { error: error.message, count: null };
        }

        const safeCount = count ?? 0;
        const filterEntries = Object.entries(allowedFilters);
        const scope: 'whole_table' | 'filtered' =
          filterEntries.length === 0 ? 'whole_table' : 'filtered';
        const filterPretty = filterEntries
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        const glampingGrainNote =
          table === 'all_glamping_properties'
            ? ' Unit-grain table: this is ROWS (unit-type records per address), not unique properties; for property counts use distinct `address` (or name+city+state+country fallback). For unit totals, sum `quantity_of_units`.'
            : '';

        const summary =
          scope === 'whole_table'
            ? `Counted ALL rows in ${table} (no filters applied) = ${safeCount}. ` +
              `Do NOT narrate this as a regional/state/segment count.` +
              glampingGrainNote
            : `Counted rows in ${table} where ${filterPretty} = ${safeCount}.` + glampingGrainNote;

        return {
          table,
          count: safeCount,
          filters: allowedFilters,
          scope,
          summary,
          ...(table === 'all_glamping_properties'
            ? {
                data_grain:
                  'Unit-level rows tied to `address`. `count` = database rows. Unique properties = distinct `address` (trimmed), or `property_name|city|state|country` when address missing. Units in scope = sum of `quantity_of_units`.',
              }
            : {}),
          ...(rejectedFilters.length ? { rejected_filters: rejectedFilters } : {}),
        };
      },
    }),

    get_column_values: tool({
      description:
        'Get distinct values for a column on `all_glamping_properties` (ordered by frequency). Use for `research_status`, `unit_type`, or any **allowlisted** feature column — e.g. `unit_private_bathroom` (private/ensuite bathroom on the unit), `unit_hot_tub`, `property_pool` — typically "Yes" / "No" / null. ' +
        GLAMPING_AMENITIES_SCHEMA_BLURB,
      inputSchema: z.object({
        column: z
          .string()
          .min(1)
          .max(64)
          .refine((c) => isGlampingDistinctColumn(c), {
            message:
              'Unknown or unsupported column for distinct values on all_glamping_properties (long-text / JSON columns are excluded).',
          })
          .describe('Column name (e.g. research_status, property_pool, activities_hiking).'),
        limit: z.number().min(1).max(100).optional().default(50),
      }),
      execute: async ({ column, limit }) => {
        const cap = limit ?? 50;
        const { data, error } = await supabase.rpc('distinct_column_values', {
          col: column,
          max_rows: cap,
        });

        if (error) {
          if (isAllowlistBlockedDistinctError(error.message) && isGlampingDistinctColumn(column)) {
            try {
              const { value_rows, rows_scanned, scan_truncated } =
                await scanGlampingColumnDistinctFrequencies(supabase, column, cap);
              return handleEmptyResult(
                'get_column_values',
                { column, limit },
                {
                  column,
                  values: value_rows.map((r) => r.value),
                  value_counts: value_rows,
                  total_unique: value_rows.length,
                  distinct_method: 'table_scan' as const,
                  rows_scanned,
                  ...(scan_truncated
                    ? {
                        warnings: [
                          `Distinct scan read ${rows_scanned} rows (cap ${100_000}); counts may be incomplete. Apply scripts/migrations/sage-ai-extend-glamping-allowlist-rpc.sql for server-side distincts.`,
                        ],
                      }
                    : {}),
                },
                value_rows.length === 0,
                `Column "${column}" has no non-null values in the scanned range.`
              );
            } catch (fallbackErr) {
              return {
                error: `${error.message} (fallback: ${(fallbackErr as Error).message})`,
                values: null,
              };
            }
          }
          return { error: error.message, values: null };
        }

        const rows = (data ?? []) as Array<{ value: string; row_count: number }>;
        return handleEmptyResult(
          'get_column_values',
          { column, limit },
          {
            column,
            values: rows.map((r) => r.value),
            value_counts: rows,
            total_unique: rows.length,
            distinct_method: 'rpc' as const,
          },
          rows.length === 0,
          `Column "${column}" has no distinct values. Try a different column or check that the table has data.`
        );
      },
    }),

    find_glamping_columns: tool({
      description:
        '**Team-friendly column lookup (no database access required).** Map plain-language features or questions to real `all_glamping_properties` column names. ' +
        'Call this when the user mentions amenities in conversational language ("private bath", "dog park", "waterfront", "hiking", "true glamping") and you are not 100% sure of the exact `unit_*` / `property_*` / `activities_*` / `setting_*` name. ' +
        'Returns ranked matches with `column`, human `label`, and a short `how_to_filter` string. ' +
        'After resolving the column, use `get_column_values` to see actual values, then `query_properties` with `column_eq_filters` or `aggregate_properties` with `group_by`. ' +
        `Field guide data version: ${GLAMPING_FIELD_GUIDE_VERSION}.`,
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(200)
          .describe(
            'What the user is asking for in plain language (e.g. "bathroom in the unit", "pet friendly", "on the lake", "gym on site", "RV sewer hookup").'
          ),
        max_results: z
          .number()
          .min(1)
          .max(25)
          .optional()
          .default(12)
          .describe('Max matches to return (default 12).'),
      }),
      execute: async ({ query, max_results }) => {
        const max = max_results ?? 12;
        const matches = searchFieldGuide(query, max);
        return {
          field_guide_version: GLAMPING_FIELD_GUIDE_VERSION,
          query: query.trim(),
          matches: matches.map((m) => ({
            column: m.column,
            category: m.category,
            label: m.label,
            also_known_as: m.aliases.slice(0, 8),
            how_to_filter: m.tool_tip,
            relevance: m.score,
          })),
          note:
            'These are the Sage column names. Values are often "Yes" / "No" / null — use get_column_values on the chosen `column` before filtering.',
        };
      },
    }),

    get_property_details: tool({
      description: 'Get full details for a specific property by ID or name.',
      inputSchema: z.object({
        id: z.number().optional().describe('Property ID'),
        property_name: z.string().optional().describe('Property name (partial match)'),
      }),
      execute: async ({ id, property_name }) => {
        if (!id && !property_name) {
          return { error: 'Must provide either id or property_name', data: null };
        }

        let query = supabase.from('all_glamping_properties').select('*');

        if (id) {
          query = query.eq('id', id);
        } else if (property_name) {
          query = query.ilike('property_name', `%${property_name}%`);
        }

        const { data, error } = await query.limit(5);

        if (error) {
          return { error: error.message, data: null };
        }

        return handleEmptyResult(
          'get_property_details',
          { id, property_name },
          {
            data: data ?? [],
            count: data?.length ?? 0,
          },
          (data?.length ?? 0) === 0,
          'Try a different id, or call query_properties to find candidates by name.'
        );
      },
    }),

    aggregate_properties: tool({
      description:
        'Get aggregate statistics for properties grouped by a column. Useful for summaries like "average and median rate by unit type" or breakdowns by `state`. ' +
        '**Each group includes:** **`properties`** (distinct **properties** in that group using the same dedupe key as `count_unique_properties`: trimmed lowercase `address`, else `property_name|city|state|country`), **`total_units` (sum of `quantity_of_units` — the inventory field for glamping)**, `avg_daily_rate` (**IQR-robust, unit-weighted** “normal” mean: per row **effective** ADR = average of the eight `rate_*_weekday/weekend` when any are set, else `rate_avg_retail_daily_rate` → then Tukey IQR(1.5) outlier screen per group on positive effective ADRs when the group has ≥4 rated lines and non-zero IQR, else no dropping → unit-weighted mean; if the screen would remove every line, the mean/median use all rated lines in that group), and **`median_daily_rate`** (median of those same per-row eff values after the same IQR set). **Always show both** when you narrate rate breakdowns. ' +
        '**`total_sites` is always `null` in the returned payload** (the RPC can sum `property_total_sites`, but that is a per-property, often whole-park, site count: repeating it on every unit-type row means grouped “sites” are **not** comparable to glamping **units**). **For all glamping Q&A, tables, and charts, use and label `total_units` only — never “sites” from this tool.** ' +
        'You may also `group_by` amenity / feature flag columns (e.g. `property_pool`, `unit_hot_tub`, `activities_hiking`) to see **how many properties** and units fall under each value. ' +
        '**Grain:** `all_glamping_properties` is **unit-level** (multiple rows per resort are normal); `properties` in each group is **not** a raw row count — it is how many **unique physical locations** in that group. For **unit inventory, "how many units", or any total that should reflect physical units**, use **`total_units` from this tool** (or sum `quantity_of_units` from query results) — **do not** use `property_total_sites` as a substitute for glamping unit inventory. ' +
        'IMPORTANT — country vs state: pass country names ("Canada", "Mexico", "United States") in `filters.country`, NEVER in `filters.state`. ' +
        'The `state` filter only matches US state codes/names (CO, Colorado, …) and Canadian province codes (BC, ON, AB, QC, NS, NB, MB, SK, PE, NL, YT, NT, NU). ' +
        'The result envelope echoes `applied_filters` and a `summary` string — cite those when narrating the result so you do not misattribute the slice.',
      inputSchema: z.object({
        group_by: z
          .string()
          .min(1)
          .max(64)
          .refine((c) => isGlampingGroupByColumn(c), {
            message:
              'group_by must be an allowlisted all_glamping_properties column. For amenity pivots use real column names (e.g. property_pool, unit_wifi), not "amenities".',
          })
          .describe('Column to group by (state, unit_type, property_pool, activities_hiking, …)'),
        filters: z
          .object({
            state: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            unit_type: z.string().optional(),
            property_type: z.string().optional(),
            source: z.string().optional(),
            discovery_source: z.string().optional(),
            research_status: z
              .string()
              .optional()
              .describe(
                'Push "published only" / "researched only" filters down here instead of post-filtering in Python. Call get_column_values({column:"research_status"}) first if unsure which casing is in the data.'
              ),
            is_glamping_property: z.enum(['Yes', 'No']).optional(),
            is_closed: z.enum(['Yes', 'No']).optional(),
          })
          .optional(),
      }),
      execute: async ({ group_by, filters }) => {
        // Models often "fill in every slot" with empty strings — strip those
        // before they reach the RPC, where `state ILIKE ''` would match zero
        // rows and silently kill the whole aggregation.
        const cleanedFilters = stripEmptyFilters(filters);
        const payload: Record<string, unknown> = { ...cleanedFilters };
        if (typeof payload.state === 'string' && payload.state.trim()) {
          const n = normalizeState(payload.state);
          if (n) payload.state = n;
        }

        // Catch the common "state: 'Canada'" mistake before we round-trip to
        // Postgres and return an empty result the model would then misnarrate.
        // We accept US state codes/names (handled by normalizeState above) and
        // Canadian province codes; anything else is almost certainly a country
        // name or region the caller mis-routed into `state`.
        const COUNTRY_NAMES = new Set([
          'canada', 'mexico', 'united states', 'usa', 'us', 'u.s.',
          'u.s.a.', 'united kingdom', 'uk', 'australia', 'new zealand',
          'france', 'germany', 'italy', 'spain', 'portugal', 'ireland',
          'iceland', 'norway', 'sweden', 'finland', 'denmark', 'japan',
        ]);
        const CA_PROVINCE_CODES = new Set([
          'BC', 'ON', 'AB', 'QC', 'NS', 'NB', 'MB', 'SK', 'PE', 'NL', 'YT', 'NT', 'NU',
        ]);
        if (typeof payload.state === 'string') {
          const raw = payload.state.trim();
          const upper = raw.toUpperCase();
          const lower = raw.toLowerCase();
          const looksLikeUsState =
            normalizeState(raw) !== null || raw.length > 2;
          const looksLikeCaProvince = CA_PROVINCE_CODES.has(upper);
          if (COUNTRY_NAMES.has(lower) && !looksLikeCaProvince) {
            return {
              error:
                `\`state\` filter "${raw}" is a country, not a state/province. ` +
                `Re-call aggregate_properties with filters.country="${raw}" (and drop filters.state) ` +
                `to aggregate across the whole country.`,
              aggregates: null,
              applied_filters: payload,
              hint:
                'aggregate_properties.filters.state accepts US state codes/names ' +
                '(CO, Colorado) and Canadian province codes (BC, ON, AB, QC, NS, NB, MB, SK, PE, NL, YT, NT, NU). ' +
                'Use filters.country for country-level slicing.',
            };
          }
          // Surface a soft warning for unrecognized state values — we still
          // run the query (the value might be a regional shorthand we do not
          // know about) but flag it so the model does not narrate empty
          // results as "no data" without checking the filter.
          if (!looksLikeUsState && !looksLikeCaProvince) {
            payload._state_warning = `state value "${raw}" did not match any recognized US state or Canadian province; the aggregate may return 0 groups`;
          }
        }
        const stateWarning = typeof payload._state_warning === 'string'
          ? (payload._state_warning as string)
          : null;
        if (stateWarning) delete payload._state_warning;

        const { data, error } = await supabase.rpc('aggregate_properties_v2', {
          group_by,
          filters: payload,
        });

        if (error) {
          const allowlistHint = isAllowlistBlockedDistinctError(error.message)
            ? 'If group_by is a unit_/property_/activities_/setting_ column, apply scripts/migrations/sage-ai-extend-glamping-allowlist-rpc.sql so aggregate_properties_v2 allowlists match Sage AI tools.'
            : undefined;
          return {
            error: error.message,
            aggregates: null,
            applied_filters: payload,
            ...(allowlistHint ? { hint: allowlistHint } : {}),
          };
        }

        const rows = (data ?? []) as Array<{
          key: string;
          unique_properties?: number;
          count?: number;
          avg_daily_rate: number | null;
          median_daily_rate: number | null;
          total_units: number;
          total_sites: number;
        }>;

        const aggregates = rows.map((r) => {
          const raw = r as unknown as Record<string, unknown>;
          const propertyCount = raw.unique_properties ?? raw.count;
          return {
            [group_by]: r.key,
            properties: Number(propertyCount ?? 0),
            avg_daily_rate: coerceRpcNullableNumber(raw.avg_daily_rate),
            median_daily_rate: coerceRpcNullableNumber(raw.median_daily_rate),
            total_units: Number(r.total_units),
            // Do not surface summed `property_total_sites` for glamping aggregates — it
            // double-counts across unit-type lines; inventory is `total_units` only.
            total_sites: null,
          };
        });

        const filterEntries = Object.entries(payload);
        const filterPretty = filterEntries
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(', ');
        const scope: 'whole_table' | 'filtered' =
          filterEntries.length === 0 ? 'whole_table' : 'filtered';
        const summary =
          aggregates.length === 0
            ? `Aggregated all_glamping_properties grouped by ${group_by} ` +
              (scope === 'whole_table'
                ? '(no filters)'
                : `where ${filterPretty}`) +
              ` → 0 groups. Likely the filters did not match any rows; ` +
              `verify them via get_column_values or count_rows before reporting "no data".`
            : `Aggregated all_glamping_properties grouped by ${group_by} ` +
              (scope === 'whole_table'
                ? '(no filters)'
                : `where ${filterPretty}`) +
              ` → ${aggregates.length} groups.`;

        return handleEmptyResult(
          'aggregate_properties',
          { group_by, filters },
          {
            group_by,
            aggregates,
            total_groups: aggregates.length,
            applied_filters: payload,
            scope,
            summary,
            ...(stateWarning ? { warnings: [stateWarning] } : {}),
          },
          aggregates.length === 0,
          `No groups returned for group_by="${group_by}" with filters ${
            filterPretty || '(none)'
          }. Common causes: passing a country name in filters.state ` +
            `(use filters.country instead), or filtering on a value that does not exist ` +
            `in the column (call get_column_values to enumerate valid values).`
        );
      },
    }),

    count_unique_properties: tool({
      description:
        'Server-side **distinct-property** count for `all_glamping_properties`. ' +
        'Use this whenever the user asks "how many properties / locations / resorts" — never count rows yourself, and never hand-count from a returned list. ' +
        'Dedupe key: trimmed lowercase `address`. When `address` is null/empty, falls back to `property_name|city|state|country` (also trimmed/lowercased). ' +
        '**`total_units` in the result is always the sum of `quantity_of_units`** — the authoritative physical-unit inventory for the filtered rows; never reinterpret it as row count. `avg_retail_daily_rate` / `median_retail_daily_rate` match the **same IQR(1.5) + unit-weighting + effective-ADR** rules as `aggregate_properties` (see that tool) over the filtered set. `retail_rate_outliers_dropped` counts how many **rated** unit rows were left out of the IQR “normal” set (0 when the screen was skipped or nothing dropped). **When discussing rates, cite both mean and median.**\n\n' +
        'Country goes in `filters.country` ("Canada", "United States"); state/province goes in `filters.state`. ' +
        'For "true glamping" set `filters.is_glamping_property = "Yes"` (the user usually means this). ' +
        'For "published only" / "researched only" / "verified only", push the filter down via `filters.research_status` (call `get_column_values({ column: "research_status" })` first if you do not know the exact valid values — do NOT guess "Published" vs "published"). ' +
        'Always prefer pushing a new filter into THIS tool over filtering injected `data` in Python downstream — the injected rows may not contain the column you want to filter on.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional(),
            city: z.string().optional(),
            country: z.string().optional(),
            unit_type: z.string().optional(),
            property_type: z.string().optional(),
            source: z.string().optional(),
            discovery_source: z.string().optional(),
            research_status: z.string().optional(),
            is_glamping_property: z.enum(['Yes', 'No']).optional(),
            is_closed: z.enum(['Yes', 'No']).optional(),
          })
          .optional()
          .describe(
            'Equality filters applied before deduplication. All fields here mirror PROPERTIES_FILTERABLE_COLUMNS so any slice the user describes can be pushed down server-side.'
          ),
        column_eq_filters: z
          .array(
            z.object({
              column: z.string().min(1).max(64),
              value: z.string().min(1).max(200),
            })
          )
          .max(30)
          .optional()
          .describe(
            'Additional exact `.eq` filters (e.g. property_pool=Yes). See the `query_properties` tool description for how amenity data is modeled (per-feature columns).'
          ),
      }),
      execute: async ({ filters, column_eq_filters }) => {
        const cleaned = stripEmptyFilters(filters) ?? {};
        for (const { column, value } of column_eq_filters ?? []) {
          if (!isGlampingEqFilterColumn(column)) {
            return {
              error: `Invalid column_eq_filters.column "${column}" — not an allowlisted filter column on all_glamping_properties.`,
              unique_properties: null,
              applied_filters: cleaned,
            };
          }
        }
        // Same country-vs-state defensive check the aggregate tool uses, so a
        // model mistake doesn't silently produce 0 properties.
        if (typeof cleaned.state === 'string' && cleaned.state.trim()) {
          const raw = cleaned.state.trim();
          const COUNTRY_NAMES = new Set([
            'canada', 'mexico', 'united states', 'usa', 'us',
            'u.s.', 'u.s.a.', 'united kingdom', 'uk', 'australia',
          ]);
          if (COUNTRY_NAMES.has(raw.toLowerCase())) {
            return {
              error:
                `\`state\` filter "${raw}" is a country, not a state/province. ` +
                `Re-call count_unique_properties with filters.country="${raw}".`,
              unique_properties: null,
              applied_filters: cleaned,
            };
          }
          const normalized = normalizeState(raw);
          if (normalized) cleaned.state = normalized;
        }

        // Page through results in chunks of 1000 (Supabase's default cap).
        // For typical country-level queries the unit-level row count is well
        // under 10k, so 10 pages is a hard ceiling that protects us from
        // accidentally fetching the entire table when filters are missing.
        const PAGE_SIZE = 1000;
        const MAX_PAGES = 10;
        type Row = {
          address: string | null;
          property_name: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          quantity_of_units: number | null;
          rate_avg_retail_daily_rate: number | null;
        };

        const seasonSelect = GLAMPING_SEASONAL_RATE_COLUMN_KEYS.join(', ');
        const collected: Row[] = [];
        for (let page = 0; page < MAX_PAGES; page += 1) {
          let q = supabase
            .from('all_glamping_properties')
            .select(
              `address, property_name, city, state, country, quantity_of_units, rate_avg_retail_daily_rate, ${seasonSelect}`
            )
            .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
          for (const [k, v] of Object.entries(cleaned)) {
            q = q.eq(k, v as string);
          }
          for (const { column, value } of column_eq_filters ?? []) {
            q = q.eq(column, value);
          }
          const { data, error } = await q;
          if (error) {
            return {
              error: error.message,
              unique_properties: null,
              applied_filters: cleaned,
            };
          }
          const rows = (data ?? []) as Row[];
          collected.push(...rows);
          if (rows.length < PAGE_SIZE) break;
        }

        const truncated = collected.length === MAX_PAGES * PAGE_SIZE;

        const seen = new Set<string>();
        let usedFallback = 0;
        let totalUnits = 0;
        let unitsRowsCounted = 0;
        const rateRows: RateRow[] = [];
        for (const r of collected) {
          const addr =
            typeof r.address === 'string' ? r.address.trim().toLowerCase() : '';
          let key: string;
          if (addr.length > 0) {
            key = `addr:${addr}`;
          } else {
            usedFallback += 1;
            key =
              'fb:' +
              [r.property_name, r.city, r.state, r.country]
                .map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
                .join('|');
          }
          seen.add(key);

          if (typeof r.quantity_of_units === 'number' && Number.isFinite(r.quantity_of_units)) {
            totalUnits += r.quantity_of_units;
            unitsRowsCounted += 1;
          }
          const eff = effectiveGlampingRetailAdrFromRow(r as Record<string, unknown>);
          if (eff !== null) {
            const w =
              typeof r.quantity_of_units === 'number' &&
              Number.isFinite(r.quantity_of_units) &&
              r.quantity_of_units > 0
                ? r.quantity_of_units
                : 1;
            rateRows.push({ eff, w });
          }
        }

        const filterPretty = Object.entries(cleaned)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(', ');
        const scope: 'whole_table' | 'filtered' =
          Object.keys(cleaned).length === 0 ? 'whole_table' : 'filtered';
        const robust = robustGlampingRateStats(rateRows);
        const avgRate = robust.avg;
        const medianRate = robust.median;
        const rateCount = robust.ratedCount;
        const outlierDrop = robust.droppedAsOutliers;
        const summary =
          `Counted distinct addresses in all_glamping_properties ` +
          (scope === 'whole_table' ? '(no filters)' : `where ${filterPretty}`) +
          ` → ${seen.size} unique properties from ${collected.length} unit-level rows ` +
          `(${usedFallback} used name+city+state+country fallback). ` +
          `Total units (sum quantity_of_units) = ${totalUnits} across ${unitsRowsCounted} rows. ` +
          (avgRate !== null && medianRate !== null
            ? `Robust (IQR-screened) unit-weighted avg retail daily rate = ${avgRate.toFixed(2)}; ` +
              `median = ${medianRate.toFixed(2)} across ${rateCount} rated unit rows` +
              (outlierDrop > 0
                ? ` (IQR excluded ${outlierDrop} rated line(s) from the mean/median; see retail_rate_outliers_dropped).`
                : '.')
            : `No rated rows in scope.`);

        return {
          unique_properties: seen.size,
          unit_level_rows: collected.length,
          rows_with_address: collected.length - usedFallback,
          rows_with_fallback_key: usedFallback,
          total_units: totalUnits,
          unit_rows_counted: unitsRowsCounted,
          avg_retail_daily_rate: avgRate,
          median_retail_daily_rate: medianRate,
          rated_rows_counted: rateCount,
          retail_rate_outliers_dropped: outlierDrop,
          applied_filters: cleaned,
          scope,
          truncated,
          summary,
          ...(truncated
            ? {
                warnings: [
                  `Hit page cap of ${MAX_PAGES * PAGE_SIZE} rows; counts may be undercounts. Add more filters to narrow the slice.`,
                ],
              }
            : {}),
        };
      },
    }),

    generate_python_code: tool({
      description: `Generate Python code for data analysis or visualization. The code is executed in the USER'S BROWSER using Pyodide (Python compiled to WebAssembly). Nothing runs server-side.

ALLOWED IMPORTS (everything else will be REJECTED before execution):
  - Pre-installed scientific stack: numpy (np), pandas (pd), matplotlib / matplotlib.pyplot (plt)
  - Stdlib helpers: io, base64, sys, json, math, statistics, datetime, re, collections, itertools, functools, typing, random, string, decimal, fractions

NOT AVAILABLE (do not import or attempt to use):
  - Network: urllib, requests, httpx, socket
  - Filesystem / OS: os, pathlib, subprocess, shutil
  - Plotting alternatives: seaborn, plotly, bokeh, altair (use matplotlib instead)
  - SciPy / scikit-learn / statsmodels — not preloaded

IMPORTANT RULES:
- If you need data from a previous query, use the special variable 'data' which will contain the query results as a list of dictionaries.
- When analyzing all_glamping_properties rows: quantity_of_units is the exact unit count per record — sum it for total units or unit-weighted metrics; do not substitute row count unless the user asked for row/listing counts.
- For **retail ADR / rate averages and medians**, do not re-invent the pipeline in Python: \`aggregate_properties\` and \`count_unique_properties\` already return **IQR-robust, unit-weighted** effective ADR. If you must average rates in \`data\` yourself, weight by \`quantity_of_units\` and say your number is an unaudited recompute (and prefer calling the tools instead).
- For charts, use matplotlib and call plt.show() at the end.
- Use print() for any text output you want to display.
- Execution time is bounded (~30s wall-clock); WASM cannot be hard-killed mid-computation, so avoid infinite loops or O(n^4)-style work over large arrays.
- Treat the runtime as offline and ephemeral — no network, no filesystem, no shell.

Example for creating a chart from query data:
\`\`\`python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.DataFrame(data)
df.groupby('state').size().plot(kind='bar')
plt.title('Properties by State')
plt.xlabel('State')
plt.ylabel('Count')
plt.tight_layout()
plt.show()
\`\`\``,
      inputSchema: z.object({
        code: z.string().describe('The Python code to execute'),
        description: z.string().describe('Brief description of what this code does'),
        uses_query_data: z
          .boolean()
          .optional()
          .describe('Set to true if this code needs data from a previous query tool result'),
      }),
      execute: async ({ code, description, uses_query_data }) => {
        return {
          type: 'python_code',
          code,
          description,
          uses_query_data: uses_query_data ?? false,
          message:
            'Python code generated. Click "Run" to execute it in your browser.',
        };
      },
    }),

    suggest_followups: tool({
      description: `Emit a small, structured list of follow-up questions the user might ask next. Call this AT MOST ONCE per assistant turn, after you've given the primary answer. Keep questions short, actionable, and grounded in the conversation so far.`,
      inputSchema: z.object({
        suggestions: z
          .array(
            z
              .string()
              .min(10)
              .max(140)
              .describe(
                'A short, self-contained follow-up question phrased as the user would type it.'
              )
          )
          .min(1)
          .max(5)
          .describe('1–5 follow-up prompts ordered from most to least useful.'),
      }),
      execute: async ({ suggestions }) => {
        const normalized = Array.from(
          new Set(
            suggestions
              .map((s) => s.trim().replace(/\s+/g, ' '))
              .filter((s) => s.length >= 10 && s.length <= 140)
          )
        ).slice(0, 5);
        return {
          type: 'followup_suggestions' as const,
          suggestions: normalized,
        };
      },
    }),

    /**
     * Ask the user a clarifying question with 2–6 clickable answer options.
     * The UI renders the question + options as a card with pill buttons; a
     * click sends the option text back as the next user message. Use this
     * INSTEAD of asking the question in prose whenever the answer space is
     * a small, enumerable set (yes/no, scope picker, multiple choice).
     */
    clarifying_question: tool({
      description: `Ask the user a clarifying question with 2–6 clickable answer options. Use this WHENEVER you need the user to confirm a choice, pick a scope, narrow ambiguous input, or answer a yes/no — INSTEAD of asking the question in prose. The UI renders the options as buttons; clicking one sends that exact text back as the user's next message. Only fall back to a prose question when the answer is genuinely free-form (e.g. "What's your budget?"). Call AT MOST ONCE per assistant turn and only when the question is the immediate next step in the conversation.`,
      inputSchema: z.object({
        question: z
          .string()
          .min(3)
          .max(500)
          .describe(
            'The question to ask the user. Phrase it naturally — this text is rendered verbatim above the buttons.'
          ),
        options: z
          .array(
            z
              .string()
              .min(1)
              .max(120)
              .describe(
                'A single answer option, phrased the way the user would say it (e.g. "Whole Texas, statewide" not "yes_statewide"). Sent verbatim as the next user message when clicked.'
              )
          )
          .min(2)
          .max(6)
          .describe('2–6 mutually distinct answer options, ordered from most to least likely.'),
      }),
      execute: async ({ question, options }) => {
        const normalizedOptions = Array.from(
          new Set(
            options
              .map((o) => o.trim().replace(/\s+/g, ' '))
              .filter((o) => o.length >= 1 && o.length <= 120)
          )
        ).slice(0, 6);
        return {
          type: 'clarifying_question' as const,
          question: question.trim(),
          options: normalizedOptions,
        };
      },
    }),

    // External API Tools

    google_places_search: tool({
      description:
        'Search for places using Google Places API. Useful for finding businesses, attractions, campgrounds, or any location-based information. Returns place names, addresses, ratings, and place IDs.',
      inputSchema: z.object({
        query: z.string().describe('Search query (e.g., "glamping near Austin TX", "RV parks in Colorado")'),
        location: z
          .object({
            lat: z.number().describe('Latitude'),
            lng: z.number().describe('Longitude'),
          })
          .optional()
          .describe('Optional center point for location-biased search'),
        radius: z
          .number()
          .min(1)
          .max(50000)
          .optional()
          .describe('Search radius in meters (max 50000)'),
        type: z
          .string()
          .optional()
          .describe('Place type filter (e.g., campground, lodging, rv_park, tourist_attraction)'),
      }),
      execute: async ({ query, location, radius, type }, { abortSignal }) => {
        const gate = await quotaGate('google_places_search', userId);
        if (gate) return gate;
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return { error: 'Google Places API key not configured', data: null };
        }

        try {
          const params = new URLSearchParams({
            query,
            key: apiKey,
          });

          if (location) {
            params.append('location', `${location.lat},${location.lng}`);
          }
          if (radius) {
            params.append('radius', radius.toString());
          }
          if (type) {
            params.append('type', type);
          }

          const response = await fetchWithTimeout(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
            { timeoutMs: TIMEOUT_GOOGLE_PLACES, parentSignal: abortSignal }
          );

          if (!response.ok) {
            return { error: `Google Places API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') {
            return { error: `Google Places API status: ${result.status}`, data: null };
          }

          const places = (result.results || []).slice(0, 20).map((place: {
            name: string;
            formatted_address: string;
            place_id: string;
            rating?: number;
            user_ratings_total?: number;
            types?: string[];
            geometry?: { location: { lat: number; lng: number } };
            opening_hours?: { open_now: boolean };
            price_level?: number;
          }) => ({
            name: place.name,
            address: place.formatted_address,
            place_id: place.place_id,
            rating: place.rating,
            total_ratings: place.user_ratings_total,
            types: place.types,
            location: place.geometry?.location,
            open_now: place.opening_hours?.open_now,
            price_level: place.price_level,
          }));

          return {
            data: places,
            total_count: places.length,
            query,
          };
        } catch (err) {
          return {
            error: `Failed to search places: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    google_place_details: tool({
      description: `Get detailed information about a specific place using its place_id from Google Places API. Returns reviews, contact info, hours, and more.

Allowed fields (anything outside this list is dropped to control billing tier):
${GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS.join(', ')}.`,
      inputSchema: z.object({
        place_id: z.string().min(1).max(256).describe('The Google Place ID to get details for'),
        fields: z
          .array(z.string())
          .optional()
          .describe(
            `Specific fields to return. Each entry must be one of: ${GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS.join(', ')}. Unknown fields are silently dropped. If not specified, returns the common-field default set.`
          ),
      }),
      execute: async ({ place_id, fields }, { abortSignal }) => {
        const gate = await quotaGate('google_place_details', userId);
        if (gate) return gate;
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return { error: 'Google Places API key not configured', data: null };
        }

        try {
          const defaultFields = [
            'name',
            'formatted_address',
            'formatted_phone_number',
            'website',
            'rating',
            'user_ratings_total',
            'reviews',
            'opening_hours',
            'price_level',
            'types',
            'url',
          ];

          // Filter caller-supplied fields against the allowlist. Google Places
          // bills per-field-mask, so accepting arbitrary strings means a
          // prompt-injection or buggy model could opt us into the more
          // expensive Pro/Enterprise SKU fields (Atmosphere/Contact). Track
          // rejected fields to surface them in the response for debugging.
          let appliedFields = defaultFields;
          let rejectedFields: string[] = [];
          if (fields && fields.length > 0) {
            const allowed: string[] = [];
            const rejected: string[] = [];
            const seen = new Set<string>();
            for (const f of fields) {
              const key = String(f ?? '').trim();
              if (!key || seen.has(key)) continue;
              seen.add(key);
              if ((GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS as readonly string[]).includes(key)) {
                allowed.push(key);
              } else {
                rejected.push(key);
              }
            }
            appliedFields = allowed.length > 0 ? allowed : defaultFields;
            rejectedFields = rejected;
          }

          const params = new URLSearchParams({
            place_id,
            key: apiKey,
            fields: appliedFields.join(','),
          });

          const response = await fetchWithTimeout(
            `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
            { timeoutMs: TIMEOUT_GOOGLE_PLACES, parentSignal: abortSignal }
          );

          if (!response.ok) {
            return { error: `Google Places API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          if (result.status !== 'OK') {
            return { error: `Google Places API status: ${result.status}`, data: null };
          }

          return {
            data: result.result,
            place_id,
            ...(rejectedFields.length ? { rejected_fields: rejectedFields } : {}),
          };
        } catch (err) {
          return {
            error: `Failed to get place details: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),
  };

  const webResearchTools = {
    web_search: tool({
      description:
        'Search the web using Tavily API. Useful for finding current information about glamping trends, competitor research, industry news, or any general web search. Returns relevant snippets and URLs.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        search_depth: z
          .enum(['basic', 'advanced'])
          .optional()
          .default('basic')
          .describe('Search depth - basic is faster, advanced is more thorough'),
        include_domains: z
          .array(z.string())
          .optional()
          .describe('Limit search to specific domains (e.g., ["hipcamp.com", "glamping.com"])'),
        exclude_domains: z
          .array(z.string())
          .optional()
          .describe('Exclude specific domains from results'),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe('Maximum number of results to return'),
      }),
      execute: async (
        { query, search_depth, include_domains, exclude_domains, max_results },
        { abortSignal }
      ) => {
        const gate = await quotaGate('web_search', userId);
        if (gate) return gate;
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
          return { error: 'Tavily API key not configured', data: null };
        }

        try {
          const response = await fetchWithTimeout('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            timeoutMs: TIMEOUT_TAVILY,
            parentSignal: abortSignal,
            body: JSON.stringify({
              api_key: apiKey,
              query,
              search_depth: search_depth || 'basic',
              include_domains: include_domains || [],
              exclude_domains: exclude_domains || [],
              max_results: max_results || 5,
              include_answer: true,
            }),
          });

          if (!response.ok) {
            return { error: `Tavily API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          return {
            answer: result.answer,
            results: result.results?.map((r: { title: string; url: string; content: string; score: number }) => ({
              title: r.title,
              url: r.url,
              content: r.content,
              relevance_score: r.score,
            })),
            query,
          };
        } catch (err) {
          return {
            error: `Failed to search web: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    scrape_webpage: tool({
      description:
        'Scrape content from a webpage using Firecrawl. Useful for extracting detailed information from competitor websites, property listings, or any webpage. Returns clean markdown content.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL of the webpage to scrape'),
        formats: z
          .array(z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot']))
          .optional()
          .default(['markdown'])
          .describe('Output formats to return'),
        only_main_content: z
          .boolean()
          .optional()
          .default(true)
          .describe('Extract only main content, excluding headers/footers/navs'),
        wait_for: z
          .number()
          .min(0)
          .max(30000)
          .optional()
          .describe('Milliseconds to wait for dynamic content to load'),
      }),
      execute: async (
        { url, formats, only_main_content, wait_for },
        { abortSignal }
      ) => {
        const gate = await quotaGate('scrape_webpage', userId);
        if (gate) return gate;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          const response = await fetchWithTimeout('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeoutMs: TIMEOUT_FIRECRAWL_SCRAPE,
            parentSignal: abortSignal,
            body: JSON.stringify({
              url,
              formats: formats || ['markdown'],
              onlyMainContent: only_main_content !== false,
              waitFor: wait_for,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { error: `Firecrawl API error: ${response.status} - ${errorText}`, data: null };
          }

          const result = await response.json();

          if (!result.success) {
            return { error: result.error || 'Scraping failed', data: null };
          }

          const rawMarkdown: string = result.data?.markdown ?? '';
          const content = rawMarkdown
            ? wrapUntrustedContent(url, rawMarkdown)
            : '';

          return {
            url,
            content,
            metadata: result.data?.metadata,
            links: result.data?.links,
            original_length: rawMarkdown.length,
            truncated: rawMarkdown.length > SCRAPED_CONTENT_MAX_CHARS,
          };
        } catch (err) {
          return {
            error: `Failed to scrape webpage: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    crawl_website: tool({
      description:
        'Crawl multiple pages from a website using Firecrawl. Useful for comprehensive research on a competitor or property website. Returns content from multiple pages.',
      inputSchema: z.object({
        url: z.string().url().describe('The starting URL to crawl from'),
        max_pages: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe('Maximum number of pages to crawl (max 20)'),
        include_paths: z
          .array(z.string())
          .optional()
          .describe('Only crawl pages matching these path patterns (e.g., ["/blog/*", "/properties/*"])'),
        exclude_paths: z
          .array(z.string())
          .optional()
          .describe('Exclude pages matching these path patterns'),
      }),
      execute: async (
        { url, max_pages, include_paths, exclude_paths },
        { abortSignal }
      ) => {
        const gate = await quotaGate('crawl_website', userId);
        if (gate) return gate;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          const startResponse = await fetchWithTimeout('https://api.firecrawl.dev/v1/crawl', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeoutMs: TIMEOUT_FIRECRAWL_CRAWL_KICKOFF,
            parentSignal: abortSignal,
            body: JSON.stringify({
              url,
              limit: max_pages || 5,
              includePaths: include_paths,
              excludePaths: exclude_paths,
              scrapeOptions: {
                formats: ['markdown'],
                onlyMainContent: true,
              },
            }),
          });

          if (!startResponse.ok) {
            return { error: `Firecrawl API error: ${startResponse.status}`, data: null };
          }

          const startResult = await startResponse.json();
          
          if (!startResult.success || !startResult.id) {
            return { error: 'Failed to start crawl job', data: null };
          }

          // Poll for results (with timeout)
          const crawlId = startResult.id;
          let attempts = 0;
          const maxAttempts = 30;

          while (attempts < maxAttempts) {
            // Bail early if the parent stream was cancelled — keeps polling
            // from outliving the chat turn it was started for.
            if (abortSignal?.aborted) {
              return { error: 'Crawl cancelled by client', data: null };
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const statusResponse = await fetchWithTimeout(
              `https://api.firecrawl.dev/v1/crawl/${crawlId}`,
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
                timeoutMs: TIMEOUT_FIRECRAWL_CRAWL_POLL,
                parentSignal: abortSignal,
              }
            );

            if (!statusResponse.ok) {
              return { error: `Failed to check crawl status: ${statusResponse.status}`, data: null };
            }

            const statusResult = await statusResponse.json();

            if (statusResult.status === 'completed') {
              return {
                url,
                pages_crawled: statusResult.data?.length || 0,
                pages: statusResult.data?.map(
                  (page: {
                    metadata?: { url?: string; title?: string };
                    markdown?: string;
                  }) => {
                    const pageUrl = page.metadata?.url ?? url;
                    const md = page.markdown ?? '';
                    return {
                      url: pageUrl,
                      title: page.metadata?.title,
                      content: md ? wrapUntrustedContent(pageUrl, md) : '',
                      original_length: md.length,
                      truncated: md.length > SCRAPED_CONTENT_MAX_CHARS,
                    };
                  }
                ),
              };
            }

            if (statusResult.status === 'failed') {
              return { error: 'Crawl job failed', data: null };
            }

            attempts++;
          }

          return { error: 'Crawl job timed out', data: null };
        } catch (err) {
          return {
            error: `Failed to crawl website: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),
  };

  const geoTools = context?.geoToolsEnabled
    ? createGeoTools(supabase, userId)
    : {};
  const semanticTools = context?.semanticSearchEnabled
    ? createSemanticTools(supabase, userId)
    : {};
  const composedTools = context?.composedToolsEnabled
    ? createComposedTools(supabase, {
        userId,
        userRole: context?.userRole ?? null,
      })
    : {};
  const visualizationTools = context?.visualizationToolsEnabled
    ? createVisualizationTools()
    : {};

  const toolSet = {
    ...baseTools,
    ...(context?.webResearchEnabled ? webResearchTools : {}),
    ...geoTools,
    ...semanticTools,
    ...composedTools,
    ...visualizationTools,
  };

  return wrapWithTelemetry(toolSet, telemetryCtx);
}

function wrapWithTelemetry<T extends Record<string, { execute?: unknown }>>(
  toolSet: T,
  ctx: Parameters<typeof withToolTelemetry>[1]
): T {
  if (!ctx) return toolSet;
  const wrapped: Record<string, unknown> = {};
  for (const [name, original] of Object.entries(toolSet)) {
    const originalExec = (original as { execute?: (...a: unknown[]) => Promise<unknown> }).execute;
    if (typeof originalExec !== 'function') {
      wrapped[name] = original;
      continue;
    }
    wrapped[name] = {
      ...(original as object),
      execute: withToolTelemetry(name, ctx, originalExec.bind(original)),
    };
  }
  return wrapped as T;
}

export type SageAiTools = ReturnType<typeof createSageAiTools>;
