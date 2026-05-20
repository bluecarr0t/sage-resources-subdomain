'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useMapContext } from '../MapContext';
import { filterParksWithCoordinates, NationalPark } from '@/lib/types/national-parks';
import { getChangeRanges } from '@/lib/maps/county-boundaries';
import { useFilterComputations } from './hooks/useFilterComputations';
import {
  EDITORIAL_LINK_CLASS,
  EDITORIAL_METRIC_COMPACT_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';

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

  const countBlock = (
    <div className="flex items-baseline gap-2" aria-live="polite" aria-atomic="true">
      <span
        key={displayedCount}
        className={`${EDITORIAL_METRIC_COMPACT_CLASS} relative inline-block transition-all duration-500 ease-in-out ${
          isAnimating ? 'scale-[1.02]' : 'scale-100'
        }`}
      >
        <span className={loading ? 'opacity-50' : ''}>{displayedCount}</span>
        {loading && (
          <span
            className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-neutral-200/60 to-transparent"
            aria-label="Loading property count"
          />
        )}
      </span>
      <span
        className={`text-[11px] font-light uppercase tracking-widest text-neutral-500 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}
      >
        {t('stats.properties')}
      </span>
    </div>
  );

  return (
    <div className="w-full space-y-4 md:space-y-5">
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-sage-200/60 pb-3">
          <div className="min-w-0 flex-1">{countBlock}</div>

          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex shrink-0 items-center gap-1.5 border border-sage-200/90 bg-white/60 px-3 py-1.5 text-[11px] font-light uppercase tracking-widest text-neutral-700 transition-colors hover:bg-white hover:text-neutral-900"
            aria-expanded={filtersExpanded}
            aria-controls="filters-section"
          >
            <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>{t('filters.title')}</span>
            <svg
              className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="hidden border-b border-sage-200/60 pb-4 md:block">{countBlock}</div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={EDITORIAL_SECTION_LABEL_CLASS}>{t('filters.activeFilters')}</span>
            <button
              onClick={() => clearFilters()}
              className={`shrink-0 text-[11px] font-light ${EDITORIAL_LINK_CLASS}`}
            >
              {t('filters.clearAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterCountry.length > 0 &&
              filterCountry.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center gap-1 rounded-sm border border-sage-200/80 bg-white/60 px-2 py-1 text-[11px] font-light text-neutral-800"
                >
                  {t('filters.badges.country')}: {country}
                  <button
                    onClick={() => {
                      setFilterCountry((prev) => prev.filter((c) => c !== country));
                      setFilterState([]);
                    }}
                    className="rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
                className="inline-flex items-center gap-1 rounded-sm border border-sage-200/80 bg-white/60 px-2 py-1 text-[11px] font-light text-neutral-800"
              >
                {t('filters.badges.state')}: {state}
                <button
                  onClick={() => toggleState(state)}
                  className="rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
                className="inline-flex items-center gap-1 rounded-sm border border-sage-200/80 bg-white/60 px-2 py-1 text-[11px] font-light text-neutral-800"
              >
                {t('filters.badges.unit')}: {unitType}
                <button
                  onClick={() => toggleUnitType(unitType)}
                  className="rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
                className="inline-flex items-center gap-1 rounded-sm border border-sage-200/80 bg-white/60 px-2 py-1 text-[11px] font-light text-neutral-800"
              >
                {t('filters.badges.rate')}: {rateRange}
                <button
                  onClick={() => toggleRateRange(rateRange)}
                  className="rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
      <div className="md:pt-2">
        <h2 className={`${EDITORIAL_SECTION_LABEL_CLASS} mb-4 md:mb-5`}>{t('filters.title')}</h2>

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
            variant="editorial"
            label={t('filters.country.label')}
            placeholder={t('filters.country.placeholder')}
            allSelectedText={t('filters.country.allSelected')}
            options={countryFilterOptions}
            selectedValues={countrySelectedValues}
            onToggle={(country) => {
              handleCountryToggle(country);
            }}
            onClear={handleCountryClear}
            activeColor="sage"
          />

          <MultiSelect
            id="state-filter"
            variant="editorial"
            label={t('filters.state.label')}
            placeholder={t('filters.state.placeholder')}
            options={uniqueStates
              .filter((state) => (stateCounts[state] ?? 0) > 0)
              .map((state) => ({ value: state, label: state }))}
            selectedValues={filterState}
            onToggle={toggleState}
            onClear={() => setFilterState([])}
            activeColor="sage"
          />

          <MultiSelect
            id="unit-type-filter"
            variant="editorial"
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
            activeColor="sage"
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
          <div className="space-y-0 border-t border-sage-200/60 pt-4">
            <p className={`${EDITORIAL_SECTION_LABEL_CLASS} mb-4`}>{t('layers.title')}</p>

            <div className="flex items-center justify-between gap-3 border-b border-sage-200/40 py-3 first:pt-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-light text-neutral-800">{t('layers.clientWork.label')}</span>
                  <span className="text-xs tabular-nums text-neutral-500">
                    (
                    {clientWorkPointsLoading ? '…' : clientWorkPoints.length})
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-light leading-relaxed text-neutral-500">
                  {t.rich('layers.clientWork.description', {
                    sage: (chunks) => (
                      <a
                        href="https://sageoutdooradvisory.com/"
                        className={EDITORIAL_LINK_CLASS}
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-start rounded-full border border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f3] ${
                  showClientWork ? 'bg-sage-600' : 'bg-neutral-300'
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
            <div className="flex items-center justify-between gap-3 border-b border-sage-200/40 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-light text-neutral-800">{t('layers.nationalParks.label')}</span>
                  <span className="text-xs tabular-nums text-neutral-500">
                    ({filterParksWithCoordinates(nationalParks).length} parks)
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-light leading-relaxed text-neutral-500">
                  {t('layers.nationalParks.description')}
                </p>
              </div>
              <button
                id="national-parks-toggle"
                type="button"
                role="switch"
                aria-checked={showNationalParks}
                aria-label={showNationalParks ? t('layers.nationalParks.hide') : t('layers.nationalParks.show')}
                onClick={toggleNationalParks}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-start rounded-full border border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f3] ${
                  showNationalParks ? 'bg-sage-600' : 'bg-neutral-300'
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
            <div className="space-y-0 border-t border-sage-200/40 pt-3">
              <p className={`${EDITORIAL_SECTION_LABEL_CLASS} mb-3`}>{t('layers.dataLayers.title')}</p>

              <label className="flex cursor-pointer items-start gap-3 border-b border-sage-200/40 px-0 py-2.5 transition-colors has-[:checked]:bg-white/50 hover:bg-white/40">
                <input
                  type="radio"
                  name="mapLayer"
                  value="none"
                  checked={selectedMapLayer === 'none'}
                  onChange={() => setMapLayer('none')}
                  className="mt-1 h-4 w-4 shrink-0 border-neutral-300 text-sage-700 accent-sage-700 focus:ring-sage-400/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-light text-neutral-800">{t('layers.dataLayers.none.label')}</div>
                  <div className="mt-0.5 text-xs font-light leading-relaxed text-neutral-500">
                    {t('layers.dataLayers.none.description')}
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 border-b border-sage-200/40 px-0 py-2.5 transition-colors has-[:checked]:bg-white/50 hover:bg-white/40 ${populationLoading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="mapLayer"
                  value="population"
                  checked={selectedMapLayer === 'population'}
                  onChange={() => setMapLayer('population')}
                  disabled={populationLoading}
                  className="mt-1 h-4 w-4 shrink-0 border-neutral-300 text-sage-700 accent-sage-700 focus:ring-sage-400/40 disabled:opacity-50"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-light text-neutral-800">{t('layers.population.label')}</span>
                    {populationLoading && (
                      <span className="text-xs text-neutral-500">({t('layers.population.loading')})</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs font-light leading-relaxed text-neutral-500">
                    {t('layers.population.description')}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    Data source:{' '}
                    <a
                      href="https://data.census.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EDITORIAL_LINK_CLASS}
                    >
                      data.census.gov
                    </a>
                  </div>
                </div>
              </label>

              {selectedMapLayer === 'population' && !populationLoading && (
                <div
                  className="my-2 border border-sage-200/60 bg-white/50 p-3"
                  role="img"
                  aria-label="Population change legend"
                >
                  <h4 className={`${EDITORIAL_SECTION_LABEL_CLASS} mb-2`}>
                    {t('layers.population.legend.title')}
                  </h4>
                  <div className="space-y-1">
                    {getChangeRanges().map((range, idx) => (
                      <div key={range.label} className="flex items-center gap-2 text-[11px]">
                        <div
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-sage-200/80 text-[6px] font-semibold leading-none"
                          style={{ backgroundColor: range.color, color: idx < 2 ? '#fff' : '#1c1917' }}
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </div>
                        <span className="font-light text-neutral-600">{range.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 border-t border-sage-200/60 pt-2 text-center text-[11px] font-light leading-relaxed text-neutral-500">
                    {t('layers.population.legend.dataSource')}:{' '}
                    <a
                      href="https://data.census.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EDITORIAL_LINK_CLASS}
                    >
                      data.census.gov
                    </a>
                  </p>
                </div>
              )}

              <label
                className={`flex cursor-pointer items-start gap-3 border-b border-sage-200/40 px-0 py-2.5 transition-colors has-[:checked]:bg-white/50 hover:bg-white/40 ${gdpLoading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="mapLayer"
                  value="tourism"
                  checked={selectedMapLayer === 'tourism'}
                  onChange={() => setMapLayer('tourism')}
                  disabled={gdpLoading}
                  className="mt-1 h-4 w-4 shrink-0 border-neutral-300 text-sage-700 accent-sage-700 focus:ring-sage-400/40 disabled:opacity-50"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-light text-neutral-800">{t('layers.dataLayers.tourism.label')}</span>
                    {gdpLoading && <span className="text-xs text-neutral-500">(Loading...)</span>}
                  </div>
                  <div className="mt-0.5 text-xs font-light leading-relaxed text-neutral-500">
                    {t('layers.dataLayers.tourism.description')}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    Data source:{' '}
                    <a
                      href="https://www.bea.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EDITORIAL_LINK_CLASS}
                    >
                      U.S. Bureau of Economic Analysis
                    </a>
                  </div>
                </div>
              </label>

              {selectedMapLayer === 'tourism' && !gdpLoading && (
                <div
                  className="my-2 border border-sage-200/60 bg-white/50 p-3"
                  role="img"
                  aria-label="Tourism growth legend"
                >
                  <h4 className={`${EDITORIAL_SECTION_LABEL_CLASS} mb-2`}>
                    Average Year-over-Year Growth (2001-2023)
                  </h4>
                  <div className="space-y-1">
                    {getChangeRanges().map((range, idx) => (
                      <div key={range.label} className="flex items-center gap-2 text-[11px]">
                        <div
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-sage-200/80 text-[6px] font-semibold leading-none"
                          style={{ backgroundColor: range.color, color: idx < 2 ? '#fff' : '#1c1917' }}
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </div>
                        <span className="font-light text-neutral-600">{range.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 border-t border-sage-200/60 pt-2 text-center text-[11px] font-light leading-relaxed text-neutral-500">
                    Data source:{' '}
                    <a
                      href="https://www.bea.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EDITORIAL_LINK_CLASS}
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
