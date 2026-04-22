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
import { normalizeState } from '@/lib/anchor-point-insights/utils';

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
  if (!userId) return null;
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

/**
 * Column allowlists per table. Keys are the canonical columns the AI is permitted
 * to reference in `select` / filter operations. For tables with volatile schemas
 * (campspot, all_roverpass_data_new) we don't enumerate columns; instead we fall
 * back to a strict identifier regex.
 */
const PROPERTIES_COLUMN_ALLOWLIST = [
  ...PROPERTIES_SUMMARY_COLUMNS,
  ...PROPERTIES_FILTERABLE_COLUMNS,
  'lat',
  'lon',
  'address',
  'zip_code',
  'description',
  'amenities',
  'pricing',
  'created_at',
  'updated_at',
] as const;

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

const REPORTS_COLUMN_ALLOWLIST = [
  'id',
  'client_id',
  'report_name',
  'state',
  'city',
  'project_type',
  'status',
  'created_at',
  'updated_at',
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
                'Glamping properties database with location, pricing, amenities, and operational data (Glamping only)',
              row_count_estimate: 'thousands',
              category: 'Glamping',
            },
            {
              name: 'hipcamp',
              description:
                'Hipcamp listings with campsite and glamping data including pricing and availability (Glamping & RV)',
              row_count_estimate: 'thousands',
              category: 'Glamping & RV',
            },
            {
              name: 'campspot',
              description:
                'Campspot RV park and campground data with site info and amenities (RV only)',
              row_count_estimate: 'thousands',
              category: 'RV',
            },
            {
              name: 'all_roverpass_data_new',
              description:
                'Roverpass RV park data with reservations, pricing, and park details (RV only)',
              row_count_estimate: 'thousands',
              category: 'RV',
            },
            {
              name: 'reports',
              description:
                'Feasibility study reports with client info, study details, and project data',
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
        'Query glamping properties with optional filters. Returns property data including name, location, pricing, and amenities. Use filters to narrow results. Limit defaults to 50.',
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
            latitude: z.number().describe('Origin latitude'),
            longitude: z.number().describe('Origin longitude'),
            radius_km: z.number().min(1).max(500).describe('Search radius in kilometers (max 500)'),
          })
          .optional()
          .describe(
            'Optional proximity filter. When provided, results are restricted to properties within radius_km of (latitude, longitude) using the property_geocode cache, ordered by distance ascending. Use geocode_property first to resolve an origin from a property name/id/address.'
          ),
        columns: z
          .array(z.string())
          .optional()
          .describe(
            'Specific columns to return. If not provided, returns summary columns: id, property_name, city, state, country, unit_type, property_type, url, property_total_sites, quantity_of_units, rate_avg_retail_daily_rate, research_status'
          ),
        limit: z.number().min(1).max(500).optional().default(50).describe('Max rows to return'),
        offset: z.number().min(0).optional().default(0).describe('Offset for pagination'),
        order_by: z.string().optional().describe('Column to order by'),
        order_ascending: z.boolean().optional().default(true).describe('Sort direction'),
      }),
      execute: async ({ filters, near, columns, limit, offset, order_by, order_ascending }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          'all_glamping_properties',
          columns
        );
        const selectColumns = allowedCols.length
          ? allowedCols.join(', ')
          : PROPERTIES_SUMMARY_COLUMNS.join(', ');

        // Proximity branch — delegates to properties_within_radius RPC so the
        // server can use the PostGIS GIST index on property_geocode.geom.
        if (near) {
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
          const rows = (nearRows ?? []) as Array<Record<string, unknown>>;

          // The RPC returns a fixed projection and ignores the `columns` arg
          // sent by the caller. To keep the contract consistent with the
          // non-near branch (which only returns allowlisted columns) and to
          // avoid leaking fields the model didn't ask for, project rows here.
          // We always preserve the distance helpers the RPC adds (`distance_km`,
          // any geometry columns) since callers rely on ordering.
          const distancePassthrough = ['distance_km', 'distance', 'geom'];
          const projection = allowedCols.length ? allowedCols : PROPERTIES_SUMMARY_COLUMNS;
          const projectionSet = new Set<string>([...projection, ...distancePassthrough]);
          const projectedRows = rows.map((row) => {
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(row)) {
              if (projectionSet.has(key)) out[key] = row[key];
            }
            return out;
          });

          return {
            data: projectedRows,
            total_count: projectedRows.length,
            returned_count: projectedRows.length,
            limit: limit ?? 50,
            offset: 0,
            near: { ...near, unit: 'km' },
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          };
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

        if (order_by) {
          query = query.order(order_by, { ascending: order_ascending ?? true });
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          limit: limit ?? 50,
          offset: offset ?? 0,
          ...(rejectedCols.length
            ? { rejected_columns: rejectedCols }
            : {}),
        };
      },
    }),

    query_hipcamp: tool({
      description:
        'Query Hipcamp listings (Glamping & RV). Returns campsite and glamping data including location, pricing, and availability.',
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

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
        };
      },
    }),

    query_campspot: tool({
      description:
        'Query Campspot RV site data. Contains RV site listings scraped from Campspot. To explore the data, first query without filters to see available columns and sample data.',
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

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          ...(rejectedFilters.length ? { rejected_filters: rejectedFilters } : {}),
        };
      },
    }),

    query_roverpass: tool({
      description:
        'Query RoverPass RV site data. Contains RV site listings scraped from RoverPass. To explore the data, first query without filters to see available columns and sample data.',
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

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
          ...(rejectedFilters.length ? { rejected_filters: rejectedFilters } : {}),
        };
      },
    }),

    query_reports: tool({
      description:
        'Query feasibility study reports. Returns report metadata including client, study details, and status.',
      inputSchema: z.object({
        filters: z
          .object({
            client_id: z.string().optional().describe('Filter by client ID'),
            state: z.string().optional().describe('US state abbreviation'),
            city: z.string().optional().describe('City name'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
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
          if (filters.state) query = query.ilike('state', filters.state);
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
        };
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

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
        };
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

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
        };
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

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
        };
      },
    }),

    count_rows: tool({
      description: 'Get the count of rows in a table, optionally with filters.',
      inputSchema: z.object({
        table: z.enum(ALLOWED_TABLES).describe('Table to count rows from'),
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value pairs for equality filters'),
      }),
      execute: async ({ table, filters }) => {
        const { allowed: allowedFilters, rejected: rejectedFilters } =
          validateFilterKeys(table, filters);

        let query = supabase.from(table).select('*', { count: 'exact', head: true });

        for (const [key, value] of Object.entries(allowedFilters)) {
          query = query.eq(key, value);
        }

        const { count, error } = await query;

        if (error) {
          return { error: error.message, count: null };
        }

        return {
          table,
          count: count ?? 0,
          filters: allowedFilters,
          ...(rejectedFilters.length ? { rejected_filters: rejectedFilters } : {}),
        };
      },
    }),

    get_column_values: tool({
      description:
        'Get distinct values for a column in the properties table. Useful for understanding what filter values are available.',
      inputSchema: z.object({
        column: z
          .enum(PROPERTIES_FILTERABLE_COLUMNS)
          .describe('Column to get distinct values for'),
        limit: z.number().min(1).max(100).optional().default(50),
      }),
      execute: async ({ column, limit }) => {
        const { data, error } = await supabase.rpc('distinct_column_values', {
          col: column,
          max_rows: limit ?? 50,
        });

        if (error) {
          return { error: error.message, values: null };
        }

        const rows = (data ?? []) as Array<{ value: string; row_count: number }>;
        return {
          column,
          values: rows.map((r) => r.value),
          value_counts: rows,
          total_unique: rows.length,
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

        return {
          data: data ?? [],
          count: data?.length ?? 0,
        };
      },
    }),

    aggregate_properties: tool({
      description:
        'Get aggregate statistics for properties grouped by a column. Useful for summaries like "count by state" or "average rate by unit type".',
      inputSchema: z.object({
        group_by: z
          .enum(PROPERTIES_FILTERABLE_COLUMNS)
          .describe('Column to group results by'),
        filters: z
          .object({
            state: z.string().optional(),
            country: z.string().optional(),
            unit_type: z.string().optional(),
            is_glamping_property: z.enum(['Yes', 'No']).optional(),
            is_closed: z.enum(['Yes', 'No']).optional(),
          })
          .optional(),
      }),
      execute: async ({ group_by, filters }) => {
        const payload: Record<string, unknown> = filters ? { ...filters } : {};
        if (typeof payload.state === 'string' && payload.state.trim()) {
          const n = normalizeState(payload.state);
          if (n) payload.state = n;
        }
        const { data, error } = await supabase.rpc('aggregate_properties_v2', {
          group_by,
          filters: payload,
        });

        if (error) {
          return { error: error.message, aggregates: null };
        }

        const rows = (data ?? []) as Array<{
          key: string;
          count: number;
          avg_daily_rate: number | null;
          total_sites: number;
        }>;

        const aggregates = rows.map((r) => ({
          [group_by]: r.key,
          count: Number(r.count),
          avg_daily_rate: r.avg_daily_rate == null ? null : Number(r.avg_daily_rate),
          total_sites: Number(r.total_sites),
        }));

        return {
          group_by,
          aggregates,
          total_groups: aggregates.length,
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
      execute: async ({ query, location, radius, type }) => {
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

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
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
      execute: async ({ place_id, fields }) => {
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

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
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
      execute: async ({ query, search_depth, include_domains, exclude_domains, max_results }) => {
        const gate = await quotaGate('web_search', userId);
        if (gate) return gate;
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
          return { error: 'Tavily API key not configured', data: null };
        }

        try {
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
      execute: async ({ url, formats, only_main_content, wait_for }) => {
        const gate = await quotaGate('scrape_webpage', userId);
        if (gate) return gate;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
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
      execute: async ({ url, max_pages, include_paths, exclude_paths }) => {
        const gate = await quotaGate('crawl_website', userId);
        if (gate) return gate;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          const startResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
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
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            });

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
