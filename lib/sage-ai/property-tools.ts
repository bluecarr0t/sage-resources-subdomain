/**
 * Sage AI — property / database query tools over Sage-owned tables
 * (all_sage_data, reports, county-population, ski_resorts, national-parks)
 * plus table discovery (list_tables). Extracted from tools.ts — behavior-preserving.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
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
import { GLAMPING_IS_OPEN_VALUES } from '@/lib/glamping-is-open';
import {
  ALLOWED_TABLES,
  RAW_OTA_TABLES,
  RAW_OTA_TABLE_DESCRIPTIONS,
  PROPERTIES_COLUMN_ALLOWLIST,
  SAFE_IDENTIFIER,
  validateColumns,
  validateFilterKeys,
  stripEmptyFilters,
  coerceRpcNullableNumber,
  type EmptyResultHandler,
} from '@/lib/sage-ai/tool-helpers';

/** `all_sage_data.is_open` filter values (Yes / Under Construction / Proposed Development / Temporarily closed / Closed). */
const zGlampingIsOpen = z.enum(GLAMPING_IS_OPEN_VALUES);

/**
 * Curated projection for `get_property_details`. `all_sage_data` has ~180
 * columns (≈90 of them "Yes"/"No"/null amenity flags); `select('*')` × up to 5
 * rows blew tens of thousands of low-signal tokens into the model context on
 * every detail lookup. This is the high-signal identity / location /
 * classification / capacity / rate / description set. Amenity-level questions
 * should go through `query_properties` / `aggregate_properties`, which filter
 * on the specific flag columns server-side. `*_raw` carry the unstructured
 * amenity/activity blobs so a human-readable feature summary is still present.
 */
const PROPERTY_DETAIL_COLUMNS = [
  'id',
  'property_id',
  'brand_id',
  'property_name',
  'site_name',
  'slug',
  'property_type',
  'land_operator_category',
  'research_status',
  'is_glamping_property',
  'is_open',
  'planned_open_date',
  'address',
  'city',
  'state',
  'zip_code',
  'country',
  'lat',
  'lon',
  'property_total_sites',
  'quantity_of_units',
  'year_site_opened',
  'operating_season_months',
  'number_of_locations',
  'unit_type',
  'unit_capacity',
  'unit_sq_ft',
  'unit_description',
  'rate_avg_retail_daily_rate',
  'rate_category',
  'glamping_service_tier',
  'url',
  'phone_number',
  'description',
  'minimum_nights',
  'quality_score',
  'date_updated',
  'updated_at',
  'amenities_raw',
  'activities_raw',
  'lifestyle_raw',
].join(', ');

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
  'is_open',
  'glamping_service_tier',
] as const;
// Referenced by tool descriptions; kept as the canonical list of filter slots.
void PROPERTIES_FILTERABLE_COLUMNS;

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
  'glamping_service_tier',
  'glamping_service_tier_source',
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

export function createPropertyTools(
  supabase: SupabaseClient,
  handleEmptyResult: EmptyResultHandler
) {
  return {
    list_tables: tool({
      description:
        'List available database tables and views that can be queried. Returns table names with brief descriptions.',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          tables: [
            {
              name: 'all_sage_data',
              description:
                'Glamping properties (unit-level rows). Features/amenities are many `unit_*`, `property_*`, `activities_*`, `setting_*`, `rv_*` columns — not one `amenities` field. Use `column_eq_filters` or `get_column_values` on a specific flag column. Key columns: id, property_name, address, city, state, country, unit_type, property_type, url, property_total_sites, quantity_of_units (physical units per row — sum for inventory), rate_avg_retail_daily_rate, seasonal rate_winter_*/rate_spring_*/rate_summer_*/rate_fall_* fields, research_status, is_glamping_property, is_open. Unstructured text may appear in amenities_raw / description; many rows have lat/lon.',
              row_count_estimate: 'thousands',
              category: 'Glamping',
            },
            {
              name: 'hipcamp',
              description:
                'Hipcamp listings (Glamping & RV). For **RV market / RV park** questions, prefer `campspot` and `all_roverpass_data_new` first; Hipcamp is a lower-quality secondary source for RV. Query via `query_ota` with source "hipcamp".',
              row_count_estimate: 'thousands',
              category: 'Glamping & RV',
            },
            {
              name: 'campspot',
              description:
                '**Primary** Sage dataset for **RV** parks and RV site supply (use with `all_roverpass_data_new` for RV market work). Flat table rebuilt from raw scrape views. Query via `query_ota` with source "campspot"; query without filters first to discover columns.',
              row_count_estimate: 'thousands',
              category: 'RV',
            },
            ...RAW_OTA_TABLES.map((name) => ({
              name,
              description:
                `${RAW_OTA_TABLE_DESCRIPTIONS[name]} Query via \`query_raw_ota_table\`. For market summaries prefer the flat \`hipcamp\` / \`campspot\` tables via \`query_ota\`.`,
              row_count_estimate: 'thousands' as const,
              category: name.startsWith('hipcamp_') ? 'Hipcamp (raw)' : 'Campspot (raw)',
            })),
            {
              name: 'all_roverpass_data_new',
              description:
                '**Primary** Sage dataset for **RV** parks and listings (use with `campspot` for RV market work). Query via `query_ota` with source "roverpass"; query without filters first to discover columns.',
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
        'Query the all_sage_data table with optional filters. **Data grain:** rows are **by unit** (unit-type / unit offering at a physical **`address`**), not one row per property — the same resort may appear on multiple rows. **Do NOT use this tool for "how many", total units, or average/median rate questions** — call `count_unique_properties` or `aggregate_properties` first (server-side dedupe and unit-weighted ADR). Use `query_properties` only when the user needs row-level detail, named listings, export, or drill-down. Limit defaults to 25.\n\n' +
        'For **property counts** when you must reason about rows: dedupe by **`address`** (trimmed); if `address` is null/empty, use **`property_name` + `city` + `state` + `country`**. **`quantity_of_units` is the authoritative per-row physical unit count** — for **any** total units, inventory, or unit-weighted calculation, **always sum `quantity_of_units`** over the result set (do not use `len(rows)` or `property_total_sites` unless the user explicitly asked for rows or sites). Returns name, location, pricing, and related fields. Use filters (state/city/country/unit_type/etc.) to narrow results.\n\n' +
        '**AMENITIES & FEATURES —** ' +
        GLAMPING_AMENITIES_SCHEMA_BLURB +
        ' Use `column_eq_filters` for exact matches, e.g. `[{ column: "property_pool", value: "Yes" }]`, optionally combined with `filters.state` / `filters.country`.\n\n' +
        'STATE & REGION QUERIES — use the `filters.state` field, NOT the `near` parameter. Example: { filters: { state: "Texas" } }. The `state` filter accepts both 2-letter codes ("TX") and full names ("Texas") and is normalized server-side.\n\n' +
        'PROXIMITY QUERIES — only set `near` when the user asked for results within a radius of a specific point (e.g. "within 50 km of Austin", "near Collective Retreats Vail"). When `near` is set, you MUST first call geocode_property (or have the user supply real lat/lng); NEVER hand-write coordinates and NEVER pass {latitude:0, longitude:0} as a placeholder — that is dropped server-side. You **may** combine `near` with `column_eq_filters` (e.g. amenity flags) or rate-related columns: the tool loads full `all_sage_data` rows for the in-radius ids and applies those filters in memory. Closest-`limit` matches from the RPC are still the candidate set before that filter, so a tight radius with many `column_eq` constraints can return 0 rows — widen the radius if needed.\n\n' +
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
            is_open: zGlampingIsOpen
              .optional()
              .describe(
                'Filter by operating status: Yes = open, Under Construction = pre-opening, Proposed Development = planned site, Temporarily closed = not currently operating, Closed = not operating.'
              ),
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
        limit: z.number().min(1).max(500).optional().default(25).describe('Max rows to return (default 25; use aggregates for counts/averages)'),
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
          'all_sage_data',
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
        // then re-fetch full all_sage_data rows so `column_eq_filters`
        // and `filters.is_glamping_property` / `is_open` match the non-near path.
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
          if (filters?.is_open) {
            nearSelectSet.add('is_open');
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
          const nearList = (nearRows ?? []) as unknown as Array<Record<string, unknown>>;

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
            .from('all_sage_data')
            .select(nearSelectString)
            .in('id', idOrder);
          if (fullErr) {
            return { error: fullErr.message, data: null, total_count: 0 };
          }

          const byId = new Map<number, Record<string, unknown>>();
          for (const row of fullRows ?? []) {
            const r = row as unknown as Record<string, unknown>;
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
              if (filters.is_open) {
                if (String(row.is_open ?? '') !== filters.is_open) return false;
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
            error: `order_by column "${order_by}" is not in the allowlist for all_sage_data`,
            data: null,
            total_count: 0,
          };
        }

        let query = supabase
          .from('all_sage_data')
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
          if (filters.is_open) query = query.eq('is_open', filters.is_open);
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
          (data ?? []) as unknown as Array<Record<string, unknown>>
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
                    'Ignored placeholder near={latitude:0, longitude:0} and ran a state/filter-only query against all_sage_data. ' +
                    'For state- or country-level questions, OMIT the `near` parameter — proximity (`near`) is only for "within X km of [coordinate/place]" questions.',
                }
              : {}),
          },
          (data?.length ?? 0) === 0,
          'Try removing a filter or calling get_column_values to discover valid filter values.'
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
        'TABLE GRAIN — `all_sage_data`: rows are **unit-level** (unit-type lines tied to an `address`). ' +
        'This tool counts **rows**, not unique properties or total units. For "how many properties", count **distinct addresses** ' +
        '(fallback: `property_name`+`city`+`state`+`country` when `address` is empty) via `query_properties` and dedupe in your reasoning. ' +
        'For "how many units" or any **unit inventory** total on `all_sage_data`, you must **sum `quantity_of_units`** (or call `count_unique_properties` for `total_units`). **Never** use this tool\'s row `count` as unit count; `quantity_of_units` is the per-record unit count.',
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
          table === 'all_sage_data'
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
          ...(table === 'all_sage_data'
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
        'Get distinct values for a column on `all_sage_data` (ordered by frequency). Use for `research_status`, `unit_type`, or any **allowlisted** feature column — e.g. `unit_private_bathroom` (private/ensuite bathroom on the unit), `unit_hot_tub`, `property_pool` — typically "Yes" / "No" / null. ' +
        GLAMPING_AMENITIES_SCHEMA_BLURB,
      inputSchema: z.object({
        column: z
          .string()
          .min(1)
          .max(64)
          .refine((c) => isGlampingDistinctColumn(c), {
            message:
              'Unknown or unsupported column for distinct values on all_sage_data (long-text / JSON columns are excluded).',
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
        '**Team-friendly column lookup (no database access required).** Map plain-language features or questions to real `all_sage_data` column names. ' +
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
      description:
        'Get key details for a specific property by ID or name (identity, location, ' +
        'classification, capacity, headline rate, and description). For amenity-level ' +
        'facts (pool, hot tub, wifi, activities, settings) use query_properties / ' +
        'aggregate_properties with the specific flag columns.',
      inputSchema: z.object({
        id: z.number().optional().describe('Property ID'),
        property_name: z.string().optional().describe('Property name (partial match)'),
      }),
      execute: async ({ id, property_name }) => {
        if (!id && !property_name) {
          return { error: 'Must provide either id or property_name', data: null };
        }

        let query = supabase.from('all_sage_data').select(PROPERTY_DETAIL_COLUMNS);

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
        '**Grain:** `all_sage_data` is **unit-level** (multiple rows per resort are normal); `properties` in each group is **not** a raw row count — it is how many **unique physical locations** in that group. For **unit inventory, "how many units", or any total that should reflect physical units**, use **`total_units` from this tool** (or sum `quantity_of_units` from query results) — **do not** use `property_total_sites` as a substitute for glamping unit inventory. ' +
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
              'group_by must be an allowlisted all_sage_data column. For amenity pivots use real column names (e.g. property_pool, unit_wifi), not "amenities".',
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
            is_open: zGlampingIsOpen.optional(),
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
            ? `Aggregated all_sage_data grouped by ${group_by} ` +
              (scope === 'whole_table'
                ? '(no filters)'
                : `where ${filterPretty}`) +
              ` → 0 groups. Likely the filters did not match any rows; ` +
              `verify them via get_column_values or count_rows before reporting "no data".`
            : `Aggregated all_sage_data grouped by ${group_by} ` +
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

    top_multi_location_chains: tool({
      description:
        'Rank approximate **multi-location glamping chains / operators** using `all_sage_data`. ' +
        'Sorts by the researched **`number_of_locations`** field (brand-reported footprint, not counted from Sage rows). ' +
        'Builds a **chain label** from **`property_name`**: text before a spaced hyphen (` - `), en dash (`–`), or em dash (`—`) when present (e.g. `Brand — Outpost` → `Brand`); otherwise the full trimmed name forms its own group. ' +
        'Dedupes physical resorts with the same **`address`** key used elsewhere (else **`property_name|city|state|country`**). ' +
        'Default filters emphasize **currently open glamping** rows and treat **`establishment_filter`** + **`min_chain_age_years`** as “established” using the earliest **`year_site_opened`** seen in each chain (drops chains with no opening year when that filter is on). ' +
        'Chain names use a **known-brand prefix list** plus dash-splitting on `property_name` (re-apply the SQL migration when that list grows). ' +
        'Always distinguish **`reported_brand_locations`** (survey metadata) from **`properties_in_sage`** / **`total_glamping_units_in_sage`** (coverage in this dataset). ' +
        'Prefer this over hand-sorting `query_properties` when the user asks for biggest multi-location brands. ' +
        'Use `brand_slug` (e.g. `under-canvas`) with `include_sub_brands=true` to roll up a portfolio including sub-brands such as ULUM.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional().default(10),
        min_reported_locations: z.number().min(2).max(9999).optional().default(2),
        establishment_filter: z.boolean().optional().default(true),
        min_chain_age_years: z.number().int().min(1).max(80).optional().default(5),
        country: z
          .string()
          .max(120)
          .optional()
          .describe('Optional substring match on `country`, e.g. "United States" or "Canada".'),
        is_open: zGlampingIsOpen.optional().default('Yes'),
        is_glamping_property: z.enum(['Yes', 'No']).optional().default('Yes'),
        brand_slug: z
          .string()
          .max(80)
          .optional()
          .describe(
            'Optional `glamping_brands.slug` filter (e.g. under-canvas, ulum). When set, only that brand scope is returned.'
          ),
        include_sub_brands: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'When brand_slug is a portfolio (e.g. under-canvas), include descendant sub-brands (e.g. ulum).'
          ),
      }),
      execute: async ({
        limit: limitRaw,
        min_reported_locations: minLocRaw,
        establishment_filter: estRaw,
        min_chain_age_years: ageRaw,
        country,
        is_open: openRaw,
        is_glamping_property: glampingRaw,
        brand_slug: brandSlugRaw,
        include_sub_brands: includeSubRaw,
      }) => {
        const limit = limitRaw ?? 10;
        const min_reported_locations = minLocRaw ?? 2;
        const establishment_filter = estRaw ?? true;
        const min_chain_age_years = ageRaw ?? 5;
        const is_open = openRaw ?? 'Yes';
        const is_glamping_property = glampingRaw ?? 'Yes';
        const brand_slug = brandSlugRaw?.trim() || undefined;
        const include_sub_brands = includeSubRaw ?? false;
        const payload = {
          limit,
          min_reported_locations,
          establishment_filter,
          min_chain_age_years,
          country: country?.trim() || undefined,
          is_open,
          is_glamping_property,
          brand_slug,
          include_sub_brands,
        };
        const countryTrimmed = country?.trim() || null;
        const { data, error } = await supabase.rpc('top_multi_location_chains', {
          p_limit: limit,
          p_min_reported_locations: min_reported_locations,
          p_min_chain_age_years: establishment_filter ? min_chain_age_years : null,
          p_country: countryTrimmed,
          p_is_open: is_open,
          p_is_glamping_property: is_glamping_property,
          p_brand_slug: brand_slug ?? null,
          p_include_sub_brands: include_sub_brands,
        });

        if (error) {
          return {
            error: error.message,
            chains: null,
            hint:
              'Ensure scripts/migrations/sage-ai-top-multi-location-chains-rpc.sql is applied in Postgres ' +
              '(defines `top_multi_location_chains` + `sage_chain_label_from_property_name`).',
            applied: payload,
          };
        }

        type ChainRow = {
          chain_label: string;
          brand_slug?: string | null;
          reported_brand_locations: number | null;
          earliest_site_year: number | null;
          properties_in_sage: number;
          total_glamping_units_in_sage: number;
          sample_property_name: string | null;
          sample_city: string | null;
          sample_state: string | null;
          sample_country: string | null;
        };

        const chains = ((data ?? []) as ChainRow[]).map((r) => ({
          chain_label: r.chain_label,
          brand_slug: r.brand_slug ?? null,
          reported_brand_locations:
            r.reported_brand_locations === null ? null : Number(r.reported_brand_locations),
          earliest_site_year: r.earliest_site_year === null ? null : Number(r.earliest_site_year),
          properties_in_sage: Number(r.properties_in_sage),
          total_glamping_units_in_sage: Number(r.total_glamping_units_in_sage),
          sample_property_name: r.sample_property_name,
          sample_city: r.sample_city,
          sample_state: r.sample_state,
          sample_country: r.sample_country,
        }));

        const filterBits = [
          `is_open=${is_open}`,
          `is_glamping_property=${is_glamping_property}`,
          establishment_filter
            ? `min_chain_age_years>=${min_chain_age_years}`
            : 'establishment_filter=false',
          countryTrimmed ? `country~="${countryTrimmed}"` : null,
        ].filter(Boolean);

        const summary =
          chains.length === 0
            ? `No multi-location chains matched (${filterBits.join(', ')}). Try lowering min_chain_age_years, setting establishment_filter=false, or widening country.`
            : `Top ${chains.length} chain rollup(s) by reported brand locations (${filterBits.join(', ')}).`;

        return handleEmptyResult(
          'top_multi_location_chains',
          payload,
          {
            chains,
            summary,
            applied: payload,
          },
          chains.length === 0,
          'No chains for these filters — try establishment_filter=false, a smaller min_chain_age_years, or min_reported_locations=2 with country unset.'
        );
      },
    }),

    chain_retail_rate_kpis: tool({
      description:
        '**Brand / chain retail rate card (simple definitions).** Calls Postgres `sage_chain_retail_rate_kpis` on `all_sage_data` rows grouped by `sage_chain_label_from_property_name` (same chain keys as `top_multi_location_chains`). ' +
        'For each chain returns: **`avg_rate_all_filled_seasonal`** = unit-weighted mean of per-row **average of every non-null positive** `rate_winter_*` … `rate_fall_*` cell (same as `effectiveGlampingRetailAdrFromRow`); **`peak_summer_rate`** = unit-weighted mean of per-row **average of `rate_summer_weekday` + `rate_summer_weekend`** when either is set, else the **max** of all filled seasonal cells for that row. ' +
        'Also returns **`distinct_properties`**, **`total_unit_weight`** (sum of `GREATEST(quantity_of_units,1)`), and **`sku_row_count`**. ' +
        'Use this for end-user questions like “what is Under Canvas peak vs average rate?” — **do not** invent **calendar-year** or **`operating_season_months ÷ 12`** blends unless the user explicitly asks for annualization; those confuse readers. ' +
        'Default `chain_keys` is the five national brands: Postcard Cabins, Under Canvas, AutoCamp, Huttopia, Wander Camp (lowercased keys). ' +
        'Prefer `brand_slugs` (registry slugs, e.g. `under-canvas`) with `include_sub_brands=true` for portfolio rollups (Under Canvas + ULUM).',
      inputSchema: z.object({
        chain_keys: z
          .array(z.string().min(2).max(80))
          .max(30)
          .optional()
          .describe(
            'Optional legacy chain keys (lowercase), e.g. ["under canvas","autocamp"]. Ignored when brand_slugs is set.'
          ),
        brand_slugs: z
          .array(z.string().min(2).max(80))
          .max(20)
          .optional()
          .describe('Optional `glamping_brands.slug` values, e.g. ["under-canvas","ulum"].'),
        include_sub_brands: z
          .boolean()
          .optional()
          .default(false)
          .describe('Include descendant sub-brands when filtering by a portfolio brand_slug.'),
      }),
      execute: async ({ chain_keys, brand_slugs, include_sub_brands }) => {
        const slugs =
          brand_slugs?.map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0) ?? [];
        const rpcArgs: Record<string, unknown> = {
          p_include_sub_brands: include_sub_brands ?? false,
        };
        if (slugs.length > 0) {
          rpcArgs.p_brand_slugs = slugs;
        } else if (chain_keys && chain_keys.length > 0) {
          rpcArgs.p_chain_keys = chain_keys;
        }
        const { data, error } = await supabase.rpc('sage_chain_retail_rate_kpis', rpcArgs);

        if (error) {
          return {
            error: error.message,
            chains: null,
            hint:
              'Apply scripts/migrations/sage-chain-retail-rate-kpis-rpc.sql in Supabase (defines `sage_chain_retail_rate_kpis`).',
            applied: rpcArgs,
          };
        }

        type KpiRow = {
          chain_key: string;
          chain_label: string;
          brand_slug?: string | null;
          distinct_properties: number;
          total_unit_weight: number;
          sku_row_count: number;
          avg_rate_in_operating_season?: number | string | null;
          avg_rate_all_filled_seasonal?: number | string | null;
          peak_summer_rate: number | string | null;
        };

        const rows = ((data ?? []) as KpiRow[]).map((r) => {
          const avgRaw = r.avg_rate_in_operating_season ?? r.avg_rate_all_filled_seasonal;
          return {
            chain_key: r.chain_key,
            chain_label: r.chain_label,
            brand_slug: r.brand_slug ?? r.chain_key,
            distinct_properties: Number(r.distinct_properties),
            total_unit_weight: Number(r.total_unit_weight),
            sku_row_count: Number(r.sku_row_count),
            avg_rate_in_operating_season:
              avgRaw === null || avgRaw === '' ? null : Number(avgRaw),
            peak_summer_rate:
              r.peak_summer_rate === null || r.peak_summer_rate === ''
                ? null
                : Number(r.peak_summer_rate),
          };
        });

        const summary =
          rows.length === 0
            ? 'No rated rows matched the requested chain keys (or keys were invalid).'
            : `Chain retail KPIs for ${rows.length} chain(s): unit-weighted **avg of all filled seasonal cells** and **peak (summer avg, else max seasonal)** — see each row.`;

        return handleEmptyResult(
          'chain_retail_rate_kpis',
          rpcArgs,
          { chains: rows, summary, applied: rpcArgs },
          rows.length === 0,
          'No chain KPI rows — pass valid lowercase chain keys from sage_chain_label_from_property_name, or omit chain_keys for the default five brands.'
        );
      },
    }),

    count_unique_properties: tool({
      description:
        'Server-side **distinct-property** count for `all_sage_data`. ' +
        'Use this whenever the user asks "how many properties / locations / resorts" — never count rows yourself, and never hand-count from a returned list. ' +
        'For **named multi-brand retail rate cards** (Postcard Cabins, Under Canvas, AutoCamp, Huttopia, Wander Camp peak vs average of filled seasonal rates), call **`chain_retail_rate_kpis`** instead of inventing calendar-year blends. ' +
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
            is_open: zGlampingIsOpen.optional(),
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
        for (const { column } of column_eq_filters ?? []) {
          if (!isGlampingEqFilterColumn(column)) {
            return {
              error: `Invalid column_eq_filters.column "${column}" — not an allowlisted filter column on all_sage_data.`,
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

        // Page through the full matching set in 1000-row chunks (Supabase's
        // default cap). The table is unit-level and small (single-digit
        // thousands of rows), so paging to exhaustion is cheap. MAX_PAGES is a
        // safety valve, not an expected limit — the old fixed 10-page ceiling
        // silently under-counted any slice with >10k unit rows; `truncated`
        // is now surfaced honestly if the valve is ever hit.
        const PAGE_SIZE = 1000;
        const MAX_PAGES = 50;
        type Row = {
          address: string | null;
          property_name: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          quantity_of_units: number | null;
          rate_avg_retail_daily_rate: number | null;
        };

        // Free-text location/type columns whose stored casing/spacing may
        // differ from the user's phrasing. `query_properties` matches these
        // with case-insensitive ILIKE, so mirror it here — applying exact
        // `.eq` (as the old code did to every filter) under-counted whenever
        // e.g. city="austin" did not byte-match the stored "Austin".
        const ILIKE_SUBSTRING_FILTERS = new Set(['city', 'country', 'unit_type', 'property_type']);

        const seasonSelect = GLAMPING_SEASONAL_RATE_COLUMN_KEYS.join(', ');
        const collected: Row[] = [];
        let truncated = false;
        for (let page = 0; page < MAX_PAGES; page += 1) {
          let q = supabase
            .from('all_sage_data')
            .select(
              `address, property_name, city, state, country, quantity_of_units, rate_avg_retail_daily_rate, ${seasonSelect}`
            )
            .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
          for (const [k, v] of Object.entries(cleaned)) {
            const val = v as string;
            if (k === 'state') {
              // Already normalized above; ILIKE is case-insensitive exact match.
              q = q.ilike('state', val);
            } else if (ILIKE_SUBSTRING_FILTERS.has(k)) {
              q = q.ilike(k, `%${val}%`);
            } else {
              // source / discovery_source / research_status / is_* stay exact —
              // consistent with sibling tools and the "check get_column_values
              // for exact casing" guidance for status columns.
              q = q.eq(k, val);
            }
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
          const rows = (data ?? []) as unknown as Row[];
          collected.push(...rows);
          if (rows.length < PAGE_SIZE) break;
          if (page === MAX_PAGES - 1) truncated = true;
        }

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
          const eff = effectiveGlampingRetailAdrFromRow(r as unknown as Record<string, unknown>);
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
          `Counted distinct addresses in all_sage_data ` +
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
  };
}
