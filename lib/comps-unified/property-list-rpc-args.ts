import type { UnifiedFilterOptions } from '@/lib/comps-unified/apply-filters';
import type { UnifiedSortKey } from '@/lib/comps-unified/build-row';

export type UnifiedCompsSearchMode = 'none' | 'fts' | 'ilike';

/** Shared filter args for `unified_comps_list_properties` and `unified_comps_aggregate_counts`. */
export function buildUnifiedCompsFilterRpcArgs(
  opts: UnifiedFilterOptions,
  cohortRpc: Record<string, unknown>,
  searchMode: UnifiedCompsSearchMode,
  tsq: string
): Record<string, unknown> {
  return {
    p_sources: opts.sources.length > 0 ? opts.sources : null,
    p_states: opts.expandedStateValues.length > 0 ? opts.expandedStateValues : null,
    p_countries: opts.expandedCountryValues.length > 0 ? opts.expandedCountryValues : null,
    p_keywords: opts.keywordFilters.length > 0 ? opts.keywordFilters : null,
    p_min_adr:
      opts.parsedMinAdr !== null && !Number.isNaN(opts.parsedMinAdr) ? opts.parsedMinAdr : null,
    p_max_adr:
      opts.parsedMaxAdr !== null && !Number.isNaN(opts.parsedMaxAdr) ? opts.parsedMaxAdr : null,
    p_unit_categories: opts.unitCategories.length > 0 ? opts.unitCategories : null,
    p_property_types: opts.propertyTypes.length > 0 ? opts.propertyTypes : null,
    p_is_open: opts.openStatuses.length > 0 ? opts.openStatuses : null,
    p_tsquery: searchMode === 'fts' ? tsq : null,
    p_ilike_terms: searchMode === 'ilike' ? opts.searchTerms : null,
    ...cohortRpc,
  };
}

export function buildUnifiedCompsListPropertiesRpcArgs(
  filterArgs: Record<string, unknown>,
  page: number,
  perPage: number,
  sortBy: UnifiedSortKey,
  ascending: boolean
): Record<string, unknown> {
  return {
    ...filterArgs,
    p_page: page,
    p_per_page: perPage,
    p_sort_by: sortBy,
    p_sort_asc: ascending,
  };
}
