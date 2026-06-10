'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Download, RefreshCw, RotateCcw } from 'lucide-react';
import { STATE_ABBREVIATIONS } from '@/components/map/utils/stateUtils';
import { InsightsSkeleton } from './components/InsightsSkeleton';
import { InsightsColumnSkeleton } from './components/InsightsColumnSkeleton';
import { DataQualityStrip } from './components/DataQualityStrip';
import { CompareDiffPanel } from './components/CompareDiffPanel';
import {
  anchorSearchPlaceholder,
  anchorTypePluralLabel,
  anchorTypeSingularLabel,
  parseProximityAnchorType,
} from './anchor-type-labels';
import type { AnchorType, InsightsData, PropertyTypeFilter, Season } from './types';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import {
  buildProximityInsightsApiQueryString,
  readProximityInsightsSessionCache,
  writeProximityInsightsSessionCache,
  PROXIMITY_INSIGHTS_SESSION_CACHE_MS,
} from '@/lib/admin/proximity-insights-session-cache';

const InsightsColumn = dynamic(
  () => import('./components/InsightsColumn').then((m) => ({ default: m.InsightsColumn })),
  { loading: () => <InsightsColumnSkeleton /> }
);

const SearchableAnchorSelect = dynamic(() => import('@/components/SearchableAnchorSelect'), {
  ssr: false,
  loading: () => (
    <div
      className="h-10 min-w-[160px] rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
      aria-hidden
    />
  ),
});

const CANADIAN_PROVINCE_CODES = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']);
const US_STATE_OPTIONS = Object.entries(STATE_ABBREVIATIONS)
  .filter(([code]) => !CANADIAN_PROVINCE_CODES.has(code))
  .sort(([, a], [, b]) => a.localeCompare(b))
  .map(([code, name]) => ({ code, name }));

function buildBandChartData(d: InsightsData, season: Season, seasonLabels: Record<Season, string>) {
  const getWeekdayKey = (s: Season) => `avg_${s}_weekday` as keyof InsightsData['by_band'][number];
  const getWeekendKey = (s: Season) => `avg_${s}_weekend` as keyof InsightsData['by_band'][number];
  return d.by_band.map((b) => {
    const wd = b[getWeekdayKey(season)] as number | null | undefined;
    const we = b[getWeekendKey(season)] as number | null | undefined;
    return {
      band: `${b.band} mi`,
      count: b.count,
      [`Avg ${seasonLabels[season]} Weekday`]: wd ?? null,
      [`Avg ${seasonLabels[season]} Weekend`]: we ?? null,
    };
  });
}

function buildOccupancyChartData(d: InsightsData) {
  return d.by_band.map((b) => {
    const occ = b.avg_occupancy_2025 ?? b.avg_occupancy_2024 ?? b.avg_occupancy_2026;
    return { band: `${b.band} mi`, count: b.count, 'Avg Occupancy %': occ };
  });
}

function anchorsForSelect(data: InsightsData | null | undefined) {
  return data?.anchors_for_select ?? data?.anchors_with_property_counts ?? [];
}

async function remoteAnchorSearch(anchorType: AnchorType, q: string) {
  const params = new URLSearchParams({ anchor_type: anchorType, q, limit: '50' });
  const res = await fetch(`/api/admin/anchor-point-insights/anchors?${params}`);
  const json = (await res.json()) as { success?: boolean; anchors?: InsightsData['anchors_with_property_counts'] };
  if (!json.success || !Array.isArray(json.anchors)) return [];
  return json.anchors;
}

function ProximityInsightsPageContent() {
  const t = useTranslations('anchorPointInsights');
  const searchParams = useSearchParams();
  const [anchorType, setAnchorType] = useState<AnchorType>('ski');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>('glamping');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [season, setSeason] = useState<Season>('winter');
  const [anchorFilter, setAnchorFilter] = useState<{ id?: number; slug?: string } | null>(null);
  const [distanceBandsInput, setDistanceBandsInput] = useState<string>('30');
  const [locationInput, setLocationInput] = useState('');
  const [radiusMiInput, setRadiusMiInput] = useState('');
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
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchGenRef = useRef(0);

  useEffect(() => {
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, []);

  const searchAnchorsRemote = useCallback(
    (type: AnchorType) => (q: string) => remoteAnchorSearch(type, q),
    []
  );

  useEffect(() => {
    const compare = searchParams.get('compare') === 'true';
    setCompareMode(compare);

    if (!compare) {
      setAnchorType(parseProximityAnchorType(searchParams.get('anchor_type')));
    }

    const state = searchParams.get('state')?.trim().toUpperCase() || null;
    setStateFilter(state || null);
    const bands = searchParams.get('distance_bands')?.trim() || '';
    setDistanceBandsInput(bands || '30');
    setLocationInput(searchParams.get('location')?.trim() || '');
    setRadiusMiInput(searchParams.get('radius_mi')?.trim() || '');
    const typeParam = (searchParams.get('type') || 'glamping').toLowerCase();
    setPropertyTypeFilter(typeParam === 'rv' || typeParam === 'all' ? typeParam : 'glamping');
  }, [searchParams]);

  useEffect(() => {
    const anchorId = searchParams.get('anchor_id');
    const anchorSlug = searchParams.get('anchor_slug');
    if (anchorType === 'national-parks' && anchorSlug) {
      setAnchorFilter({ slug: anchorSlug });
    } else if ((anchorType === 'ski' || anchorType === 'wineries') && anchorId) {
      const id = parseInt(anchorId, 10);
      setAnchorFilter(isNaN(id) ? null : { id });
    } else {
      setAnchorFilter(null);
    }
  }, [searchParams, anchorType]);

  const prevAnchorTypeRef = useRef(anchorType);
  useEffect(() => {
    if (prevAnchorTypeRef.current !== anchorType) {
      prevAnchorTypeRef.current = anchorType;
      setAnchorFilter(null);
    }
  }, [anchorType]);

  const sessionQueryKey = buildProximityInsightsApiQueryString({
    searchParams,
    compareMode,
    anchorType,
    propertyTypeFilter,
    stateFilter,
    anchorFilter,
  });

  useLayoutEffect(() => {
    const cached = readProximityInsightsSessionCache(sessionQueryKey, PROXIMITY_INSIGHTS_SESSION_CACHE_MS);
    if (cached) {
      setError(null);
      if (cached.mode === 'compare') {
        setCompareData({ insights_a: cached.insights_a, insights_b: cached.insights_b });
        setData(null);
      } else {
        setData(cached.insights);
        setCompareData(null);
      }
      setLoading(false);
    } else {
      setLoading(true);
      setData(null);
      setCompareData(null);
    }
  }, [sessionQueryKey]);

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!opts?.force) {
        const cached = readProximityInsightsSessionCache(
          sessionQueryKey,
          PROXIMITY_INSIGHTS_SESSION_CACHE_MS
        );
        if (cached) {
          setError(null);
          if (cached.mode === 'compare') {
            setCompareData({ insights_a: cached.insights_a, insights_b: cached.insights_b });
            setData(null);
          } else {
            setData(cached.insights);
            setCompareData(null);
          }
          setLoading(false);
          return;
        }
      }

      fetchAbortRef.current?.abort();
      const ac = new AbortController();
      fetchAbortRef.current = ac;
      const generation = ++fetchGenRef.current;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('type', propertyTypeFilter);
        if (stateFilter) params.set('state', stateFilter);
        const appliedBands = searchParams.get('distance_bands')?.trim();
        if (appliedBands) params.set('distance_bands', appliedBands);
        const appliedLocation = searchParams.get('location')?.trim();
        if (appliedLocation) params.set('location', appliedLocation);
        const appliedRadiusMi = searchParams.get('radius_mi')?.trim();
        if (appliedRadiusMi) params.set('radius_mi', appliedRadiusMi);

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

          const res = await fetch(`/api/admin/anchor-point-insights?${params}`, {
            signal: ac.signal,
          });
          const json = await res.json();
          if (generation !== fetchGenRef.current) return;
          if (json.success && json.insights_a && json.insights_b) {
            setCompareData({ insights_a: json.insights_a, insights_b: json.insights_b });
            setData(null);
            setError(null);
            writeProximityInsightsSessionCache(sessionQueryKey, {
              mode: 'compare',
              insights_a: json.insights_a,
              insights_b: json.insights_b,
            });
          } else {
            setCompareData(null);
            setData(null);
            setError(json.message || json.error || 'Failed to load compare');
          }
        } else {
          params.set('anchor_type', anchorType);
          if (anchorFilter?.id != null) params.set('anchor_id', String(anchorFilter.id));
          if (anchorFilter?.slug) params.set('anchor_slug', anchorFilter.slug);

          const res = await fetch(`/api/admin/anchor-point-insights?${params}`, {
            signal: ac.signal,
          });
          const json = await res.json();
          if (generation !== fetchGenRef.current) return;
          if (json.success) {
            setData(json.insights);
            setCompareData(null);
            setError(null);
            writeProximityInsightsSessionCache(sessionQueryKey, {
              mode: 'single',
              insights: json.insights,
            });
          } else {
            setData(null);
            setError(json.message || json.error || 'Failed to load insights');
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        if (generation !== fetchGenRef.current) return;
        setError(t('networkError'));
      } finally {
        if (generation === fetchGenRef.current) setLoading(false);
      }
    },
    [anchorType, propertyTypeFilter, stateFilter, anchorFilter, compareMode, searchParams, sessionQueryKey, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const buildUrlParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set('type', propertyTypeFilter);
    if (stateFilter) p.set('state', stateFilter);
    if (distanceBandsInput.trim() && distanceBandsInput.trim() !== '30') {
      p.set('distance_bands', distanceBandsInput.trim());
    }
    const loc = locationInput.trim();
    if (loc) {
      p.set('location', loc);
      const radius = radiusMiInput.trim();
      if (radius) p.set('radius_mi', radius);
      else p.delete('radius_mi');
    } else {
      p.delete('location');
      p.delete('radius_mi');
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
  }, [
    anchorType,
    propertyTypeFilter,
    stateFilter,
    anchorFilter,
    distanceBandsInput,
    locationInput,
    radiusMiInput,
    compareMode,
    searchParams,
  ]);

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

  const exportInsights = useCallback(
    async (
      insights: InsightsData | undefined,
      kind: 'property_sample' | 'by_state',
      sheetName: string,
      filePrefix: string
    ) => {
      if (!insights) return;
      const rows = kind === 'by_state' ? insights.by_state : insights.property_sample;
      if (!rows?.length) return;
      const { default: XLSX } = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    },
    []
  );

  const handleExportPropertySampleA = useCallback(async () => {
    const insights = compareMode ? compareData?.insights_a : data;
    if (!insights?.property_sample?.length) return;
    setExportOpen(false);
    await exportInsights(insights, 'property_sample', 'Property Sample', 'anchor-insights-property-sample-a');
  }, [compareMode, compareData, data, exportInsights]);

  const handleExportPropertySampleB = useCallback(async () => {
    if (!compareData?.insights_b?.property_sample?.length) return;
    setExportOpen(false);
    await exportInsights(
      compareData.insights_b,
      'property_sample',
      'Property Sample',
      'anchor-insights-property-sample-b'
    );
  }, [compareData, exportInsights]);

  const handleExportByStateA = useCallback(async () => {
    const insights = compareMode ? compareData?.insights_a : data;
    if (!insights?.by_state?.length) return;
    setExportOpen(false);
    await exportInsights(insights, 'by_state', 'By State', 'anchor-insights-by-state-a');
  }, [compareMode, compareData, data, exportInsights]);

  const handleExportByStateB = useCallback(async () => {
    if (!compareData?.insights_b?.by_state?.length) return;
    setExportOpen(false);
    await exportInsights(compareData.insights_b, 'by_state', 'By State', 'anchor-insights-by-state-b');
  }, [compareData, exportInsights]);

  const handleExportFull = useCallback(async () => {
    if (compareMode) return;
    setExportOpen(false);
    setExportingFull(true);
    try {
      const params = new URLSearchParams({ anchor_type: anchorType, type: propertyTypeFilter });
      if (stateFilter) params.set('state', stateFilter);
      if (anchorFilter?.id != null) params.set('anchor_id', String(anchorFilter.id));
      if (anchorFilter?.slug) params.set('anchor_slug', anchorFilter.slug);
      const appliedBands = searchParams.get('distance_bands')?.trim();
      if (appliedBands) params.set('distance_bands', appliedBands);
      const appliedLocation = searchParams.get('location')?.trim();
      if (appliedLocation) params.set('location', appliedLocation);
      const appliedRadiusMi = searchParams.get('radius_mi')?.trim();
      if (appliedRadiusMi) params.set('radius_mi', appliedRadiusMi);
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

  const seasonLabels = useMemo<Record<Season, string>>(
    () => ({
      winter: t('winter'),
      spring: t('spring'),
      summer: t('summer'),
      fall: t('fall'),
    }),
    [t]
  );

  if (loading && !data && !compareData) {
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
              <a href="/admin" className="text-sage-600 hover:underline">
                {t('signInToAdmin')}
              </a>
            </p>
          )}
          {error && (
            <button
              onClick={() => void load({ force: true })}
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

  const leftData = compareMode ? compareData!.insights_a : data!;
  const rightData = compareMode ? compareData!.insights_b : null;

  const columns = compareMode && rightData
    ? [
        {
          data: leftData,
          label: t('leftColumn'),
          typeLabel: anchorTypeSingularLabel(parseProximityAnchorType(searchParams.get('anchor_a_type')), t),
        },
        {
          data: rightData,
          label: t('rightColumn'),
          typeLabel: anchorTypeSingularLabel(parseProximityAnchorType(searchParams.get('anchor_b_type')), t),
        },
      ]
    : [{ data: leftData, label: null, typeLabel: anchorTypeSingularLabel(anchorType, t) }];

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className={adminPageHeadingMargin}>
          <h1 className={`${adminPageTitle} mb-1`}>
            {compareMode
              ? t('compare')
              : leftData.selected_anchor
                ? t('titleWithAnchor', { anchorName: leftData.selected_anchor.name })
                : t('title')}
          </h1>
          <p className={`${adminPageDescription} mb-4`}>
            {compareMode
              ? t('subtitle')
              : leftData.selected_anchor
                ? t('subtitleWithAnchor', { anchorName: leftData.selected_anchor.name })
                : t('subtitle')}
          </p>
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
                  <button
                    onClick={() => {
                      setAnchorType('wineries');
                      const p = buildUrlParams();
                      p.set('anchor_type', 'wineries');
                      p.delete('anchor_id');
                      p.delete('anchor_slug');
                      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      anchorType === 'wineries'
                        ? 'bg-sage-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t('wineries')}
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
              className="px-3 py-2 rounded-lg text-sm border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent"
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
                    className="px-3 py-2 rounded-lg text-sm border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100"
                  >
                    <option value="ski">{t('skiResorts')}</option>
                    <option value="national-parks">{t('nationalParks')}</option>
                    <option value="wineries">{t('wineries')}</option>
                  </select>
                  <SearchableAnchorSelect
                    anchors={anchorsForSelect(compareData?.insights_a)}
                    anchorType={parseProximityAnchorType(searchParams.get('anchor_a_type'))}
                    onRemoteSearch={searchAnchorsRemote(
                      parseProximityAnchorType(searchParams.get('anchor_a_type'))
                    )}
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
                    searchPlaceholder={anchorSearchPlaceholder(
                      parseProximityAnchorType(searchParams.get('anchor_a_type')),
                      t
                    )}
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
                    className="px-3 py-2 rounded-lg text-sm border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100"
                  >
                    <option value="ski">{t('skiResorts')}</option>
                    <option value="national-parks">{t('nationalParks')}</option>
                    <option value="wineries">{t('wineries')}</option>
                  </select>
                  <SearchableAnchorSelect
                    anchors={anchorsForSelect(compareData?.insights_b)}
                    anchorType={parseProximityAnchorType(searchParams.get('anchor_b_type'))}
                    onRemoteSearch={searchAnchorsRemote(
                      parseProximityAnchorType(searchParams.get('anchor_b_type'))
                    )}
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
                    searchPlaceholder={anchorSearchPlaceholder(
                      parseProximityAnchorType(searchParams.get('anchor_b_type')),
                      t
                    )}
                    className="min-w-[160px]"
                    aria-label={t('compareAnchorB')}
                  />
                </div>
              </>
            ) : (
              <SearchableAnchorSelect
                anchors={anchorsForSelect(data)}
                anchorType={anchorType}
                onRemoteSearch={searchAnchorsRemote(anchorType)}
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
                allLabel={`${t('allAnchors')} ${anchorTypePluralLabel(anchorType, t)}`}
                searchPlaceholder={anchorSearchPlaceholder(anchorType, t)}
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
                setLocationInput('');
                setRadiusMiInput('');
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
              onClick={() => void load({ force: true })}
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
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[260px] bg-white dark:bg-neutral-950 border border-neutral-200/75 dark:border-neutral-800 rounded-lg shadow-lg z-50">
                  <button
                    type="button"
                    onClick={() => void handleExportPropertySampleA()}
                    disabled={!(compareMode ? compareData?.insights_a : data)?.property_sample?.length}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {compareMode ? t('exportPropertySampleA') : t('exportPropertySample')}
                  </button>
                  {compareMode && (
                    <button
                      type="button"
                      onClick={() => void handleExportPropertySampleB()}
                      disabled={!compareData?.insights_b?.property_sample?.length}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('exportPropertySampleB')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleExportByStateA()}
                    disabled={!(compareMode ? compareData?.insights_a : data)?.by_state?.length}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {compareMode ? t('exportByStateA') : t('exportByState')}
                  </button>
                  {compareMode && (
                    <button
                      type="button"
                      onClick={() => void handleExportByStateB()}
                      disabled={!compareData?.insights_b?.by_state?.length}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('exportByStateB')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleExportFull()}
                    disabled={exportingFull || compareMode}
                    title={compareMode ? t('exportFullCompareDisabled') : undefined}
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
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        router.replace(`${pathname}?${buildUrlParams().toString()}`, { scroll: false })
                      }
                      placeholder={t('locationPlaceholder')}
                      className="px-3 py-2 rounded-lg text-sm border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent min-w-[200px] flex-1"
                      aria-label={t('locationPlaceholder')}
                    />
                    <input
                      type="number"
                      min={1}
                      max={250}
                      value={radiusMiInput}
                      onChange={(e) => setRadiusMiInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        router.replace(`${pathname}?${buildUrlParams().toString()}`, { scroll: false })
                      }
                      placeholder={t('areaRadiusPlaceholder')}
                      className="px-3 py-2 rounded-lg text-sm border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent w-24"
                      aria-label={t('areaRadiusMi')}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {t('areaRadiusMi')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={distanceBandsInput}
                      onChange={(e) => setDistanceBandsInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        router.replace(`${pathname}?${buildUrlParams().toString()}`, { scroll: false })
                      }
                      placeholder={t('distanceBandsPlaceholder')}
                      className="px-3 py-2 rounded-lg text-sm border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent w-36"
                      aria-label={t('customDistanceBands')}
                    />
                    <button
                      type="button"
                      onClick={() => router.replace(`${pathname}?${buildUrlParams().toString()}`, { scroll: false })}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 transition-colors"
                    >
                      {t('apply')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDistanceBandsInput('30');
                        setLocationInput('');
                        setRadiusMiInput('');
                        const p = buildUrlParams();
                        p.delete('distance_bands');
                        p.delete('location');
                        p.delete('radius_mi');
                        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('resetToDefault')}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl">{t('areaFilterHint')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {compareMode && compareData && (
          <CompareDiffPanel
            insightsA={compareData.insights_a}
            insightsB={compareData.insights_b}
            labelA={anchorTypeSingularLabel(
              parseProximityAnchorType(searchParams.get('anchor_a_type')),
              t
            )}
            labelB={anchorTypeSingularLabel(
              parseProximityAnchorType(searchParams.get('anchor_b_type')),
              t
            )}
          />
        )}

        {(compareMode ? compareData?.insights_a?.area_filter : data?.area_filter) && (
          <p className="mb-4 rounded-lg border border-sage-200 dark:border-sage-800 bg-sage-50 dark:bg-sage-950/40 px-4 py-3 text-sm text-sage-900 dark:text-sage-100">
            {t('areaFilterActive', {
              radius: compareMode
                ? compareData!.insights_a.area_filter!.radius_mi
                : data!.area_filter!.radius_mi,
              location: compareMode
                ? compareData!.insights_a.area_filter!.label
                : data!.area_filter!.label,
            })}
          </p>
        )}

        {(compareMode ? compareData?.insights_a?.data_quality : data?.data_quality) && (
          <DataQualityStrip
            dataQuality={
              (compareMode ? compareData?.insights_a?.data_quality : data?.data_quality)!
            }
          />
        )}

        <div className={compareMode ? 'grid grid-cols-1 xl:grid-cols-2 gap-8' : ''}>
          {columns.map((col, colIdx) => {
            const colBandChartData = buildBandChartData(col.data, season, seasonLabels);
            const colOccupancyChartData = buildOccupancyChartData(col.data);
            const colHasOccupancyData = colOccupancyChartData.some((b) => b['Avg Occupancy %'] != null);
            const colAnchorType: AnchorType =
              colIdx === 0 && compareMode
                ? parseProximityAnchorType(searchParams.get('anchor_a_type'))
                : colIdx === 1 && compareMode
                  ? parseProximityAnchorType(searchParams.get('anchor_b_type'))
                  : anchorType;

            return (
              <InsightsColumn
                key={colIdx}
                colData={col.data}
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
    </main>
  );
}

export default function ProximityInsightsClient() {
  return (
    <Suspense fallback={<InsightsSkeleton />}>
      <ProximityInsightsPageContent />
    </Suspense>
  );
}
