'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    selectedMapLayer,
    hasActiveFilters,
    propertiesLoading: loading,
    allProperties,
    setFilterCountry,
    setFilterState,
    setFilterUnitType,
    setFilterRateRange,
    toggleCountry,
    toggleState,
    toggleUnitType,
    toggleRateRange,
    toggleNationalParks,
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
    <div className="w-full space-y-1 md:space-y-6">
      {/* Mobile-Optimized Header: Property Count + Filter Button on Same Row */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 shadow-sm p-3">
          <div className="flex items-center gap-2 min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            <span
              key={displayedCount}
              className={`text-2xl font-bold text-green-700 transition-all duration-500 ease-in-out relative inline-block whitespace-nowrap ${
                isAnimating ? 'scale-110 opacity-70' : 'scale-100 opacity-100'
              }`}
            >
              <span className={loading ? 'opacity-60' : ''}>{displayedCount}</span>
              {loading && (
                <span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-green-50/60 to-transparent animate-shimmer pointer-events-none"
                  aria-label="Loading property count"
                />
              )}
            </span>
            <span
              className={`text-sm font-medium text-gray-900 transition-opacity duration-300 truncate ${loading ? 'opacity-50' : 'opacity-100'}`}
            >
              {t('stats.properties')}
            </span>
          </div>

          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors flex-shrink-0 border border-indigo-200"
            aria-expanded={filtersExpanded}
            aria-controls="filters-section"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-sm font-semibold">{t('filters.title')}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
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
        className="hidden md:block bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 shadow-sm md:mt-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-center gap-4">
          <span
            key={displayedCount}
            className={`text-4xl font-bold text-green-700 transition-all duration-500 ease-in-out relative inline-block ${
              isAnimating ? 'scale-110 opacity-70' : 'scale-100 opacity-100'
            }`}
          >
            <span className={loading ? 'opacity-60' : ''}>{displayedCount}</span>
            {loading && (
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-green-50/60 to-transparent animate-shimmer pointer-events-none"
                aria-label="Loading property count"
              />
            )}
          </span>
          <span
            className={`text-xl font-semibold text-gray-700 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}
          >
            {t('stats.properties')}
          </span>
        </div>
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('filters.activeFilters')}
            </span>
            <button
              onClick={() => clearFilters()}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 underline transition-colors flex-shrink-0"
            >
              {t('filters.clearAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterCountry.length < 2 &&
              filterCountry.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium"
                >
                  {t('filters.badges.country')}: {country}
                  <button
                    onClick={() => {
                      toggleCountry(country);
                      setFilterState([]);
                    }}
                    className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {t('filters.badges.state')}: {state}
                <button
                  onClick={() => toggleState(state)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium"
              >
                {t('filters.badges.unit')}: {unitType}
                <button
                  onClick={() => toggleUnitType(unitType)}
                  className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium"
              >
                {t('filters.badges.rate')}: {rateRange}
                <button
                  onClick={() => toggleRateRange(rateRange)}
                  className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
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
      <div className="pt-5 md:border-t md:border-gray-200 md:pt-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 md:pt-6">{t('filters.title')}</h2>

        <div
          ref={filtersSectionRef}
          id="filters-section"
          className={`space-y-5 relative transition-all duration-300 ease-in-out md:!max-h-none md:!opacity-100 md:!overflow-visible md:!mt-0 ${
            filtersExpanded ? 'opacity-100 overflow-visible mt-4' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
          style={
            filtersExpanded && isMobile
              ? { maxHeight: filtersSectionRef.current?.scrollHeight ?? 'none' }
              : undefined
          }
        >
          <MultiSelect
            id="country-filter"
            label={t('filters.country.label')}
            placeholder={t('filters.country.placeholder')}
            allSelectedText={t('filters.country.allSelected')}
            options={[
              { value: 'United States', label: `United States (${countryCounts['United States'] || 0})` },
              { value: 'Canada', label: `Canada (${countryCounts['Canada'] || 0})` },
            ].filter((option) => (countryCounts[option.value] || 0) > 0)}
            selectedValues={filterCountry}
            onToggle={(country) => {
              toggleCountry(country);
              setFilterState([]);
            }}
            onClear={() => {
              setFilterCountry(['United States', 'Canada']);
              setFilterState([]);
            }}
            activeColor="indigo"
          />

          <MultiSelect
            id="state-filter"
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
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">{t('layers.title')}</label>

            {/* National Parks Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{t('layers.nationalParks.label')}</span>
                  <span className="text-xs text-gray-500">
                    ({filterParksWithCoordinates(nationalParks).length} parks)
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{t('layers.nationalParks.description')}</p>
              </div>
              <button
                id="national-parks-toggle"
                type="button"
                role="switch"
                aria-checked={showNationalParks}
                aria-label={showNationalParks ? t('layers.nationalParks.hide') : t('layers.nationalParks.show')}
                onClick={toggleNationalParks}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2 ${
                  showNationalParks ? 'bg-[#10B981]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showNationalParks ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Data Layers Radio Button Group */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">{t('layers.dataLayers.title')}</h3>

              {/* None Option */}
              <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500 border-gray-200">
                <input
                  type="radio"
                  name="mapLayer"
                  value="none"
                  checked={selectedMapLayer === 'none'}
                  onChange={() => setMapLayer('none')}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{t('layers.dataLayers.none.label')}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{t('layers.dataLayers.none.description')}</div>
                </div>
              </label>

              {/* Population Change Option */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500 border-gray-200 ${populationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="mapLayer"
                  value="population"
                  checked={selectedMapLayer === 'population'}
                  onChange={() => setMapLayer('population')}
                  disabled={populationLoading}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{t('layers.population.label')}</span>
                    {populationLoading && (
                      <span className="text-xs text-gray-500">({t('layers.population.loading')})</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5">{t('layers.population.description')}</div>
                  <div className="text-xs text-gray-500 mt-1 italic">
                    Data source:{' '}
                    <a
                      href="https://data.census.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      data.census.gov
                    </a>
                  </div>
                </div>
              </label>

              {/* Population Change Legend */}
              {selectedMapLayer === 'population' && !populationLoading && (
                <div
                  className="p-3 bg-white rounded-lg border border-gray-200"
                  role="img"
                  aria-label="Population change legend"
                >
                  <h4 className="text-xs font-semibold text-gray-900 mb-2">
                    {t('layers.population.legend.title')}
                  </h4>
                  <div className="space-y-1">
                    {getChangeRanges().map((range, idx) => (
                      <div key={range.label} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center text-[7px] font-bold leading-none"
                          style={{ backgroundColor: range.color, color: idx < 2 ? '#fff' : '#1f2937' }}
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </div>
                        <span className="text-gray-700">{range.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 italic text-center">
                    {t('layers.population.legend.dataSource')}:{' '}
                    <a
                      href="https://data.census.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      data.census.gov
                    </a>
                  </p>
                </div>
              )}

              {/* Tourism Change Option */}
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500 border-gray-200 ${gdpLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="mapLayer"
                  value="tourism"
                  checked={selectedMapLayer === 'tourism'}
                  onChange={() => setMapLayer('tourism')}
                  disabled={gdpLoading}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{t('layers.dataLayers.tourism.label')}</span>
                    {gdpLoading && <span className="text-xs text-gray-500">(Loading...)</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5">{t('layers.dataLayers.tourism.description')}</div>
                  <div className="text-xs text-gray-500 mt-1 italic">
                    Data source:{' '}
                    <a
                      href="https://www.bea.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      U.S. Bureau of Economic Analysis
                    </a>
                  </div>
                </div>
              </label>

              {/* GDP Growth Legend */}
              {selectedMapLayer === 'tourism' && !gdpLoading && (
                <div
                  className="p-3 bg-white rounded-lg border border-gray-200"
                  role="img"
                  aria-label="Tourism growth legend"
                >
                  <h4 className="text-xs font-semibold text-gray-900 mb-2">
                    Average Year-over-Year Growth (2001-2023)
                  </h4>
                  <div className="space-y-1">
                    {getChangeRanges().map((range, idx) => (
                      <div key={range.label} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center text-[7px] font-bold leading-none"
                          style={{ backgroundColor: range.color, color: idx < 2 ? '#fff' : '#1f2937' }}
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </div>
                        <span className="text-gray-700">{range.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 italic text-center">
                    Data source:{' '}
                    <a
                      href="https://www.bea.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
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
