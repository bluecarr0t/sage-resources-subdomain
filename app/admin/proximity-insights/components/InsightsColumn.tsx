'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { MapPin, Mountain, DollarSign, TrendingUp } from 'lucide-react';
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
import { StatCard } from './StatCard';
import type { InsightsData, Season } from '../types';
import { MAX_STATE_ROWS } from '@/lib/anchor-point-insights/constants';

interface InsightsColumnProps {
  colData: InsightsData;
  colBandChartData: Array<Record<string, unknown>>;
  colOccupancyChartData: Array<Record<string, unknown>>;
  colHasOccupancyData: boolean;
  colLabel: string | null;
  typeLabel: string;
  colAnchorType: 'ski' | 'national-parks';
  compareMode: boolean;
  season: Season;
  setSeason: (s: Season) => void;
  seasonLabels: Record<Season, string>;
  onAnchorClick: (anchor: { id: number; slug?: string }) => void;
}

export function InsightsColumn({
  colData,
  colBandChartData,
  colOccupancyChartData,
  colHasOccupancyData,
  colLabel,
  typeLabel,
  colAnchorType,
  compareMode,
  season,
  setSeason,
  seasonLabels,
  onAnchorClick,
}: InsightsColumnProps) {
  const t = useTranslations('anchorPointInsights');

  return (
    <div className={compareMode ? 'min-w-0' : ''}>
      {compareMode && colLabel && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{colLabel}</h2>
      )}
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label={t('totalUnits')} value={colData.summary.total_units} icon={MapPin} />
        <StatCard
          label={t('withinXMi', {
            distance: colData.summary.within_mi_threshold ?? 30,
            type: colAnchorType === 'national-parks' ? t('parks') : t('ski'),
          })}
          value={colData.summary.units_within_x_mi ?? colData.summary.properties_within_30_mi}
          icon={Mountain}
        />
        <StatCard
          label={colAnchorType === 'national-parks' ? t('nationalParks') : t('skiResorts')}
          value={colData.summary.anchors_count}
          icon={Mountain}
        />
        <StatCard
          label={t('avgWinterRate')}
          value={colData.summary.avg_winter_rate != null ? `$${colData.summary.avg_winter_rate}` : '—'}
          icon={DollarSign}
          tooltip={
            colData.summary.units_with_winter_rates != null && colData.summary.total_units > 0
              ? t('avgWinterRateTooltip', {
                  withRates: colData.summary.units_with_winter_rates,
                  total: colData.summary.total_units,
                })
              : undefined
          }
        />
      </div>

      {/* Map */}
      {(colData.map_properties?.length ?? 0) > 0 || (colData.map_anchors?.length ?? 0) > 0 ? (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('propertiesAndAnchors', {
              type: colAnchorType === 'national-parks' ? t('nationalParks') : t('skiResorts'),
            })}
          </h2>
          <AnchorPointMap
            mapProperties={colData.map_properties ?? []}
            mapAnchors={colData.map_anchors ?? []}
            anchorsWithCounts={colData.anchors_with_property_counts}
            onAnchorClick={onAnchorClick}
          />
        </div>
      ) : null}

      {/* Charts Row 1: Seasonal Rates by Distance Band */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('avgRatesByDistance', { type: typeLabel })}
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
        {colBandChartData.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">{t('noDataYet')}</p>
        ) : (
          <div role="img" aria-label={t('avgRatesByDistance', { type: typeLabel })}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={colBandChartData} margin={{ top: 5, right: 20, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | undefined) => [value != null ? `$${value}` : '—', '']}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]?.payload) return null;
                    const p = payload[0].payload as { band: string; count: number; [k: string]: unknown };
                    const wdKey = `Avg ${seasonLabels[season]} Weekday`;
                    const weKey = `Avg ${seasonLabels[season]} Weekend`;
                    const wd = p[wdKey] as number | null | undefined;
                    const we = p[weKey] as number | null | undefined;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{p.band}</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {t('bandTooltipProperties', { count: p.count })}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {wdKey}: {wd != null ? `$${wd}` : '—'}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {weKey}: {we != null ? `$${we}` : '—'}
                        </p>
                      </div>
                    );
                  }}
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
      {colHasOccupancyData && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('avgOccupancyByDistance', { type: typeLabel })}
          </h2>
          <div role="img" aria-label={t('avgOccupancyByDistance', { type: typeLabel })}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={colOccupancyChartData}
                margin={{ top: 5, right: 20, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | undefined) => [value != null ? `${value}%` : '—', '']}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]?.payload) return null;
                    const p = payload[0].payload as {
                      band: string;
                      count: number;
                      'Avg Occupancy %': number | null | undefined;
                    };
                    const occ = p['Avg Occupancy %'];
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{p.band}</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {t('bandTooltipProperties', { count: p.count })}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          Avg Occupancy: {occ != null ? `${occ}%` : '—'}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" />
                <Bar dataKey="Avg Occupancy %" name="Avg Occupancy %" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Charts Row 2: Units by Source + Winter Rates by State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('unitsBySource')}
          </h2>
          {colData.by_source.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">{t('noDataYet')}</p>
          ) : (
            <div role="img" aria-label={t('unitsBySource')}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={colData.by_source.map((s) => ({ ...s, units: s.units ?? s.count }))}
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
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]?.payload) return null;
                      const p = payload[0].payload as {
                        source: string;
                        units?: number;
                        count_with_winter_rates?: number;
                      };
                      const total = p.units ?? 0;
                      const withRates = p.count_with_winter_rates ?? 0;
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{p.source}</p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {t('sourceTooltipUnits', { total, withRates })}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="units" name={t('units')} fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {colAnchorType === 'national-parks' ? t('avgRateByState') : t('avgWinterRateByState')}
          </h2>
          {colData.by_state.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">{t('noDataYet')}</p>
          ) : (
            <div
              role="img"
              aria-label={
                colAnchorType === 'national-parks' ? t('avgRateByState') : t('avgWinterRateByState')
              }
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={colData.by_state.slice(0, MAX_STATE_ROWS)}
                  margin={{ top: 5, right: 20, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v: number) => `$${v}`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      value != null ? `$${value}` : '-',
                      colAnchorType === 'national-parks' ? t('avgRate') : t('avgWinterRate'),
                    ]}
                  />
                  <Bar
                    dataKey={colAnchorType === 'national-parks' ? 'avg_rate' : 'avg_winter_rate'}
                    name={colAnchorType === 'national-parks' ? t('avgRate') : t('avgWinterRate')}
                    fill="#0891b2"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* State Metrics Table */}
      {colData.by_state.length > 0 && (
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
                    {colAnchorType === 'national-parks' ? t('avgRate') : t('avgWinterRate')}
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
                {colData.by_state.slice(0, MAX_STATE_ROWS).map((s) => (
                  <tr key={s.state}>
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                      {s.state}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      {s.count}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      {(s.avg_rate ?? s.avg_winter_rate) != null
                        ? `$${s.avg_rate ?? s.avg_winter_rate}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      {s.population_2020 != null ? s.population_2020.toLocaleString() : '—'}
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
      {colData.trends && colData.trends.length >= 2 && (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sage-600" />
            {t('yearOverYearTrend')}
          </h2>
          <div role="img" aria-label={t('yearOverYearTrend')}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={colData.trends}
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
            {(colData.summary.within_mi_threshold ?? 30) === 30
              ? t('topProperties')
              : t('topPropertiesX', { distance: colData.summary.within_mi_threshold })}
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
                {colData.property_sample.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                      {(colData.summary.within_mi_threshold ?? 30) === 30
                        ? t('noPropertiesWithin30')
                        : t('noPropertiesWithinX', { distance: colData.summary.within_mi_threshold })}
                    </td>
                  </tr>
                ) : (
                  colData.property_sample.map((p) => (
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
            {t('anchorsWithUnits', {
              type: colAnchorType === 'national-parks' ? t('nationalParks') : t('skiResorts'),
            })}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                    {colAnchorType === 'national-parks' ? t('nationalPark') : t('skiResort')}
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                    {t('units15Mi')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {colData.anchors_with_property_counts.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                      {t('noAnchorsWithUnits', {
                        type:
                          colAnchorType === 'national-parks'
                            ? t('nationalParks').toLowerCase()
                            : t('skiResorts').toLowerCase(),
                      })}
                    </td>
                  </tr>
                ) : (
                  colData.anchors_with_property_counts.map((s, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                        {s.anchor_name}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {s.units_count_15_mi ?? s.property_count_15_mi}
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
  );
}
