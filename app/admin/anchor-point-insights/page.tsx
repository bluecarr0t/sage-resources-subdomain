'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { MapPin, Mountain, DollarSign, Database, TrendingUp, Users, Building2, RefreshCw, RotateCcw } from 'lucide-react';
import { STATE_ABBREVIATIONS } from '@/components/map/utils/stateUtils';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import { AnchorPointMap } from '@/components/AnchorPointMap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const CANADIAN_PROVINCE_CODES = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']);
const US_STATE_OPTIONS = Object.entries(STATE_ABBREVIATIONS)
  .filter(([code]) => !CANADIAN_PROVINCE_CODES.has(code))
  .sort(([, a], [, b]) => a.localeCompare(b))
  .map(([code, name]) => ({ code, name }));

type AnchorType = 'ski' | 'national-parks';
type Season = 'winter' | 'spring' | 'summer' | 'fall';

interface InsightsData {
  anchor_type?: AnchorType;
  summary: {
    total_properties: number;
    properties_within_30_mi: number;
    anchors_count: number;
    avg_winter_rate: number | null;
    data_sources: number;
    avg_state_population_2020?: number | null;
    combined_state_gdp_2023?: number | null;
  };
  by_band: Array<{
    band: string;
    count: number;
    avg_winter_weekday: number | null;
    avg_winter_weekend: number | null;
    avg_spring_weekday?: number | null;
    avg_spring_weekend?: number | null;
    avg_summer_weekday?: number | null;
    avg_summer_weekend?: number | null;
    avg_fall_weekday?: number | null;
    avg_fall_weekend?: number | null;
    avg_occupancy_2024?: number | null;
    avg_occupancy_2025?: number | null;
    avg_occupancy_2026?: number | null;
  }>;
  by_source: Array<{
    source: string;
    count: number;
    avg_winter_rate: number | null;
  }>;
  by_state: Array<{
    state: string;
    count: number;
    avg_winter_rate: number | null;
    population_2020?: number | null;
    gdp_2023?: number | null;
  }>;
  trends: Array<{ year: number; avg: number; count: number }> | null;
  property_sample: Array<{
    property_name: string;
    source: string;
    state: string | null;
    distance_miles: number;
    drive_time_hours: number;
    winter_weekday: number | null;
    winter_weekend: number | null;
    nearest_anchor: string;
    state_population_2020?: number | null;
    state_gdp_2023?: number | null;
  }>;
  anchors_with_property_counts: Array<{
    anchor_id?: number;
    anchor_name: string;
    anchor_slug?: string;
    property_count_15_mi: number;
  }>;
  map_properties?: Array<{
    lat: number;
    lon: number;
    property_name: string;
    source: string;
    distance_miles: number;
    nearest_anchor: string;
    winter_weekday: number | null;
    winter_weekend: number | null;
  }>;
  map_anchors?: Array<{ id: number; name: string; lat: number; lon: number; slug?: string }>;
  selected_anchor?: { id: number; name: string; lat: number; lon: number; slug?: string };
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="p-2 bg-sage-50 dark:bg-sage-900/30 rounded-lg">
        <Icon className="w-5 h-5 text-sage-600 dark:text-sage-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function AnchorPointInsightsPage() {
  const t = useTranslations('anchorPointInsights');
  const searchParams = useSearchParams();
  const [anchorType, setAnchorType] = useState<AnchorType>('ski');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [season, setSeason] = useState<Season>('winter');
  const [anchorFilter, setAnchorFilter] = useState<{ id?: number; slug?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Sync URL to anchor type and state when searchParams change (e.g. initial load, shareable link)
  useEffect(() => {
    const type = searchParams.get('anchor_type')?.toLowerCase();
    if (type === 'national-parks' || type === 'ski') {
      setAnchorType(type);
    }
    const state = searchParams.get('state')?.trim().toUpperCase() || null;
    setStateFilter(state || null);
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
    try {
      const params = new URLSearchParams({ anchor_type: anchorType });
      if (stateFilter) params.set('state', stateFilter);
      if (anchorFilter?.id != null) params.set('anchor_id', String(anchorFilter.id));
      if (anchorFilter?.slug) params.set('anchor_slug', anchorFilter.slug);
      const res = await fetch(`/api/admin/anchor-point-insights?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.insights);
        setError(null);
      } else {
        setData(null);
        setError(json.message || json.error || 'Failed to load insights');
      }
    } catch (e) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [anchorType, stateFilter, anchorFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton: Header */}
          <div className="mb-8">
            <div className="h-9 w-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-full max-w-2xl bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="flex flex-wrap gap-3">
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>
          {/* Skeleton: Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
              >
                <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-9 h-9" />
                <div className="flex-1">
                  <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton: Chart */}
          <div className="mb-6 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
          {/* Skeleton: Two charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
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
  const getWeekdayKey = (s: Season) =>
    `avg_${s}_weekday` as keyof (typeof data.by_band)[0];
  const getWeekendKey = (s: Season) =>
    `avg_${s}_weekend` as keyof (typeof data.by_band)[0];
  const bandChartData = data.by_band.map((b) => {
    const wd = b[getWeekdayKey(season)] as number | null | undefined;
    const we = b[getWeekendKey(season)] as number | null | undefined;
    return {
      band: `${b.band} mi`,
      count: b.count,
      [`Avg ${seasonLabels[season]} Weekday`]: wd ?? null,
      [`Avg ${seasonLabels[season]} Weekend`]: we ?? null,
    };
  });

  const occupancyChartData = data.by_band.map((b) => {
    const occ = b.avg_occupancy_2025 ?? b.avg_occupancy_2024 ?? b.avg_occupancy_2026;
    return { band: `${b.band} mi`, count: b.count, 'Avg Occupancy %': occ };
  });
  const hasOccupancyData = occupancyChartData.some((b) => b['Avg Occupancy %'] != null);

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <GoogleMapsProvider>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {data.selected_anchor
              ? t('titleWithAnchor', { anchorName: data.selected_anchor.name })
              : t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {data.selected_anchor
              ? t('subtitleWithAnchor', { anchorName: data.selected_anchor.name })
              : t('subtitle')}
          </p>
          {/* Filters and actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAnchorType('ski');
                  const p = new URLSearchParams();
                  p.set('anchor_type', 'ski');
                  if (stateFilter) p.set('state', stateFilter);
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
                  const p = new URLSearchParams();
                  p.set('anchor_type', 'national-parks');
                  if (stateFilter) p.set('state', stateFilter);
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
            </div>
            <select
              value={stateFilter ?? ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setStateFilter(val);
                const p = new URLSearchParams();
                p.set('anchor_type', anchorType);
                if (val) p.set('state', val);
                if (anchorFilter?.id != null) p.set('anchor_id', String(anchorFilter.id));
                if (anchorFilter?.slug) p.set('anchor_slug', anchorFilter.slug);
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
            <select
              value={
                anchorFilter?.id != null
                  ? `id:${anchorFilter.id}`
                  : anchorFilter?.slug
                    ? `slug:${anchorFilter.slug}`
                    : ''
              }
              onChange={(e) => {
                const v = e.target.value;
                const buildParams = () => {
                  const p = new URLSearchParams();
                  p.set('anchor_type', anchorType);
                  if (stateFilter) p.set('state', stateFilter);
                  return p;
                };
                if (!v) {
                  setAnchorFilter(null);
                  const p = buildParams();
                  router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                  return;
                }
                if (v.startsWith('id:')) {
                  const id = parseInt(v.slice(3), 10);
                  if (!isNaN(id)) {
                    setAnchorFilter({ id });
                    const p = buildParams();
                    p.set('anchor_id', String(id));
                    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                  }
                } else if (v.startsWith('slug:')) {
                  const slug = v.slice(5);
                  if (slug) {
                    setAnchorFilter({ slug });
                    const p = buildParams();
                    p.set('anchor_slug', slug);
                    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
                  }
                }
              }}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent min-w-[200px]"
              aria-label={t('filterByAnchor')}
            >
              <option value="">
                {t('allAnchors')} {anchorType === 'national-parks' ? t('nationalParks') : t('skiResorts')}
              </option>
              {data.anchors_with_property_counts
                .filter(
                  (a) =>
                    (anchorType === 'ski' && a.anchor_id != null) ||
                    (anchorType === 'national-parks' && a.anchor_slug)
                )
                .map((a) => (
                  <option
                    key={a.anchor_id ?? a.anchor_slug ?? a.anchor_name}
                    value={
                      anchorType === 'ski' && a.anchor_id != null
                        ? `id:${a.anchor_id}`
                        : anchorType === 'national-parks' && a.anchor_slug
                          ? `slug:${a.anchor_slug}`
                          : ''
                    }
                  >
                    {a.anchor_name} ({a.property_count_15_mi})
                  </option>
                ))}
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </button>
          </div>
        </div>

        {/* Map */}
        {(data.map_properties?.length ?? 0) > 0 || (data.map_anchors?.length ?? 0) > 0 ? (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('propertiesAndAnchors', {
                type: anchorType === 'national-parks' ? t('nationalParks') : t('skiResorts'),
              })}
            </h2>
            <AnchorPointMap
              mapProperties={data.map_properties ?? []}
              mapAnchors={data.map_anchors ?? []}
              anchorsWithCounts={data.anchors_with_property_counts}
              onAnchorClick={(anchor) => {
                const p = new URLSearchParams();
                p.set('anchor_type', anchorType);
                if (stateFilter) p.set('state', stateFilter);
                if (anchorType === 'national-parks' && anchor.slug) {
                  p.set('anchor_slug', anchor.slug);
                } else if (anchorType === 'ski') {
                  p.set('anchor_id', String(anchor.id));
                }
                router.replace(`${pathname}?${p.toString()}`, { scroll: false });
              }}
            />
          </div>
        ) : null}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <StatCard label={t('totalProperties')} value={data.summary.total_properties} icon={MapPin} />
          <StatCard
            label={t('within30Mi', { type: anchorType === 'national-parks' ? t('parks') : t('ski') })}
            value={data.summary.properties_within_30_mi}
            icon={Mountain}
          />
          <StatCard
            label={anchorType === 'national-parks' ? t('nationalParks') : t('skiResorts')}
            value={data.summary.anchors_count}
            icon={Mountain}
          />
          <StatCard
            label={t('avgWinterRate')}
            value={data.summary.avg_winter_rate != null ? `$${data.summary.avg_winter_rate}` : '—'}
            icon={DollarSign}
          />
          <StatCard label={t('dataSources')} value={data.summary.data_sources} icon={Database} />
          <StatCard
            label={t('meanStatePop')}
            value={
              data.summary.avg_state_population_2020 != null
                ? data.summary.avg_state_population_2020.toLocaleString()
                : '—'
            }
            icon={Users}
          />
          <StatCard
            label={t('combinedStateGDP')}
            value={
              data.summary.combined_state_gdp_2023 != null
                ? data.summary.combined_state_gdp_2023 >= 1_000_000
                  ? `$${(data.summary.combined_state_gdp_2023 / 1_000_000).toFixed(1)}B`
                  : `$${(data.summary.combined_state_gdp_2023 / 1000).toFixed(0)}M`
                : '—'
            }
            icon={Building2}
          />
        </div>

        {/* Charts Row 1: Seasonal Rates by Distance Band */}
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('avgRatesByDistance', {
                type: anchorType === 'national-parks' ? t('nationalPark') : t('skiResort'),
              })}
            </h2>
            <div className="flex gap-2">
              {(['winter', 'spring', 'summer', 'fall'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    season === s
                      ? 'bg-sage-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {seasonLabels[s]}
                </button>
              ))}
            </div>
          </div>
          {bandChartData.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">{t('noDataYet')}</p>
          ) : (
            <div
              role="img"
              aria-label={t('avgRatesByDistance', {
                type: anchorType === 'national-parks' ? t('nationalPark') : t('skiResort'),
              })}
            >
              <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={bandChartData}
                margin={{ top: 5, right: 20, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `$${v}`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [value != null ? `$${value}` : '-', '']}
                />
                <Legend verticalAlign="top" />
                <Bar
                  dataKey={`Avg ${seasonLabels[season]} Weekday`}
                  name={`Avg ${seasonLabels[season]} Weekday`}
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={`Avg ${seasonLabels[season]} Weekend`}
                  name={`Avg ${seasonLabels[season]} Weekend`}
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Occupancy by Distance Band */}
        {hasOccupancyData && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('avgOccupancyByDistance', {
                type: anchorType === 'national-parks' ? t('nationalPark') : t('skiResort'),
              })}
            </h2>
            <div
              role="img"
              aria-label={t('avgOccupancyByDistance', {
                type: anchorType === 'national-parks' ? t('nationalPark') : t('skiResort'),
              })}
            >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={occupancyChartData}
                margin={{ top: 5, right: 20, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [value != null ? `${value}%` : '-', '']}
                />
                <Legend verticalAlign="top" />
                <Bar dataKey="Avg Occupancy %" name="Avg Occupancy %" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Charts Row 2: Property Count by Source + Winter Rates by State */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('propertyCountBySource')}
            </h2>
            {data.by_source.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">{t('noDataYet')}</p>
            ) : (
              <div role="img" aria-label={t('propertyCountBySource')}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.by_source}
                  margin={{ top: 5, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="source"
                    angle={-45}
                    textAnchor="end"
                    tick={{ fontSize: 11 }}
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Properties" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('avgWinterRateByState')}
            </h2>
            {data.by_state.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">{t('noDataYet')}</p>
            ) : (
              <div role="img" aria-label={t('avgWinterRateByState')}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.by_state.slice(0, 10)}
                  margin={{ top: 5, right: 20, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v: number) => `$${v}`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [value != null ? `$${value}` : '-', 'Avg Winter Rate']}
                  />
                  <Bar dataKey="avg_winter_rate" name="Avg Winter Rate" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* State Metrics Table (with Population and GDP) */}
        {data.by_state.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('stateMetrics')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('state')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('properties')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('avgWinterRate')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('population2020')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('gdp2023')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.by_state.slice(0, 15).map((s) => (
                    <tr key={s.state}>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                        {s.state}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {s.count}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {s.avg_winter_rate != null ? `$${s.avg_winter_rate}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {s.population_2020 != null
                          ? s.population_2020.toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {s.gdp_2023 != null
                          ? s.gdp_2023 >= 1_000_000
                            ? `$${(s.gdp_2023 / 1_000_000).toFixed(1)}B`
                            : `$${(s.gdp_2023 / 1000).toFixed(0)}M`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Trends Line Chart */}
        {data.trends && data.trends.length >= 2 && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sage-600" />
              {t('yearOverYearTrend')}
            </h2>
            <div role="img" aria-label={t('yearOverYearTrend')}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={data.trends}
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `$${v}`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(value) => [`$${value}`, 'Avg Rate']} />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="Avg Rate"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('topProperties')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('property')}
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('source')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('distMi')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('winterRate')}
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('nearestAnchor')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.property_sample.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                        {t('noPropertiesWithin30')}
                      </td>
                    </tr>
                  ) : (
                    data.property_sample.map((p) => (
                      <tr key={`${p.property_name}-${p.source}-${p.distance_miles}-${p.nearest_anchor}`}>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
                          {p.property_name}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.source}</td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                          {p.distance_miles}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-200">
                          {(p.winter_weekend ?? p.winter_weekday) != null
                            ? `$${p.winter_weekend ?? p.winter_weekday}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                          {p.nearest_anchor}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('anchorsWithProperties', {
                type: anchorType === 'national-parks' ? t('nationalParks') : t('skiResorts'),
              })}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {anchorType === 'national-parks' ? t('nationalPark') : t('skiResort')}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {t('properties15Mi')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.anchors_with_property_counts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                        {t('noAnchorsWithProperties', {
                          type: anchorType === 'national-parks' ? t('nationalParks').toLowerCase() : t('skiResorts').toLowerCase(),
                        })}
                      </td>
                    </tr>
                  ) : (
                    data.anchors_with_property_counts.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                          {s.anchor_name}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                          {s.property_count_15_mi}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
      </GoogleMapsProvider>
    </main>
  );
}
