'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { ArrowLeft, TrendingUp, PieChart, Map, Shield, DollarSign, Building2, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart as RechartsPie,
  Pie,
  LineChart,
  Line,
} from 'recharts';
import { qualityScoreToDisplay } from '@/lib/feasibility-utils';

interface AnalyticsData {
  summary: {
    total_studies: number;
    total_comparables: number;
    total_units: number;
    unique_categories: number;
    states_covered: number;
    total_property_scores: number;
    total_valuations: number;
    total_financing: number;
    total_dev_costs: number;
    total_market_data: number;
  };
  adr_by_category: Array<{
    unit_category: string;
    avg_low_adr: number;
    avg_peak_adr: number;
    count: number;
  }>;
  occupancy_scatter: Array<{
    avg_annual_adr: number;
    low_occupancy: number | null;
    peak_occupancy: number | null;
    quality_score: number | null;
    unit_category: string;
    property_name: string;
  }>;
  unit_mix: Array<{
    unit_category: string;
    count: number;
    percentage: number;
  }>;
  regional_rates: Array<{
    state: string;
    avg_low_adr: number;
    avg_peak_adr: number;
    study_count: number;
  }>;
  top_comps: Array<{
    property_name: string;
    unit_category: string;
    avg_annual_adr: number;
    peak_occupancy: number | null;
    num_units: number | null;
    estimated_revpar: number;
    quality_score: number | null;
  }>;
  score_dimensions: Array<{
    dimension: string;
    average: number;
    count: number;
  }> | null;
  top_scored_properties: Array<{
    property_name: string;
    overall_score: number | null;
  }>;
  valuation_summary: {
    count: number;
    direct_cap_count: number;
    pro_forma_count: number;
    avg_noi: number | null;
    avg_cap_rate: number | null;
    avg_indicated_value: number | null;
    avg_revenue: number | null;
  } | null;
  financing_summary: {
    count: number;
    avg_irr: number | null;
    avg_project_cost: number | null;
    irr_distribution: Array<{ study: string; irr: number }>;
    cash_on_cash_trend: Array<{ year: number; avg_cash_on_cash: number; count: number }>;
  } | null;
  dev_cost_summary: {
    count: number;
    cost_by_category: Array<{
      category: string;
      avg_per_unit: number;
      avg_total: number;
      count: number;
    }>;
  } | null;
  market_summary: {
    count: number;
    demographic_comparison: Array<{
      radius: string;
      avg_population: number | null;
      avg_median_income: number | null;
      study_count: number;
    }>;
  } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  treehouse: '#16a34a',
  dome: '#2563eb',
  cabin: '#d97706',
  tent: '#9333ea',
  tiny_home: '#dc2626',
  a_frame: '#0891b2',
  safari_tent: '#ea580c',
  mirror_cabin: '#4f46e5',
  yurt: '#65a30d',
  container: '#6b7280',
  rv_site: '#78716c',
  other: '#a3a3a3',
};

const PIE_COLORS = [
  '#16a34a', '#2563eb', '#d97706', '#9333ea', '#dc2626',
  '#0891b2', '#ea580c', '#4f46e5', '#65a30d', '#6b7280',
  '#78716c', '#a3a3a3',
];

function formatCategoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/comparables/analytics');
        const json = await res.json();
        if (json.success) setData(json.analytics);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-20 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-20 text-center">
          <p className="text-gray-500 dark:text-gray-400">No analytics data available. Upload CSV files first.</p>
        </div>
      </main>
    );
  }

  const scatterData = data.occupancy_scatter
    .filter((p) => p.peak_occupancy !== null && p.avg_annual_adr !== null)
    .map((p) => ({
      ...p,
      size: (qualityScoreToDisplay(p.quality_score) ?? 3) * 30,
    }));

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/comps')}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Comps
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Comps analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Market insights aggregated across all feasibility studies
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Studies" value={data.summary.total_studies} icon={PieChart} />
          <StatCard label="Comps" value={data.summary.total_comparables} icon={TrendingUp} />
          <StatCard label="Unit Records" value={data.summary.total_units} icon={Users} />
          <StatCard label="States Covered" value={data.summary.states_covered} icon={Map} />
          <StatCard label="Valuations" value={data.summary.total_valuations} icon={DollarSign} />
          <StatCard label="Property Scores" value={data.summary.total_property_scores} icon={Shield} />
          <StatCard label="Financing Models" value={data.summary.total_financing} icon={Building2} />
          <StatCard label="Dev Cost Items" value={data.summary.total_dev_costs} icon={Building2} />
          <StatCard label="Market Data Points" value={data.summary.total_market_data} icon={Map} />
          <StatCard label="Unit Categories" value={data.summary.unique_categories} icon={PieChart} />
        </div>

        {/* Charts Row 1: ADR by Category + Unit Mix */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Average ADR by Unit Category
            </h2>
            {data.adr_by_category.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={data.adr_by_category.map((d) => ({
                    ...d,
                    name: formatCategoryLabel(d.unit_category),
                  }))}
                  margin={{ top: 20, right: 20, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    tick={{ fontSize: 11 }}
                    height={90}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${v}`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [value != null ? `$${value}` : '-', '']}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="avg_low_adr" name="Avg Low ADR" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_peak_adr" name="Avg Peak ADR" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="lg:col-span-2 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Unit Type Distribution
            </h2>
            {data.unit_mix.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <RechartsPie margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <Pie
                      data={data.unit_mix.map((d) => ({
                        name: formatCategoryLabel(d.unit_category),
                        value: d.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {data.unit_mix.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {data.unit_mix.slice(0, 6).map((d, i) => (
                    <div key={d.unit_category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatCategoryLabel(d.unit_category)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {d.count} ({d.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Charts Row 2: Occupancy vs ADR Scatter */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Peak Occupancy vs Average ADR
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Bubble size reflects quality score. Color indicates unit category.
          </p>
          {scatterData.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="avg_annual_adr"
                  name="Avg ADR"
                  tickFormatter={(v: number) => `$${v}`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="peak_occupancy"
                  name="Peak Occ."
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                />
                <ZAxis type="number" dataKey="size" range={[40, 200]} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const d = payload[0].payload;
                    const qs = qualityScoreToDisplay(d.quality_score);
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{d.property_name}</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {formatCategoryLabel(d.unit_category)}
                        </p>
                        <p>ADR: ${d.avg_annual_adr}</p>
                        <p>Peak Occ: {d.peak_occupancy}%</p>
                        <p>Quality: {qs != null ? `${qs.toFixed(1)}/5` : '-'}</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={CATEGORY_COLORS[entry.unit_category] || '#a3a3a3'}
                      fillOpacity={0.7}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Charts Row 3: Regional Rates */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Average ADR by State
          </h2>
          {data.regional_rates.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No regional data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data.regional_rates.slice(0, 15)}
                margin={{ top: 5, right: 20, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="state"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v}`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [value != null ? `$${value}` : '-', '']}
                />
                <Legend verticalAlign="top" />
                <Bar dataKey="avg_low_adr" name="Avg Low ADR" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg_peak_adr" name="Avg Peak ADR" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Valuation Summary */}
        {data.valuation_summary && (
          <Card className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-sage-600" />
                  Valuation Insights
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Valuations</p>
                      <p className="text-2xl font-bold text-sage-700 dark:text-sage-300">{data.valuation_summary.count}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {data.valuation_summary.direct_cap_count} Direct Cap, {data.valuation_summary.pro_forma_count} Pro Forma
                      </p>
                    </div>
                    {data.valuation_summary.avg_indicated_value !== null && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg Indicated Value</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          ${(data.valuation_summary.avg_indicated_value / 1_000_000).toFixed(1)}M
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {data.valuation_summary.avg_noi !== null && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg NOI</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                          ${(data.valuation_summary.avg_noi / 1_000_000).toFixed(1)}M
                        </p>
                      </div>
                    )}
                    {data.valuation_summary.avg_cap_rate !== null && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Avg Cap Rate</p>
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                          {data.valuation_summary.avg_cap_rate}%
                        </p>
                      </div>
                    )}
                  </div>
                  {data.valuation_summary.avg_revenue !== null && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Revenue</p>
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        ${(data.valuation_summary.avg_revenue / 1_000_000).toFixed(1)}M
                      </p>
                    </div>
                  )}
                </div>
              </Card>
        )}

        {/* IRR Distribution + Cash-on-Cash Trends */}
        {data.financing_summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {data.financing_summary.irr_distribution.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sage-600" />
                  IRR on Equity Distribution
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg IRR</p>
                    <p className="text-xl font-bold text-sage-700 dark:text-sage-300">
                      {data.financing_summary.avg_irr !== null ? `${data.financing_summary.avg_irr}%` : '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg Project Cost</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      {data.financing_summary.avg_project_cost !== null
                        ? `$${(data.financing_summary.avg_project_cost / 1_000_000).toFixed(1)}M`
                        : '-'}
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={data.financing_summary.irr_distribution}
                    margin={{ top: 5, right: 10, left: 10, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="study"
                      angle={-45}
                      textAnchor="end"
                      tick={{ fontSize: 10 }}
                      height={70}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'IRR']} />
                    <Bar dataKey="irr" name="IRR %" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {data.financing_summary.cash_on_cash_trend.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-sage-600" />
                  Avg Cash-on-Cash Return by Year
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={data.financing_summary.cash_on_cash_trend}
                    margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Year', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Avg CoC']} />
                    <Line type="monotone" dataKey="avg_cash_on_cash" name="Avg Cash-on-Cash" stroke="#16a34a" strokeWidth={2} dot={{ r: 4, fill: '#16a34a' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
        )}

        {/* Development Costs + Market Demographics */}
        {(data.dev_cost_summary || data.market_summary) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {data.dev_cost_summary && data.dev_cost_summary.cost_by_category.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sage-600" />
                  Avg Development Cost per Unit by Category
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={data.dev_cost_summary.cost_by_category.slice(0, 10).map((d) => ({
                      ...d,
                      name: d.category.replace(/\b\w/g, (c) => c.toUpperCase()),
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      width={80}
                    />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                    <Bar dataKey="avg_per_unit" name="Avg Per Unit" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {data.market_summary && data.market_summary.demographic_comparison.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Map className="w-5 h-5 text-sage-600" />
                  Market Demographics by Radius
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Radius</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Avg Population</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Avg Median Income</th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Studies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data.market_summary.demographic_comparison.map((dm) => (
                        <tr key={dm.radius}>
                          <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{dm.radius}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {dm.avg_population?.toLocaleString() ?? '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            {dm.avg_median_income !== null ? `$${dm.avg_median_income.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{dm.study_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
