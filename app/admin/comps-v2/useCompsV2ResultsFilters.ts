'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  compareCompsV2ResultRows,
  type CompsV2ResultsSortColumn,
} from '@/app/admin/comps-v2/comps-v2-result-helpers';
import { RESULTS_SOURCE_TABLE_FILTER_ORDER } from '@/app/admin/comps-v2/comps-v2-page-constants';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import { QUALITY_TIERS, type QualityTier } from '@/lib/comps-v2/types';
import {
  COMPS_V2_LEGEND_WEB_RESEARCH,
  COMPS_V2_WEB_GAP_SOURCE_TABLES,
} from '@/lib/comps-v2/source-marker-color';

export interface UseCompsV2ResultsFiltersParams {
  candidates: CompsV2Candidate[];
  tierLabels: Record<QualityTier, string>;
  sourceLabel: (table: string) => string;
}

export function useCompsV2ResultsFilters({
  candidates,
  tierLabels,
  sourceLabel,
}: UseCompsV2ResultsFiltersParams) {
  const [resultsSearch, setResultsSearch] = useState('');
  const [filterTiers, setFilterTiers] = useState<Set<QualityTier>>(() => new Set());
  const [filterSourceTables, setFilterSourceTables] = useState<Set<string>>(() => new Set());
  const [resultsSort, setResultsSort] = useState<{
    col: CompsV2ResultsSortColumn | null;
    asc: boolean;
  }>({ col: null, asc: true });
  const [resultsViewMode, setResultsViewMode] = useState<'list' | 'map'>('list');

  const dataSourceFilterOptions = useMemo(
    () =>
      RESULTS_SOURCE_TABLE_FILTER_ORDER.map((value) => ({
        value,
        label: sourceLabel(value),
      })),
    [sourceLabel]
  );

  const tierFilterOptions = useMemo(
    () =>
      QUALITY_TIERS.map((q) => ({
        value: q,
        label: tierLabels[q],
      })),
    [tierLabels]
  );

  const filteredCandidates = useMemo(() => {
    let list = candidates;
    const q = resultsSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const hay = `${c.property_name} ${c.city} ${c.state} ${c.location_detail ?? ''} ${c.source_table} ${sourceLabel(c.source_table)}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (filterTiers.size > 0) {
      list = list.filter((c) => c.adr_quality_tier != null && filterTiers.has(c.adr_quality_tier));
    }
    if (filterSourceTables.size > 0) {
      list = list.filter((c) => {
        if (filterSourceTables.has(c.source_table)) return true;
        return (
          filterSourceTables.has(COMPS_V2_LEGEND_WEB_RESEARCH) &&
          (COMPS_V2_WEB_GAP_SOURCE_TABLES.has(c.source_table) ||
            Boolean(c.web_research_supplement))
        );
      });
    }
    return list;
  }, [candidates, resultsSearch, filterTiers, filterSourceTables, sourceLabel]);

  const sortedFilteredCandidates = useMemo(() => {
    if (resultsSort.col == null) return filteredCandidates;
    const mult = resultsSort.asc ? 1 : -1;
    return [...filteredCandidates].sort((a, b) => {
      const cmp = compareCompsV2ResultRows(
        a,
        b,
        resultsSort.col!,
        mult,
        sourceLabel,
        tierLabels
      );
      if (cmp !== 0) return cmp;
      return a.stable_id.localeCompare(b.stable_id);
    });
  }, [filteredCandidates, resultsSort, tierLabels, sourceLabel]);

  const onResultsSortHeaderClick = useCallback((col: CompsV2ResultsSortColumn) => {
    setResultsSort((s) => (s.col === col ? { col, asc: !s.asc } : { col, asc: true }));
  }, []);

  const resetResultsUi = useCallback(() => {
    setResultsSearch('');
    setFilterTiers(new Set());
    setFilterSourceTables(new Set());
    setResultsSort({ col: null, asc: true });
    setResultsViewMode('list');
  }, []);

  return {
    resultsSearch,
    setResultsSearch,
    filterTiers,
    setFilterTiers,
    filterSourceTables,
    setFilterSourceTables,
    resultsSort,
    resultsViewMode,
    setResultsViewMode,
    dataSourceFilterOptions,
    tierFilterOptions,
    filteredCandidates,
    sortedFilteredCandidates,
    onResultsSortHeaderClick,
    resetResultsUi,
  };
}
