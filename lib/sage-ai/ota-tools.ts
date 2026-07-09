/**
 * Sage AI — OTA (online travel agency) listing tools.
 *
 * `query_ota` replaces the former query_hipcamp / query_campspot /
 * query_roverpass trio: one dynamic-table query tool where `source` picks the
 * flat table. `query_raw_ota_table` covers the normalized scrape-layer views.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  RAW_OTA_TABLES,
  validateColumns,
  validateFilterKeys,
  type EmptyResultHandler,
} from '@/lib/sage-ai/tool-helpers';

export const OTA_SOURCES = ['hipcamp', 'campspot', 'roverpass'] as const;
export type OtaSource = (typeof OTA_SOURCES)[number];

/** Flat table behind each `query_ota` source. */
export const OTA_SOURCE_TABLES: Record<
  OtaSource,
  'hipcamp' | 'campspot' | 'all_roverpass_data_new'
> = {
  hipcamp: 'hipcamp',
  campspot: 'campspot',
  roverpass: 'all_roverpass_data_new',
};

export function createOtaTools(
  supabase: SupabaseClient,
  handleEmptyResult: EmptyResultHandler
) {
  return {
    query_ota: tool({
      description:
        'Query flat OTA listing tables. `source` picks the dataset: "hipcamp" (table `hipcamp`), "campspot" (table `campspot`), or "roverpass" (table `all_roverpass_data_new`). ' +
        '**Campspot and RoverPass are the PRIMARY Sage datasets for RV parks and RV site supply** — for RV market size, concentration, or comparables, call this tool with source "campspot" AND source "roverpass" (both) unless the user asked for a single source. ' +
        '**Hipcamp covers Glamping & RV but is a lower-quality supplement for RV** — prefer campspot + roverpass for RV questions and cite Hipcamp as supplemental when it is the only source. ' +
        '**Do NOT pull hundreds of rows to count or average in-model** — for listing counts use `count_rows` on the underlying table; for breakdowns use `aggregate_properties` when applicable. Use `query_ota` for listings, column discovery, and drill-down. ' +
        'These tables have volatile/differing column structures: query without filters first (limit 10–20) to discover available columns and sample data, then filter (e.g. state).',
      inputSchema: z.object({
        source: z
          .enum(OTA_SOURCES)
          .describe(
            'Which OTA dataset to query: hipcamp | campspot | roverpass. Campspot + RoverPass are primary for RV; Hipcamp is a lower-quality RV supplement.'
          ),
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value filters to apply (partial match). Query without filters first to see available columns.'),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return. Leave empty to see all columns.'),
        limit: z
          .number()
          .min(1)
          .max(500)
          .optional()
          .describe('Max rows to return (default 20; 50 for source "hipcamp").'),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ source, filters, columns, limit, offset }) => {
        const table = OTA_SOURCE_TABLES[source];
        // Preserve the per-source defaults of the former dedicated tools
        // (query_hipcamp defaulted to 50; campspot/roverpass to 20).
        const effectiveLimit = limit ?? (source === 'hipcamp' ? 50 : 20);
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          table,
          columns
        );
        const { allowed: allowedFilters, rejected: rejectedFilters } =
          validateFilterKeys(table, filters);
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from(table)
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + effectiveLimit - 1);

        for (const [key, value] of Object.entries(allowedFilters)) {
          query = query.ilike(key, `%${value}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0, source, table };
        }

        return handleEmptyResult(
          'query_ota',
          { source, filters, columns, limit, offset },
          {
            source,
            table,
            data: data ?? [],
            total_count: count ?? 0,
            returned_count: data?.length ?? 0,
            ...(rejectedCols.length ? { rejected_columns: rejectedCols } : {}),
            ...(rejectedFilters.length ? { rejected_filters: rejectedFilters } : {}),
          },
          (data?.length ?? 0) === 0,
          source === 'hipcamp'
            ? 'Try removing a filter or broadening the location.'
            : 'Run without filters first to discover available column values.'
        );
      },
    }),

    query_raw_ota_table: tool({
      description:
        'Query **raw** Hipcamp or Campspot normalized scrape tables (`hipcamp_*` / `campspot_*` views). ' +
        'Use when you need site-level rows, seasonal rate tables, scrape metadata, or fields not present on the flat `hipcamp` / `campspot` tables. ' +
        'For RV market summaries and comps, prefer `query_ota` (source "campspot" / "roverpass") on the flat tables unless the user asks for raw scrape data. ' +
        'Query without filters first (limit 10–20) to discover columns, then filter.',
      inputSchema: z.object({
        table: z
          .enum(RAW_OTA_TABLES)
          .describe(
            'Raw table/view name, e.g. hipcamp_sites, campspot_siteseasonals, hipcamp_scrapings.'
          ),
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value filters (ilike partial match). Discover columns with an unfiltered sample first.'),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return. Leave empty to see all columns.'),
        limit: z.number().min(1).max(500).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ table, filters, columns, limit, offset }) => {
        const { allowed: allowedCols, rejected: rejectedCols } = validateColumns(
          table,
          columns
        );
        const { allowed: allowedFilters, rejected: rejectedFilters } =
          validateFilterKeys(table, filters);
        const selectColumns = allowedCols.length ? allowedCols.join(', ') : '*';

        let query = supabase
          .from(table)
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

        for (const [key, value] of Object.entries(allowedFilters)) {
          query = query.ilike(key, `%${value}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0, table };
        }

        return handleEmptyResult(
          'query_raw_ota_table',
          { table, filters, columns, limit, offset },
          {
            table,
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
  };
}
