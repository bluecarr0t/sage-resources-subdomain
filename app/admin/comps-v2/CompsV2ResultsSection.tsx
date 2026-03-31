'use client';

import type { Dispatch, SetStateAction } from 'react';
import MultiSelect from '@/components/MultiSelect';
import CompsV2ResultsMapView from '@/components/CompsV2ResultsMapView';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import type { QualityTier } from '@/lib/comps-v2/types';
import type { CompsV2ResultsSortColumn } from '@/app/admin/comps-v2/comps-v2-result-helpers';
import CompsV2ResultsTable from '@/app/admin/comps-v2/CompsV2ResultsTable';
import { Card } from '@/components/ui';

type TCompsV2 = (key: string, values?: Record<string, string | number>) => string;

interface CompsV2ResultsSectionProps {
  t: TCompsV2;
  sourceLabel: (table: string) => string;
  candidates: CompsV2Candidate[];
  filteredCandidates: CompsV2Candidate[];
  sortedFilteredCandidates: CompsV2Candidate[];
  resultsSearch: string;
  setResultsSearch: Dispatch<SetStateAction<string>>;
  filterSourceTables: Set<string>;
  setFilterSourceTables: Dispatch<SetStateAction<Set<string>>>;
  dataSourceFilterOptions: { value: string; label: string }[];
  filterTiers: Set<QualityTier>;
  setFilterTiers: Dispatch<SetStateAction<Set<QualityTier>>>;
  tierFilterOptions: { value: QualityTier; label: string }[];
  resultsViewMode: 'list' | 'map';
  setResultsViewMode: Dispatch<SetStateAction<'list' | 'map'>>;
  resultsSort: { col: CompsV2ResultsSortColumn | null; asc: boolean };
  onResultsSortHeaderClick: (col: CompsV2ResultsSortColumn) => void;
  geocode: { lat: number; lng: number } | null;
  locationLine: string;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  tierLabels: Record<QualityTier, string>;
  summaryCurrency: Intl.NumberFormat;
}

export default function CompsV2ResultsSection({
  t,
  sourceLabel,
  candidates,
  filteredCandidates,
  sortedFilteredCandidates,
  resultsSearch,
  setResultsSearch,
  filterSourceTables,
  setFilterSourceTables,
  dataSourceFilterOptions,
  filterTiers,
  setFilterTiers,
  tierFilterOptions,
  resultsViewMode,
  setResultsViewMode,
  resultsSort,
  onResultsSortHeaderClick,
  geocode,
  locationLine,
  selected,
  toggleSelect,
  tierLabels,
  summaryCurrency,
}: CompsV2ResultsSectionProps) {
  return (
    <Card className="p-4 overflow-x-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">
          {filteredCandidates.length !== candidates.length && candidates.length > 0
            ? t('resultsPropertiesFoundWithTotal', {
                count: filteredCandidates.length,
                total: candidates.length,
              })
            : t('resultsPropertiesFound', { count: filteredCandidates.length })}
        </h2>
        <div
          className="inline-flex rounded-lg border border-gray-400 dark:border-gray-600 p-0.5 bg-gray-200 dark:bg-gray-950 shrink-0"
          role="group"
          aria-label={t('resultsViewToggleGroup')}
        >
          <button
            type="button"
            onClick={() => setResultsViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              resultsViewMode === 'list'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-gray-100'
            }`}
            aria-pressed={resultsViewMode === 'list'}
          >
            {t('resultsViewList')}
          </button>
          <button
            type="button"
            onClick={() => setResultsViewMode('map')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              resultsViewMode === 'map'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-gray-100'
            }`}
            aria-pressed={resultsViewMode === 'map'}
          >
            {t('resultsViewMap')}
          </button>
        </div>
      </div>
      {candidates.length === 0 ? (
        <p className="text-sm text-gray-500">{t('noResults')}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-end mb-4">
            <label className="text-sm flex-1 min-w-[200px] max-w-xl">
              <span className="block text-gray-600 dark:text-gray-400 mb-1">{t('resultsSearchLabel')}</span>
              <input
                type="search"
                value={resultsSearch}
                onChange={(e) => setResultsSearch(e.target.value)}
                placeholder={t('resultsSearchPlaceholder')}
                className="w-full border rounded-md px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
                autoComplete="off"
              />
            </label>
            <div className="w-full sm:w-auto sm:min-w-[12rem] sm:max-w-[18rem]">
              <MultiSelect
                id="comps-v2-results-data-source-filter"
                label={t('filterDataSourcesLabel')}
                options={dataSourceFilterOptions}
                selectedValues={[...filterSourceTables]}
                onToggle={(v) => {
                  setFilterSourceTables((prev) => {
                    const n = new Set(prev);
                    if (n.has(v)) n.delete(v);
                    else n.add(v);
                    return n;
                  });
                }}
                onClear={() => setFilterSourceTables(new Set())}
                placeholder={t('filterDataSourcesPlaceholder')}
                allSelectedText={t('filterDataSourcesAllSelected')}
                activeColor="sage"
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-[12rem] sm:max-w-[16rem]">
              <MultiSelect
                id="comps-v2-results-tier-filter"
                label={t('filterTiersLabel')}
                options={tierFilterOptions}
                selectedValues={[...filterTiers]}
                onToggle={(v) => {
                  const q = v as QualityTier;
                  setFilterTiers((prev) => {
                    const n = new Set(prev);
                    if (n.has(q)) n.delete(q);
                    else n.add(q);
                    return n;
                  });
                }}
                onClear={() => setFilterTiers(new Set())}
                placeholder={t('filterTiersPlaceholder')}
                allSelectedText={t('filterTiersAllSelected')}
                activeColor="sage"
              />
            </div>
          </div>
          {filteredCandidates.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noResultsAfterFilters')}</p>
          ) : resultsViewMode === 'map' ? (
            <CompsV2ResultsMapView
              candidates={sortedFilteredCandidates}
              searchCenter={geocode}
              searchLocationLabel={locationLine}
            />
          ) : (
            <CompsV2ResultsTable
              t={t}
              rows={sortedFilteredCandidates}
              selected={selected}
              toggleSelect={toggleSelect}
              resultsSort={resultsSort}
              onResultsSortHeaderClick={onResultsSortHeaderClick}
              tierLabels={tierLabels}
              summaryCurrency={summaryCurrency}
              sourceLabel={sourceLabel}
            />
          )}
        </>
      )}
    </Card>
  );
}
