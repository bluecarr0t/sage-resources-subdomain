'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useMapContext } from '../MapContext';
import { filterParksWithCoordinates, NationalPark } from '@/lib/types/national-parks';
import { getChangeRanges } from '@/lib/maps/county-boundaries';
import { useFilterComputations } from './hooks/useFilterComputations';

const MultiSelect = dynamic(() => import('../MultiSelect'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-10 rounded" />,
});

interface FilterSidebarProps {
  nationalParks: NationalPark[];
  populationLoading: boolean;
  gdpLoading: boolean;
  isMobile: boolean;
}

export default function FilterSidebar({
  nationalParks,
  populationLoading,
  gdpLoading,
  isMobile,
}: FilterSidebarProps) {
  const {
    filterCountry,
    filterState,
    filterUnitType,
    filterRateRange,
    showNationalParks,
    showClientWork,
    clientWorkPoints,
    clientWorkPointsLoading,
    selectedMapLayer,
    hasActiveFilters,
    propertiesLoading: loading,
    allProperties,
    setFilterCountry,
    setFilterState,
    setFilterUnitType,
    setFilterRateRange,
    toggleState,
    toggleUnitType,
    toggleRateRange,
    toggleNationalParks,
    toggleClientWork,
    setMapLayer,
    clearFilters,
  } = useMapContext();

  const t = useTranslations('map');

  const {
    uniqueStates,
    stateCounts,
    calculatedDisplayedCount,
    countryCounts,
    availableUnitTypes,
    unitTypeCounts,
    availableRateCategories,
    rateCategoryCounts,
  } = useFilterComputations({
    allProperties,
    filterCountry,
    filterState,
    filterUnitType,
    filterRateRange,
  });

  const countryFilterOptions = useMemo(() => {
    const keys = Object.keys(countryCounts).filter((value) => (countryCounts[value] || 0) > 0);
    const us = 'United States';
    const ca = 'Canada';
    const rest = keys
      .filter((k) => k !== us && k !== ca)
      .sort((a, b) => a.localeCompare(b));
    const ordered = [...(keys.includes(us) ? [us] : []), ...(keys.includes(ca) ? [ca] : []), ...rest];
    return ordered.map((value) => ({
      value,
      label: `${value} (${countryCounts[value] || 0})`,
    }));
  }, [countryCounts]);

  const countryOptionValues = useMemo(() => countryFilterOptions.map((o) => o.value), [countryFilterOptions]);

  const countrySelectedValues =
    filterCountry.length === 0 ? countryOptionValues : filterCountry.filter((c) => countryOptionValues.includes(c));

  const handleCountryToggle = useCallback(
    (country: string) => {
      setFilterCountry((prev) => {
        if (prev.length === 0) {
          const next = countryOptionValues.filter((c) => c !== country);
          return next.length === 0 ? [] : next;
        }
        if (prev.includes(country)) {
          const next = prev.filter((c) => c !== country);
          return next.length === 0 ? [] : next;
        }
        const next = [...prev, country];
        if (countryOptionValues.length > 0 && next.length === countryOptionValues.length) return [];
        return next;
      });
      setFilterState([]);
    },
    [countryOptionValues, setFilterCountry, setFilterState]
  );

  const handleCountryClear = useCallback(() => {
    setFilterCountry([]);
    setFilterState([]);
  }, [setFilterCountry, setFilterState]);

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const filtersSectionRef = useRef<HTMLDivElement>(null);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (calculatedDisplayedCount !== displayedCount && calculatedDisplayedCount > 0) {
      setIsAnimating(true);
      setDisplayedCount(calculatedDisplayedCount);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [calculatedDisplayedCount, displayedCount]);

  return (
    <div className="w-full space-y-3 md:space-y-4">
      {/* Mobile-Optimized Header: Property Count + Filter Button on Same Row */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3 rounded-md border border-stone-200/90 bg-white px-3 py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            <span
              key={displayedCount}
              className={`text-xl font-semibold tabular-nums leading-none text-[#3B82F6] transition-all duration-500 ease-in-out relative inline-block whitespace-nowrap ${
                isAnimating ? 'scale-[1.02] opacity-80' : 'scale-100 opacity-100'
              }`}
            >
              <span className={loading ? 'opacity-50' : ''}>{displayedCount}</span>
              {loading && (
                <span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/70 to-transparent animate-shimmer pointer-events-none"
                  aria-label="Loading property count"
                />
              )}
            </span>
            <span
              className={`text-[11px] font-medium uppercase tracking-wider text-stone-500 transition-opacity duration-300 truncate leading-none ${loading ? 'opacity-50' : 'opacity-100'}`}
            >
              {t('stats.properties')}
            </span>
          </div>

          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-stone-700 rounded-md border border-stone-200 bg-stone-50/80 hover:bg-stone-100 transition-colors flex-shrink-0"
            aria-expanded={filtersExpanded}
            aria-controls="filters-section"
          >
            <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>{t('filters.title')}</span>
            <svg
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop Stats */}
      <div
        className="hidden md:block rounded-md border border-stone-100 bg-stone-50/50 px-3 py-2"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-center gap-2.5">
          <span
            key={displayedCount}
            className={`text-2xl font-semibold tabular-nums leading-none text-[#3B82F6] transition-all duration-500 ease-in-out relative inline-block ${
              isAnimating ? 'scale-[1.02] opacity-80' : 'scale-100 opacity-100'
            }`}
          >
            <span className={loading ? 'opacity-50' : ''}>{displayedCount}</span>
            {loading && (
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/70 to-transparent animate-shimmer pointer-events-none"
                aria-label="Loading property count"
              />
            )}
          </span>
          <span
            className={`text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500 leading-none transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}
          >
            {t('stats.properties')}
          </span>
        </div>
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
              {t('filters.activeFilters')}
            </span>
            <button
              onClick={() => clearFilters()}
              className="text-[11px] font-medium text-stone-600 hover:text-stone-900 underline-offset-2 hover:underline transition-colors flex-shrink-0"
            >
              {t('filters.clearAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterCountry.length > 0 &&
              filterCountry.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-800 rounded-md text-[11px] font-medium border border-stone-200/80"
                >
                  {t('filters.badges.country')}: {country}
                  <button
                    onClick={() => {
                      setFilterCountry((prev) => prev.filter((c) => c !== country));
                      setFilterState([]);
                    }}
                    className="hover:bg-stone-200/80 rounded p-0.5 transition-colors text-stone-500 hover:text-stone-800"
                    aria-label={`Remove ${country} filter`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            {filterState.map((state) => (
              <span
                key={state}
                className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-800 rounded-md text-[11px] font-medium border border-stone-200/80"
              >
                {t('filters.badges.state')}: {state}
                <button
                  onClick={() => toggleState(state)}
                  className="hover:bg-stone-200/80 rounded p-0.5 transition-colors text-stone-500 hover:text-stone-800"
                  aria-label={`Remove ${state} filter`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
            {filterUnitType.map((unitType) => (
              <span
                key={unitType}
                className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-800 rounded-md text-[11px] font-medium border border-stone-200/80"
              >
                {t('filters.badges.unit')}: {unitType}
                <button
                  onClick={() => toggleUnitType(unitType)}
                  className="hover:bg-stone-200/80 rounded p-0.5 transition-colors text-stone-500 hover:text-stone-800"
                  aria-label={`Remove ${unitType} filter`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
            {filterRateRange.map((rateRange) => (
              <span
                key={rateRange}
                className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-800 rounded-md text-[11px] font-medium border border-stone-200/80"
              >
                {t('filters.badges.rate')}: {rateRange}
                <button
                  onClick={() => toggleRateRange(rateRange)}
                  className="hover:bg-stone-200/80 rounded p-0.5 transition-colors text-stone-500 hover:text-stone-800"
                  aria-label={`Remove ${rateRange} filter`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters - Collapsible on Mobile */}
      <div className="pt-4 md:border-t md:border-stone-100 md:pt-0">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 mb-3 md:pt-5 md:mb-4">
          {t('filters.title')}
        </h2>

        <div
          ref={filtersSectionRef}
          id="filters-section"
          className={`space-y-4 relative transition-all duration-300 ease-in-out md:!max-h-none md:!opacity-100 md:!overflow-visible md:!mt-0 ${
            filtersExpanded ? 'opacity-100 overflow-visible mt-3' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
          style={
            filtersExpanded && isMobile
              ? { maxHeight: filtersSectionRef.current?.scrollHeight ?? 'none' }
              : undefined
          }
        >
          <MultiSelect
            id="country-filter"
            variant="minimal"
            label={t('filters.country.label')}
            placeholder={t('filters.country.placeholder')}
            allSelectedText={t('filters.country.allSelected')}
            options={countryFilterOptions}
            selectedValues={countrySelectedValues}
            onToggle={(country) => {
              handleCountryToggle(country);
            }}
            onClear={handleCountryClear}
            activeColor="indigo"
          />

          <MultiSelect
            id="state-filter"
            variant="minimal"
            label={t('filters.state.label')}
            placeholder={t('filters.state.placeholder')}
            options={uniqueStates
              .filter((state) => (stateCounts[state] ?? 0) > 0)
              .map((state) => ({ value: state, label: state }))}
            selectedValues={filterState}
            onToggle={toggleState}
            onClear={() => setFilterState([])}
            activeColor="blue"
          />

          <MultiSelect
            id="unit-type-filter"
            variant="minimal"
            label={t('filters.unitType.label')}
            placeholder={t('filters.unitType.placeholder')}
            options={availableUnitTypes
              .filter((unitType) => {
                if (unitType.toLowerCase().includes('rv')) return false;
                if (unitType === 'Lodge or Hotel Room') return false;
                if (unitType === 'Other Glamping Units') return false;
                if (unitType === 'Vacation Rental') return false;
                return (unitTypeCounts[unitType] || 0) > 4;
              })
              .map((unitType) => ({
                value: unitType,
                label: `${unitType} (${unitTypeCounts[unitType] || 0})`,
              }))
              .filter((option) => (unitTypeCounts[option.value] || 0) > 0)}
            selectedValues={filterUnitType}
            onToggle={toggleUnitType}
            onClear={() => setFilterUnitType([])}
            activeColor="orange"
          />

          {/* Rate Range Filter - Hidden */}
          {false && (
            <MultiSelect
              id="rate-range-filter"
              variant="minimal"
              label={t('filters.rateRange.label')}
              placeholder={t('filters.rateRange.placeholder')}
              options={availableRateCategories
                .filter((category) => (rateCategoryCounts[category] || 0) > 0)
                .map((category) => ({
                  value: category,
                  label: `${category} (${rateCategoryCounts[category] || 0})`,
                }))}
              selectedValues={filterRateRange}
              onToggle={toggleRateRange}
              onClear={() => setFilterRateRange([])}
              activeColor="green"
            />
          )}

          {/* Map Layers */}
          <div className="space-y-0 pt-1">
            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-3">
              {t('layers.title')}
            </label>

            {/* Client Work Toggle */}
            <div className="flex items-center justify-between gap-3 py-3 border-b border-stone-100 first:pt-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-900">{t('layers.clientWork.label')}</span>
                  <span className="text-xs tabular-nums text-stone-400">
                    (
                    {clientWorkPointsLoading ? '…' : clientWorkPoints.length})
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  {t.rich('layers.clientWork.description', {
                    sage: (chunks) => (
                      <a
                        href="https://sageoutdooradvisory.com/"
                        className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              </div>
              <button
                id="client-work-toggle"
                type="button"
                role="switch"
                aria-checked={showClientWork}
                aria-label={showClientWork ? t('layers.clientWork.hide') : t('layers.clientWork.show')}
                onClick={toggleClientWork}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center justify-start rounded-full border border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CA8A04]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  showClientWork ? 'bg-[#CA8A04]' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 shrink-0 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                    showClientWork ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* National Parks Toggle */}
            <div className="flex items-center justify-between gap-3 py-3 border-b border-stone-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-900">{t('layers.nationalParks.label')}</span>
                  <span className="text-xs tabular-nums text-stone-400">
                    ({filterParksWithCoordinates(nationalParks).length} parks)
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t('layers.nationalParks.description')}</p>
              </div>
              <button
                id="national-parks-toggle"
                type="button"
                role="switch"
                aria-checked={showNationalParks}
                aria-label={showNationalParks ? t('layers.nationalParks.hide') : t('layers.nationalParks.show')}
                onClick={toggleNationalParks}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center justify-start rounded-full border border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  showNationalParks ? 'bg-[#10B981]' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 shrink-0 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                    showNationalParks ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Data Layers Radio Button Group */}
            <div className="space-y-0 pt-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mt-1 mb-2">
                {t('layers.dataLayers.title')}
              </h3>

              {/* None Option */}
              <label className="flex items-start gap-3 py-2.5 px-0 rounded-md cursor-pointer transition-colors border-b border-stone-100 hover:bg-stone-50/60 has-[:checked]:bg-stone-50">
                <input
                  type="radio"
                  name="mapLayer"
                  value="none"
                  checked={selectedMapLayer === 'none'}
                  onChange={() => setMapLayer('none')}
                  className="mt-1 h-4 w-4 shrink-0 accent-stone-900 border-stone-300 text-stone-900 focus:ring-stone-400/40"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-900">{t('layers.dataLayers.none.label')}</div>
                  <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t('layers.dataLayers.none.description')}</div>
                </div>
              </label>

              {/* Population Change Option */}
              <label
                className={`flex items-start gap-3 py-2.5 px-0 rounded-md cursor-pointer transition-colors border-b border-stone-100 hover:bg-stone-50/60 has-[:checked]:bg-stone-50 ${populationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="mapLayer"
                  value="population"
                  checked={selectedMapLayer === 'population'}
                  onChange={() => setMapLayer('population')}
                  disabled={populationLoading}
                  className="mt-1 h-4 w-4 shrink-0 accent-stone-900 border-stone-300 text-stone-900 focus:ring-stone-400/40 disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-900">{t('layers.population.label')}</span>
                    {populationLoading && (
                      <span className="text-xs text-stone-400">({t('layers.population.loading')})</span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t('layers.population.description')}</div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    Data source:{' '}
                    <a
                      href="https://data.census.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors"
                    >
                      data.census.gov
                    </a>
                  </div>
                </div>
              </label>

              {/* Population Change Legend */}
              {selectedMapLayer === 'population' && !populationLoading && (
                <div
                  className="my-2 p-3 rounded-md border border-stone-100 bg-stone-50/40"
                  role="img"
                  aria-label="Population change legend"
                >
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-2">
                    {t('layers.population.legend.title')}
                  </h4>
                  <div className="space-y-1">
                    {getChangeRanges().map((range, idx) => (
                      <div key={range.label} className="flex items-center gap-2 text-[11px]">
                        <div
                          className="w-3.5 h-3.5 rounded-sm border border-stone-200/80 flex items-center justify-center text-[6px] font-semibold leading-none"
                          style={{ backgroundColor: range.color, color: idx < 2 ? '#fff' : '#1c1917' }}
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </div>
                        <span className="text-stone-600">{range.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2 pt-2 border-t border-stone-100 text-center leading-relaxed">
                    {t('layers.population.legend.dataSource')}:{' '}
                    <a
                      href="https://data.census.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors"
                    >
                      data.census.gov
                    </a>
                  </p>
                </div>
              )}

              {/* Tourism Change Option */}
              <label
                className={`flex items-start gap-3 py-2.5 px-0 rounded-md cursor-pointer transition-colors border-b border-stone-100 hover:bg-stone-50/60 has-[:checked]:bg-stone-50 ${gdpLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="mapLayer"
                  value="tourism"
                  checked={selectedMapLayer === 'tourism'}
                  onChange={() => setMapLayer('tourism')}
                  disabled={gdpLoading}
                  className="mt-1 h-4 w-4 shrink-0 accent-stone-900 border-stone-300 text-stone-900 focus:ring-stone-400/40 disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-900">{t('layers.dataLayers.tourism.label')}</span>
                    {gdpLoading && <span className="text-xs text-stone-400">(Loading...)</span>}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t('layers.dataLayers.tourism.description')}</div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    Data source:{' '}
                    <a
                      href="https://www.bea.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors"
                    >
                      U.S. Bureau of Economic Analysis
                    </a>
                  </div>
                </div>
              </label>

              {/* GDP Growth Legend */}
              {selectedMapLayer === 'tourism' && !gdpLoading && (
                <div
                  className="my-2 p-3 rounded-md border border-stone-100 bg-stone-50/40"
                  role="img"
                  aria-label="Tourism growth legend"
                >
                  <h4 className="text-[11px] font-medium uppercase tracking-wider text-stone-500 mb-2">
                    Average Year-over-Year Growth (2001-2023)
                  </h4>
                  <div className="space-y-1">
                    {getChangeRanges().map((range, idx) => (
                      <div key={range.label} className="flex items-center gap-2 text-[11px]">
                        <div
                          className="w-3.5 h-3.5 rounded-sm border border-stone-200/80 flex items-center justify-center text-[6px] font-semibold leading-none"
                          style={{ backgroundColor: range.color, color: idx < 2 ? '#fff' : '#1c1917' }}
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </div>
                        <span className="text-stone-600">{range.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2 pt-2 border-t border-stone-100 text-center leading-relaxed">
                    Data source:{' '}
                    <a
                      href="https://www.bea.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors"
                    >
                      U.S. Bureau of Economic Analysis
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
