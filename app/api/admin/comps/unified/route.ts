/**
 * API Route: Paginated list / search of the unified_comps materialized view.
 * GET /api/admin/comps/unified
 *
 * Query params:
 *   search       - full-text search on search_tsv (property, overview, city, state code,
 *                  full state names, unit_type, study_id, amenity_keywords). Falls back
 *                  to ILIKE on property_name, city, overview, state when FTS returns no rows
 *                  (e.g. matview not yet refreshed with state full names).
 *   source       - comma-separated source filter: reports | all_glamping_properties |
 *                  hipcamp | campspot | all_roverpass_data_new
 *   state        - comma-separated state filter (abbreviations; expanded server-side
 *                  to match full names and casing variants in the matview)
 *   unit_category - comma-separated unit_category filter (reports source only, falls back
 *                  to unit_type ILIKE for the text-based sources)
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
 *   - `total` — site/unit rows (matview rows; one row per unit/site record).
 *   - `total_properties` — distinct `address_key` values for the same filter
 *     set (see `unified_address_key` + `unified_comps_aggregate_counts` RPC).
 *     Omitted when fuzzy search is used (distinct count is computed from fuzzy
 *     candidate ids); null if the aggregate RPC is unavailable or errors.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  parsePaginationParams,
  validateFilterValues,
  validateSearchTerms,
} from '@/lib/validate-pagination';
import {
  UNIFIED_SORT_COLUMNS,
  filterUnifiedSources,
  type UnifiedCompRow,
  type UnifiedSortKey,
} from '@/lib/comps-unified/build-row';
import {
  expandStateValuesForInQuery,
  normalizeStateToCanonicalAbbrev,
} from '@/components/map/utils/stateUtils';

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

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** PostgREST `or=(...)` value: comma/parens/spaces break parsing unless quoted. */
function postgrestOrFilterIlike(column: string, rawTerm: string): string {
  const esc = escapeIlike(rawTerm);
  const pattern = `%${esc}%`;
  if (/[,\s()]/.test(pattern)) {
    const inner = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${column}.ilike."${inner}"`;
  }
  return `${column}.ilike.${pattern}`;
}

function postgrestOrFilterEq(column: string, value: string): string {
  if (/[,\s()]/.test(value)) {
    const inner = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${column}.eq."${inner}"`;
  }
  return `${column}.eq.${value}`;
}

/**
 * Case-insensitive substring match on key columns (AND across multiple
 * `search` terms). Complements FTS when users type "texas" before matview
 * includes full state names, or mixed-case city without FTS lexeme matches.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySearchIlikeChain(q: any, terms: string[]): any {
  let out = q;
  for (const term of terms) {
    const parts = [
      postgrestOrFilterIlike('property_name', term),
      postgrestOrFilterIlike('city', term),
      postgrestOrFilterIlike('overview', term),
      postgrestOrFilterIlike('state', term),
    ];
    const abbr = normalizeStateToCanonicalAbbrev(term);
    if (abbr) {
      for (const v of expandStateValuesForInQuery([abbr])) {
        parts.push(postgrestOrFilterEq('state', v));
      }
    }
    out = out.or(parts.join(','));
  }
  return out;
}

export const GET = withAdminAuth(async (request) => {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const sources = filterUnifiedSources(
      (searchParams.get('source') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const states = validateFilterValues(
      (searchParams.get('state') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const expandedStateValues =
      states.length > 0 ? expandStateValuesForInQuery(states) : [];
    const unitCategories = validateFilterValues(
      (searchParams.get('unit_category') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const keywordFilters = validateFilterValues(
      (searchParams.get('keywords') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const minAdr = searchParams.get('min_adr');
    const maxAdr = searchParams.get('max_adr');
    const parsedMinAdr = minAdr ? parseFloat(minAdr) : null;
    const parsedMaxAdr = maxAdr ? parseFloat(maxAdr) : null;

    const sortByRaw = searchParams.get('sort_by') || 'created_at';
    const sortBy: UnifiedSortKey =
      (UNIFIED_SORT_COLUMNS as Record<string, string>)[sortByRaw]
        ? (sortByRaw as UnifiedSortKey)
        : 'created_at';
    const ascending = searchParams.get('sort_dir') === 'asc';
    const sortColumn = UNIFIED_SORT_COLUMNS[sortBy];

    const { page, perPage, from } = parsePaginationParams(searchParams);
    const to = from + perPage - 1;

    const searchTerms = validateSearchTerms(
      search
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((t) => t.toLowerCase())
    );

    // PostgREST's builder types are heavily overloaded; using a locally-typed
    // helper keeps us from triggering "Type instantiation is excessively deep"
    // while still exposing the filter methods we need.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyBaseFiltersOnly = (q: any): any => {
      let out = q;
      if (sources.length > 0) out = out.in('source', sources);
      if (expandedStateValues.length > 0) out = out.in('state', expandedStateValues);
      if (keywordFilters.length > 0) out = out.overlaps('amenity_keywords', keywordFilters);
      if (parsedMinAdr !== null && !Number.isNaN(parsedMinAdr)) {
        out = out.gte('low_adr', parsedMinAdr);
      }
      if (parsedMaxAdr !== null && !Number.isNaN(parsedMaxAdr)) {
        out = out.lte('peak_adr', parsedMaxAdr);
      }
      if (unitCategories.length > 0) {
        // reports source stores canonical unit_category; other sources have free-form
        // unit_type strings. OR across both so the filter is useful everywhere.
        const ors: string[] = [];
        for (const cat of unitCategories) {
          const esc = escapeIlike(cat);
          ors.push(`unit_category.eq.${cat}`);
          ors.push(`unit_type.ilike.%${esc}%`);
        }
        out = out.or(ors.join(','));
      }
      return out;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyBaseFiltersWithFts = (q: any): any => {
      let out = applyBaseFiltersOnly(q);
      if (searchTerms.length > 0) {
        const tsq = buildTsQuery(searchTerms);
        if (tsq) {
          // Matview uses to_tsvector('simple', ...). Use `fts` (to_tsquery), not `plfts`
          // (plainto_tsquery): the latter does not accept `:*` prefix syntax in buildTsQuery.
          out = out.textSearch('search_tsv', tsq, { config: 'simple' });
        }
      }
      return out;
    };

    const baseQuery = supabase
      .from('unified_comps')
      .select('*', { count: 'exact' });

    let query = applyBaseFiltersWithFts(baseQuery)
      .order(sortColumn, { ascending, nullsFirst: false })
      // Stable secondary key so pagination is deterministic when the primary
      // sort has ties (e.g. quality_score = 4.0 across many rows).
      .order('id', { ascending: true })
      .range(from, to);

    let { data, error, count } = await query;

    if (error) {
      console.error('[comps/unified] query error:', error);
      throw error;
    }

    let rows = (data ?? []) as UnifiedCompRow[];
    let total = count ?? rows.length;
    let fuzzyUsed = false;
    let usedIlikeFallback = false;
    let fuzzyCandidateIds: string[] = [];

    // ILIKE fallback: FTS misses "texas" vs TX, or city casing edge cases.
    if (rows.length === 0 && searchTerms.length > 0) {
      const ilikeQuery = applySearchIlikeChain(
        applyBaseFiltersOnly(supabase.from('unified_comps').select('*', { count: 'exact' })),
        searchTerms
      )
        .order(sortColumn, { ascending, nullsFirst: false })
        .order('id', { ascending: true })
        .range(from, to);
      const res2 = await ilikeQuery;
      if (res2.error) {
        console.error('[comps/unified] ilike fallback error:', res2.error);
      }
      if (!res2.error && res2.data && res2.data.length > 0) {
        rows = res2.data as UnifiedCompRow[];
        total = res2.count ?? rows.length;
        usedIlikeFallback = true;
      }
    }

    // Fuzzy fallback: exact tsvector + ILIKE missed, try trigram similarity.
    const shouldFuzzy =
      rows.length === 0 &&
      page === 1 &&
      searchTerms.length > 0 &&
      searchTerms.length <= 3 &&
      searchTerms.every((t) => t.length >= 2);

    if (shouldFuzzy) {
      const { data: fuzzyData, error: fuzzyError } = await supabase.rpc(
        'search_unified_comps_fuzzy',
        {
          p_terms: searchTerms,
          p_similarity_threshold: FUZZY_SIMILARITY_THRESHOLD,
          p_limit: FUZZY_RPC_LIMIT,
          p_sources: sources.length > 0 ? sources : null,
        }
      );

      if (!fuzzyError && Array.isArray(fuzzyData) && fuzzyData.length > 0) {
        const ids = (fuzzyData as Array<{ id: string }>)
          .map((r) => r.id)
          .filter(Boolean);
        if (ids.length > 0) {
          fuzzyCandidateIds = ids;
          const fuzzyQuery = applyBaseFiltersOnly(
            supabase.from('unified_comps').select('*')
          )
            .in('id', ids)
            .limit(perPage);
          const { data: fuzzyRows } = await fuzzyQuery;
          if (fuzzyRows && fuzzyRows.length > 0) {
            rows = fuzzyRows as UnifiedCompRow[];
            total = rows.length;
            fuzzyUsed = true;
          }
        }
      }
    }

    const tsq = buildTsQuery(searchTerms);
    const ftsApplied = searchTerms.length > 0 && !!tsq;

    let totalProperties: number | null = null;

    if (fuzzyUsed && fuzzyCandidateIds.length > 0) {
      const { data: keyRows, error: keyErr } = await supabase
        .from('unified_comps')
        .select('address_key')
        .in('id', fuzzyCandidateIds);
      if (!keyErr && keyRows && keyRows.length > 0) {
        totalProperties = new Set(
          keyRows
            .map((r: { address_key: string | null }) => r.address_key)
            .filter((k): k is string => Boolean(k))
        ).size;
      }
    } else if (!fuzzyUsed) {
      const searchMode: 'none' | 'fts' | 'ilike' =
        searchTerms.length === 0
          ? 'none'
          : usedIlikeFallback
            ? 'ilike'
            : ftsApplied
              ? 'fts'
              : 'none';

      const { data: agg, error: aggErr } = await supabase.rpc('unified_comps_aggregate_counts', {
        p_sources: sources.length > 0 ? sources : null,
        p_states: expandedStateValues.length > 0 ? expandedStateValues : null,
        p_keywords: keywordFilters.length > 0 ? keywordFilters : null,
        p_min_adr:
          parsedMinAdr !== null && !Number.isNaN(parsedMinAdr) ? parsedMinAdr : null,
        p_max_adr:
          parsedMaxAdr !== null && !Number.isNaN(parsedMaxAdr) ? parsedMaxAdr : null,
        p_unit_categories: unitCategories.length > 0 ? unitCategories : null,
        p_tsquery: searchMode === 'fts' ? tsq : null,
        p_ilike_terms: searchMode === 'ilike' ? searchTerms : null,
      });

      if (aggErr) {
        console.error('[comps/unified] aggregate counts error:', aggErr);
      } else {
        totalProperties = parseDistinctPropertyCountFromAggRpc(agg);
        if (totalProperties === null && agg != null) {
          console.warn(
            '[comps/unified] aggregate counts: could not parse RPC payload (is unified_comps_aggregate_counts deployed?)',
            { agg }
          );
        }
      }
    }

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return NextResponse.json({
      success: true,
      rows,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        total_properties: totalProperties,
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
