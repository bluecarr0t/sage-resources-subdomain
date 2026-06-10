/**
 * API Route: Paginated list / search of the unified_comps materialized view.
 * GET /api/admin/comps/unified
 *
 * Query params:
 *   search       - full-text search on search_tsv (property, overview, city, state code,
 *                  full state names, unit_type, study_id, amenity_keywords). Falls back
 *                  to ILIKE on property_name, city, overview, state when FTS returns no rows
 *                  (e.g. matview not yet refreshed with state full names).
 *   source       - comma-separated source filter: reports | all_sage_data |
 *                  hipcamp | campspot | all_roverpass_data_new
 *   state        - comma-separated state filter (abbreviations; expanded server-side
 *                  to match full names and casing variants in the matview)
 *   unit_category - comma-separated unit_category filter (reports source only, falls back
 *                  to unit_type ILIKE for the text-based sources)
 *   property_type - comma-separated Sage property_type filter (e.g. Glamping Resort)
 *   keywords     - comma-separated amenity_keywords filter (array overlap)
 *   min_adr / max_adr - ADR range filter
 *   sort_by      - property_name | state | total_sites | quality_score | low_adr |
 *                  peak_adr | created_at (default: created_at desc)
 *   sort_dir     - asc | desc
 *   page, per_page
 *
 * All filtering / sorting / pagination runs at the DB level against the indexes
 * defined in `scripts/migrations/unified-comps-matview.sql`, so even a table of
 * millions of rows returns the first page in well under 100ms.
 *
 * Pagination metadata:
 *   - `total` — distinct properties (one row per source + address_key in the list).
 *   - `total_site_units` — Sage-only: sum of quantity_of_units / property_total_sites
 *     (glamping market overview rules). Other sources: matview row count.
 *   - `total_properties` — same as `total` when the aggregate RPC succeeds.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parsePaginationParams } from '@/lib/validate-pagination';
import {
  UNIFIED_SORT_COLUMNS,
  isSageOnlyUnifiedSourceFilter,
  type UnifiedCompRow,
  type UnifiedSortKey,
} from '@/lib/comps-unified/build-row';
import { countSageMarketSnapshotSiteUnits } from '@/lib/comps-unified/count-sage-market-snapshot-site-units';
import {
  adminCompsCohortRpcParams,
  withAdminCompsCohortFilters,
} from '@/lib/comps-unified/admin-comps-cohort';
import {
  parseUnifiedFilterOptions,
  applyUnifiedBaseFilters,
} from '@/lib/comps-unified/apply-filters';
import { collapseUnifiedCompRowsToProperties } from '@/lib/comps-unified/collapse-property-rows';
import { mapPropertyListRpcToUnifiedRows } from '@/lib/comps-unified/map-property-list-rpc';
import {
  buildUnifiedCompsFilterRpcArgs,
  buildUnifiedCompsListPropertiesRpcArgs,
  type UnifiedCompsSearchMode,
} from '@/lib/comps-unified/property-list-rpc-args';

const FUZZY_SIMILARITY_THRESHOLD = 0.4;
const FUZZY_RPC_LIMIT = 500;

/** Normalize PostgREST RPC payload for `unified_comps_aggregate_counts` (array or single row; bigint as string). */
function parseDistinctPropertyCountFromAggRpc(data: unknown): number | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const raw = r.distinct_address_count ?? r.distinctAddressCount;
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Build a plain tsquery string from a list of terms (AND-combined). */
function buildTsQuery(terms: string[]): string {
  return terms
    .map((t) => t.replace(/[^a-z0-9]/gi, ' ').trim())
    .filter(Boolean)
    .map((t) => `${t}:*`)
    .join(' & ');
}

export const GET = withAdminAuth(async (request) => {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const opts = withAdminCompsCohortFilters(parseUnifiedFilterOptions(searchParams));
    const cohortRpc = adminCompsCohortRpcParams();

    const sortByRaw = searchParams.get('sort_by') || 'created_at';
    const sortBy: UnifiedSortKey =
      (UNIFIED_SORT_COLUMNS as Record<string, string>)[sortByRaw]
        ? (sortByRaw as UnifiedSortKey)
        : 'created_at';
    const ascending = searchParams.get('sort_dir') === 'asc';

    const { page, perPage } = parsePaginationParams(searchParams);

    const applyBaseFiltersOnly = (q: any): any => applyUnifiedBaseFilters(q, opts);

    const tsq = buildTsQuery(opts.searchTerms);
    const ftsApplied = opts.searchTerms.length > 0 && !!tsq;

    let rows: UnifiedCompRow[] = [];
    let totalSiteUnits = 0;
    let totalProperties: number | null = null;
    let fuzzyUsed = false;
    let usedIlikeFallback = false;
    let fuzzyCandidateIds: string[] = [];

    const shouldFuzzy =
      opts.searchTerms.length > 0 &&
      opts.searchTerms.length <= 3 &&
      opts.searchTerms.every((t) => t.length >= 2);

    async function loadPropertyPage(
      searchMode: UnifiedCompsSearchMode
    ): Promise<{ listRows: UnifiedCompRow[]; siteUnits: number; properties: number | null }> {
      const filterArgs = buildUnifiedCompsFilterRpcArgs(opts, cohortRpc, searchMode, tsq);
      const listArgs = buildUnifiedCompsListPropertiesRpcArgs(
        filterArgs,
        page,
        perPage,
        sortBy,
        ascending
      );

      const [listResult, aggResult] = await Promise.all([
        supabase.rpc('unified_comps_list_properties', listArgs),
        supabase.rpc('unified_comps_aggregate_counts', filterArgs),
      ]);

      const { data: listData, error: listErr } = listResult;

      if (listErr) {
        console.error('[comps/unified] unified_comps_list_properties RPC failed:', listErr.message);
        throw new Error(
          listErr.message.includes('unified_comps')
            ? 'Unified comps index is unavailable. Run refresh:downstream or apply the unified_comps matview migration.'
            : listErr.message
        );
      }

      const listRows = mapPropertyListRpcToUnifiedRows(listData);

      const { data: agg, error: aggErr } = aggResult;

      let siteUnits = 0;
      let properties: number | null = null;
      if (!aggErr && agg != null) {
        const aggRow = Array.isArray(agg) ? agg[0] : agg;
        if (aggRow && typeof aggRow === 'object') {
          const r = aggRow as Record<string, unknown>;
          const rawRows = r.row_count ?? r.rowCount;
          const rawProps = r.distinct_address_count ?? r.distinctAddressCount;
          const nRows = typeof rawRows === 'number' ? rawRows : Number(rawRows);
          const nProps = typeof rawProps === 'number' ? rawProps : Number(rawProps);
          if (Number.isFinite(nRows)) siteUnits = nRows;
          if (Number.isFinite(nProps)) properties = nProps;
        }
      } else if (aggErr) {
        console.error('[comps/unified] aggregate counts error:', aggErr);
      }

      return { listRows, siteUnits, properties };
    }

    const initialSearchMode: 'none' | 'fts' =
      opts.searchTerms.length === 0 ? 'none' : 'fts';
    let primary = await loadPropertyPage(initialSearchMode);
    if (primary.listRows.length === 0 && opts.searchTerms.length > 0) {
      usedIlikeFallback = true;
      primary = await loadPropertyPage('ilike');
    }

    rows = primary.listRows;
    totalSiteUnits = primary.siteUnits;
    totalProperties = primary.properties;

    if (isSageOnlyUnifiedSourceFilter(opts.sources) && opts.searchTerms.length === 0) {
      totalSiteUnits = await countSageMarketSnapshotSiteUnits(supabase, opts);
    }

    if (rows.length === 0 && shouldFuzzy && page === 1) {
      const { data: fuzzyData, error: fuzzyError } = await supabase.rpc(
        'search_unified_comps_fuzzy',
        {
          p_terms: opts.searchTerms,
          p_similarity_threshold: FUZZY_SIMILARITY_THRESHOLD,
          p_limit: FUZZY_RPC_LIMIT,
          p_sources: opts.sources.length > 0 ? opts.sources : null,
        }
      );

      if (!fuzzyError && Array.isArray(fuzzyData) && fuzzyData.length > 0) {
        const ids = (fuzzyData as Array<{ id: string }>)
          .map((r) => r.id)
          .filter(Boolean);
        if (ids.length > 0) {
          fuzzyCandidateIds = ids;
          const { data: fuzzyRows } = await applyBaseFiltersOnly(
            supabase.from('unified_comps').select('*')
          ).in('id', ids);
          if (fuzzyRows && fuzzyRows.length > 0) {
            const collapsed = collapseUnifiedCompRowsToProperties(fuzzyRows as UnifiedCompRow[]);
            const from = (page - 1) * perPage;
            rows = collapsed.slice(from, from + perPage);
            totalProperties = collapsed.length;
            totalSiteUnits = fuzzyRows.length;
            fuzzyUsed = true;
          }
        }
      }
    }

    const total =
      totalProperties ??
      (fuzzyUsed ? rows.length : Math.max(rows.length, 0));
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return NextResponse.json({
      success: true,
      rows,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        total_site_units: totalSiteUnits || null,
        total_properties: totalProperties ?? total,
        fuzzy: fuzzyUsed,
      },
    });
  } catch (err) {
    console.error('[comps/unified] error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch unified comps' },
      { status: 500 }
    );
  }
});
