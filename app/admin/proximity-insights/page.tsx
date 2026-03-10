'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Download, RefreshCw, RotateCcw } from 'lucide-react';
import { STATE_ABBREVIATIONS } from '@/components/map/utils/stateUtils';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import SearchableAnchorSelect from '@/components/SearchableAnchorSelect';
import { InsightsSkeleton } from './components/InsightsSkeleton';
import { InsightsColumn } from './components/InsightsColumn';
import type { AnchorType, InsightsData, PropertyTypeFilter, Season } from './types';

const CANADIAN_PROVINCE_CODES = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']);
const US_STATE_OPTIONS = Object.entries(STATE_ABBREVIATIONS)
  .filter(([code]) => !CANADIAN_PROVINCE_CODES.has(code))
  .sort(([, a], [, b]) => a.localeCompare(b))
  .map(([code, name]) => ({ code, name }));

export default function AnchorPointInsightsPage() {
  const t = useTranslations('anchorPointInsights');
  const searchParams = useSearchParams();
  const [anchorType, setAnchorType] = useState<AnchorType>('ski');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>('glamping');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [season, setSeason] = useState<Season>('winter');
  const [anchorFilter, setAnchorFilter] = useState<{ id?: number; slug?: string } | null>(null);
  const [distanceBandsInput, setDistanceBandsInput] = useState<string>('30');
  const [bandsExpanded, setBandsExpanded] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingFull, setExportingFull] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareData, setCompareData] = useState<{ insights_a: InsightsData; insights_b: InsightsData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Sync URL to anchor type, state, distance bands, and compare mode when searchParams change
  useEffect(() => {
    const compare = searchParams.get('compare') === 'true';
    setCompareMode(compare);

    if (!compare) {
      const type = searchParams.get('anchor_type')?.toLowerCase();
      if (type === 'national-parks' || type === 'ski') {
        setAnchorType(type);
      }
    }

    const state = searchParams.get('state')?.trim().toUpperCase() || null;
    setStateFilter(state || null);
    const bands = searchParams.get('distance_bands')?.trim() || '';
    setDistanceBandsInput(bands || '30');
    const typeParam = (searchParams.get('type') || 'glamping').toLowerCase();
    setPropertyTypeFilter(typeParam === 'rv' || typeParam === 'all' ? typeParam : 'glamping');
  }, [searchParams]);

  // Sync URL to anchor filter on mount and when searchParams/anchorType change
  useEffect(() => {
    const anchorId = searchParams.get('anchor_id');
    const anchorSlug = searchParams.get('anchor_slug');
    if (anchorType === 'ski' && anchorId) {
      const id = parseInt(anchorId, 10);
      setAnchorFilter(isNaN(id) ? null : { id });
    } else if (anchorType === 'national-parks' && anchorSlug) {
      setAnchorFilter({ slug: anchorSlug });
    } else {
      setAnchorFilter(null);
    }
  }, [searchParams, anchorType]);

  // Clear anchor filter when switching anchor type (id vs slug are type-specific)
  const prevAnchorTypeRef = useRef(anchorType);
  useEffect(() => {
    if (prevAnchorTypeRef.current !== anchorType) {
      prevAnchorTypeRef.current = anchorType;
      setAnchorFilter(null);
    }
  }, [anchorType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCompareData(null);
    try {
      const params = new URLSearchParams();
      params.set('type', propertyTypeFilter);
      if (stateFilter) params.set('state', stateFilter);
      const appliedBands = searchParams.get('distance_bands')?.trim();
      if (appliedBands) params.set('distance_bands', appliedBands);

      if (compareMode) {
        params.set('compare', 'true');
        params.set('anchor_a_type', searchParams.get('anchor_a_type') || 'ski');
        params.set('anchor_b_type', searchParams.get('anchor_b_type') || 'national-parks');
        const aId = searchParams.get('anchor_a_id');
        const aSlug = searchParams.get('anchor_a_slug');
        const bId = searchParams.get('anchor_b_id');
        const bSlug = searchParams.get('anchor_b_slug');
        if (aId) params.set('anchor_a_id', aId);
        if (aSlug) params.set('anchor_a_slug', aSlug);
        if (bId) params.set('anchor_b_id', bId);
        if (bSlug) params.set('anchor_b_slug', bSlug);

        const res = await fetch(`/api/admin/anchor-point-insights?${params}`);
        const json = await res.json();
        if (json.success && json.insights_a && json.insights_b) {
          setCompareData({ insights_a: json.insights_a, insights_b: json.insights_b });
          setData(null);
          setError(null);
        } else {
          setCompareData(null);
          setData(null);
          setError(json.message || json.error || 'Failed to load compare');
        }
      } else {
        params.set('anchor_type', anchorType);
        if (anchorFilter?.id != null) params.set('anchor_id', String(anchorFilter.id));
        if (anchorFilter?.slug) params.set('anchor_slug', anchorFilter.slug);

        const res = await fetch(`/api/admin/anchor-point-insights?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.insights);
          setCompareData(null);
          setError(null);
        } else {
          setData(null);
          setError(json.message || json.error || 'Failed to load insights');
        }
      }
    } catch (e) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [anchorType, propertyTypeFilter, stateFilter, anchorFilter, compareMode, searchParams, t]);

  useEffect(() => {
    load();
  }, [load]);

  const buildUrlParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set('type', propertyTypeFilter);
    if (stateFilter) p.set('state', stateFilter);
    if (distanceBandsInput.trim() && distanceBandsInput.trim() !== '30') {
      p.set('distance_bands', distanceBandsInput.trim());
    }
    if (compareMode) {
      p.set('compare', 'true');
      p.set('anchor_a_type', searchParams.get('anchor_a_type') || 'ski');
      p.set('anchor_b_type', searchParams.get('anchor_b_type') || 'national-parks');
      const aId = searchParams.get('anchor_a_id');
      const aSlug = searchParams.get('anchor_a_slug');
      const bId = searchParams.get('anchor_b_id');
      const bSlug = searchParams.get('anchor_b_slug');
      if (aId) p.set('anchor_a_id', aId);
      if (aSlug) p.set('anchor_a_slug', aSlug);
      if (bId) p.set('anchor_b_id', bId);
      if (bSlug) p.set('anchor_b_slug', bSlug);
    } else {
      p.set('anchor_type', anchorType);
      if (anchorFilter?.id != null) p.set('anchor_id', String(anchorFilter.id));
      if (anchorFilter?.slug) p.set('anchor_slug', anchorFilter.slug);
    }
    return p;
  }, [anchorType, propertyTypeFilter, stateFilter, anchorFilter, distanceBandsInput, compareMode, searchParams]);

  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  const exportData = data ?? compareData?.insights_a;
  const handleExportPropertySample = useCallback(async () => {
    if (!exportData?.property_sample?.length) return;
    setExportOpen(false);
    const { default: XLSX } = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData.property_sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Property Sample');
    XLSX.writeFile(wb, `anchor-insights-property-sample-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [exportData]);

  const handleExportByState = useCallback(async () => {
    if (!exportData?.by_state?.length) return;
    setExportOpen(false);
    const { default: XLSX } = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportData.by_state);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'By State');
    XLSX.writeFile(wb, `anchor-insights-by-state-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [exportData]);

  const handleExportFull = useCallback(async () => {
    setExportOpen(false);
    setExportingFull(true);
    try {
      const params = new URLSearchParams({ anchor_type: anchorType, type: propertyTypeFilter });
      if (stateFilter) params.set('state', stateFilter);
      if (anchorFilter?.id != null) params.set('anchor_id', String(anchorFilter.id));
      if (anchorFilter?.slug) params.set('anchor_slug', anchorFilter.slug);
      const appliedBands = searchParams.get('distance_bands')?.trim();
      if (appliedBands) params.set('distance_bands', appliedBands);
      params.set('limit', '5000');

      const allRows: Record<string, unknown>[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        params.set('page', String(page));
        const res = await fetch(`/api/admin/anchor-point-insights/export?${params}`);
        const json = await res.json();
        if (!json.success || !Array.isArray(json.rows)) break;
        allRows.push(...json.rows);
        hasMore = json.has_more === true;
        page++;
      }

      if (allRows.length === 0) return;

      const { default: XLSX } = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(allRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Full Dataset');
      XLSX.writeFile(wb, `anchor-insights-full-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExportingFull(false);
    }
  }, [anchorType, propertyTypeFilter, stateFilter, anchorFilter, searchParams]);

  if (loading) {
    return <InsightsSkeleton />;
  }

  if (!data && !compareData) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-20 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {error ?? t('noInsightsData')}
          </p>
          {error === 'Unauthorized' && (
            <p className="mt-2 text-sm text-gray-400">
              <a href="/admin" className="text-sage-600 hover:underline">{t('signInToAdmin')}</a>
            </p>
          )}
          {error && (
            <button
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium hover:bg-sage-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('retry')}
            </button>
          )}
        </div>
      </main>
    );
  }

  const seasonLabels: Record<Season, string> = {
    winter: t('winter'),
    spring: t('spring'),
    summer: t('summer'),
    fall: t('fall'),
  };
  const leftData = compareMode ? compareData!.insights_a : data!;
  const rightData = compareMode ? compareData!.insights_b : null;

  const getWeekdayKey = (s: Season) => `avg_${s}_weekday` as keyof InsightsData['by_band'][number];
  const getWeekendKey = (s: Season) => `avg_${s}_weekend` as keyof InsightsData['by_band'][number];

  const buildBandChartData = (d: InsightsData) =>
    d.by_band.map((b) => {
      const wd = b[getWeekdayKey(season)] as number | null | undefined;
      const we = b[getWeekendKey(season)] as number | null | undefined;
      return {
        band: `${b.band} mi`,
        count: b.count,
        [`Avg ${seasonLabels[season]} Weekday`]: wd ?? null,
        [`Avg ${seasonLabels[season]} Weekend`]: we ?? null,
      };
    });

  const buildOccupancyChartData = (d: InsightsData) =>
    d.by_band.map((b) => {
      const occ = b.avg_occupancy_2025 ?? b.avg_occupancy_2024 ?? b.avg_occupancy_2026;
      return { band: `${b.band} mi`, count: b.count, 'Avg Occupancy %': occ };
    });

  const bandChartData = buildBandChartData(leftData);
  const occupancyChartData = buildOccupancyChartData(leftData);
  const hasOccupancyData = occupancyChartData.some((b) => b['Avg Occupancy %'] != null);

  const columns = compareMode && rightData
    ? [
        { data: leftData, label: t('leftColumn'), typeLabel: searchParams.get('anchor_a_type') !== 'national-parks' ? t('skiResort') : t('nationalPark') },
        { data: rightData, label: t('rightColumn'), typeLabel: searchParams.get('anchor_b_type') !== 'national-parks' ? t('skiResort') : t('nationalPark') },
      ]
    : [{ data: leftData, label: null, typeLabel: anchorType === 'national-parks' ? t('nationalPark') : t('skiResort') }];

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <GoogleMapsProvider>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {compareMode
              ? t('compare')
              : leftData.selected_anchor
                ? t('titleWithAnchor', { anchorName: leftData.selected_anchor.name })
                : t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {compareMode
              ? t('subtitle')
              : leftData.selected_anchor
                ? t('subtitleWithAnchor', { anchorName: leftData.selected_anchor.name })
                : t('subtitle')}
          </p>
          {/* Filters and actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {!compareMode ? (
                <>
                  <button
                    onClick={() => {
                      setAnchorType('ski');
                      const p = buildUrlParams();
                      p.set('anchor_type', 'ski');
                      p.delete('anchor_id');
                      p.delete('anchor_slug');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      anchorType === 'ski'
                        ? 'bg-sage-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t('skiResorts')}
                  </button>
                  <button
                    onClick={() => {
                      setAnchorType('national-parks');
                      const p = buildUrlParams();
                      p.set('anchor_type', 'national-parks');
                      p.delete('anchor_id');
                      p.delete('anchor_slug');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      anchorType === 'national-parks'
                        ? 'bg-sage-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t('nationalParks')}
                  </button>
                </>
              ) : null}
              <button
                onClick={() => {
                  const p = buildUrlParams();
                  if (compareMode) {
                    p.delete('compare');
                    p.delete('anchor_a_type');
                    p.delete('anchor_a_id');
                    p.delete('anchor_a_slug');
                    p.delete('anchor_b_type');
                    p.delete('anchor_b_id');
                    p.delete('anchor_b_slug');
                    p.set('anchor_type', 'ski');
                  } else {
                    p.set('compare', 'true');
                    p.set('anchor_a_type', 'ski');
                    p.set('anchor_b_type', 'national-parks');
                  }
                  router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  compareMode
                    ? 'bg-sage-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {t('compare')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('filterByType')}</span>
              <div className="flex gap-1">
                {(['glamping', 'rv', 'all'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setPropertyTypeFilter(type);
                      const p = buildUrlParams();
                      p.set('type', type);
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      propertyTypeFilter === type
                        ? 'bg-sage-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type === 'glamping' ? t('typeGlamping') : type === 'rv' ? t('typeRV') : t('typeAll')}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={stateFilter ?? ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setStateFilter(val);
                const p = buildUrlParams();
                if (val) p.set('state', val);
                else p.delete('state');
                router.replace(`${pathname}?${p.toString()}`, { scroll: false });
              }}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent"
              aria-label={t('filterByState')}
            >
              <option value="">{t('allStates')}</option>
              {US_STATE_OPTIONS.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            {compareMode ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('compareAnchorA')}</span>
                  <select
                    value={searchParams.get('anchor_a_type') || 'ski'}
                    onChange={(e) => {
                      const p = buildUrlParams();
                      p.set('anchor_a_type', e.target.value);
                      p.delete('anchor_a_id');
                      p.delete('anchor_a_slug');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="ski">{t('skiResorts')}</option>
                    <option value="national-parks">{t('nationalParks')}</option>
                  </select>
                  <SearchableAnchorSelect
                    anchors={compareData?.insights_a?.anchors_with_property_counts ?? []}
                    anchorType={searchParams.get('anchor_a_type') !== 'national-parks' ? 'ski' : 'national-parks'}
                    value={
                      searchParams.get('anchor_a_id')
                        ? `id:${searchParams.get('anchor_a_id')}`
                        : searchParams.get('anchor_a_slug')
                          ? `slug:${searchParams.get('anchor_a_slug')}`
                          : ''
                    }
                    onChange={(v) => {
                      const p = buildUrlParams();
                      p.delete('anchor_a_id');
                      p.delete('anchor_a_slug');
                      if (v.startsWith('id:')) p.set('anchor_a_id', v.slice(3));
                      else if (v.startsWith('slug:')) p.set('anchor_a_slug', v.slice(5));
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    allLabel={t('allAnchors')}
                    searchPlaceholder={searchParams.get('anchor_a_type') === 'national-parks' ? t('searchParks') : t('searchAnchors')}
                    className="min-w-[160px]"
                    aria-label={t('compareAnchorA')}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('compareAnchorB')}</span>
                  <select
                    value={searchParams.get('anchor_b_type') || 'national-parks'}
                    onChange={(e) => {
                      const p = buildUrlParams();
                      p.set('anchor_b_type', e.target.value);
                      p.delete('anchor_b_id');
                      p.delete('anchor_b_slug');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="ski">{t('skiResorts')}</option>
                    <option value="national-parks">{t('nationalParks')}</option>
                  </select>
                  <SearchableAnchorSelect
                    anchors={compareData?.insights_b?.anchors_with_property_counts ?? []}
                    anchorType={searchParams.get('anchor_b_type') !== 'national-parks' ? 'ski' : 'national-parks'}
                    value={
                      searchParams.get('anchor_b_id')
                        ? `id:${searchParams.get('anchor_b_id')}`
                        : searchParams.get('anchor_b_slug')
                          ? `slug:${searchParams.get('anchor_b_slug')}`
                          : ''
                    }
                    onChange={(v) => {
                      const p = buildUrlParams();
                      p.delete('anchor_b_id');
                      p.delete('anchor_b_slug');
                      if (v.startsWith('id:')) p.set('anchor_b_id', v.slice(3));
                      else if (v.startsWith('slug:')) p.set('anchor_b_slug', v.slice(5));
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    allLabel={t('allAnchors')}
                    searchPlaceholder={searchParams.get('anchor_b_type') === 'national-parks' ? t('searchParks') : t('searchAnchors')}
                    className="min-w-[160px]"
                    aria-label={t('compareAnchorB')}
                  />
                </div>
              </>
            ) : (
              <SearchableAnchorSelect
                anchors={data?.anchors_with_property_counts ?? []}
                anchorType={anchorType}
                value={
                  anchorFilter?.id != null
                    ? `id:${anchorFilter.id}`
                    : anchorFilter?.slug
                      ? `slug:${anchorFilter.slug}`
                      : ''
                }
                onChange={(v) => {
                  const p = buildUrlParams();
                  if (!v) {
                    setAnchorFilter(null);
                    p.delete('anchor_id');
                    p.delete('anchor_slug');
                    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    return;
                  }
                  if (v.startsWith('id:')) {
                    const id = parseInt(v.slice(3), 10);
                    if (!isNaN(id)) {
                      setAnchorFilter({ id });
                      p.set('anchor_id', String(id));
                      p.delete('anchor_slug');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }
                  } else if (v.startsWith('slug:')) {
                    const slug = v.slice(5);
                    if (slug) {
                      setAnchorFilter({ slug });
                      p.set('anchor_slug', slug);
                      p.delete('anchor_id');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }
                  }
                }}
                allLabel={`${t('allAnchors')} ${anchorType === 'national-parks' ? t('nationalParks') : t('skiResorts')}`}
                searchPlaceholder={anchorType === 'national-parks' ? t('searchParks') : t('searchAnchors')}
                aria-label={t('filterByAnchor')}
              />
            )}
            <button
              type="button"
              onClick={() => {
                setStateFilter(null);
                setAnchorFilter(null);
                setPropertyTypeFilter('glamping');
                setDistanceBandsInput('30');
                setCompareMode(false);
                router.replace(`${pathname}?type=glamping&anchor_type=ski`, { scroll: false });
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={t('resetAllFilters')}
            >
              <RotateCcw className="w-4 h-4" />
              {t('resetAllFilters')}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </button>
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportOpen((x) => !x)}
                disabled={exportingFull || !(data || compareData)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={t('export')}
                aria-expanded={exportOpen}
                aria-haspopup="true"
              >
                <Download className="w-4 h-4" />
                {exportingFull ? t('exportingFull') : t('export')}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[220px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <button
                    type="button"
                    onClick={handleExportPropertySample}
                    disabled={!exportData?.property_sample?.length}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('exportPropertySample')}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportByState}
                    disabled={!exportData?.by_state?.length}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('exportByState')}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportFull}
                    disabled={exportingFull}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('exportFullDataset')}
                  </button>
                </div>
              )}
            </div>
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBandsExpanded((x) => !x)}
                className="inline-flex items-center gap-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('customDistanceBands')}
                {bandsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {bandsExpanded && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={distanceBandsInput}
                    onChange={(e) => setDistanceBandsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && router.replace(`${pathname}?${buildUrlParams().toString()}`, { scroll: false })}
                    placeholder={t('distanceBandsPlaceholder')}
                    className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent w-36"
                    aria-label={t('customDistanceBands')}
                  />
                  <button
                    type="button"
                    onClick={() => router.replace(`${pathname}?${buildUrlParams().toString()}`, { scroll: false })}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDistanceBandsInput('30');
                      const p = buildUrlParams();
                      p.delete('distance_bands');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('resetToDefault')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={compareMode ? 'grid grid-cols-1 xl:grid-cols-2 gap-8' : ''}>
        {columns.map((col, colIdx) => {
          const colData = col.data;
          const colBandChartData = buildBandChartData(colData);
          const colOccupancyChartData = buildOccupancyChartData(colData);
          const colHasOccupancyData = colOccupancyChartData.some((b) => b['Avg Occupancy %'] != null);
          const colAnchorType = colIdx === 0 && compareMode
            ? (searchParams.get('anchor_a_type') !== 'national-parks' ? 'ski' : 'national-parks')
            : colIdx === 1 && compareMode
              ? (searchParams.get('anchor_b_type') !== 'national-parks' ? 'ski' : 'national-parks')
              : anchorType;

          return (
            <InsightsColumn
              key={colIdx}
              colData={colData}
              colBandChartData={colBandChartData}
              colOccupancyChartData={colOccupancyChartData}
              colHasOccupancyData={colHasOccupancyData}
              colLabel={col.label}
              typeLabel={col.typeLabel}
              colAnchorType={colAnchorType}
              compareMode={compareMode}
              season={season}
              setSeason={setSeason}
              seasonLabels={seasonLabels}
              onAnchorClick={(anchor) => {
                const p = buildUrlParams();
                if (compareMode) {
                  if (colIdx === 0) {
                    p.delete('anchor_a_id');
                    p.delete('anchor_a_slug');
                    if (anchor.slug) p.set('anchor_a_slug', anchor.slug);
                    else p.set('anchor_a_id', String(anchor.id));
                  } else {
                    p.delete('anchor_b_id');
                    p.delete('anchor_b_slug');
                    if (anchor.slug) p.set('anchor_b_slug', anchor.slug);
                    else p.set('anchor_b_id', String(anchor.id));
                  }
                } else {
                  if (colAnchorType === 'national-parks') {
                    p.delete('anchor_id');
                    p.set('anchor_slug', anchor.slug ?? '');
                  } else {
                    p.delete('anchor_slug');
                    p.set('anchor_id', String(anchor.id));
                  }
                }
                router.replace(`${pathname}?${p.toString()}`, { scroll: false });
              }}
            />
          );
        })}
        </div>
      </div>
      </GoogleMapsProvider>
    </main>
  );
}
