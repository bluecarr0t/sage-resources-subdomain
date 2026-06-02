'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AMENITY_PROPERTY_CHART_KEYS,
  type AmenityPropertyChartKey,
  type AmenityPropertyPctRow,
} from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import {
  GLAMPING_AMENITY_PROPERTY_CHART_KEYS,
  type GlampingAmenityPropertyChartKey,
} from '@/lib/glamping-industry-overview/glamping-amenity-properties-chart-data';

const RV_BAR_FILL: Record<AmenityPropertyChartKey, string> = {
  hot_tub_sauna: '#b8953a',
  pool: '#f97316',
  fifty_amp_electrical: '#c9986b',
  sewer_hook_up: '#c45c3e',
  water_hookup: '#6d8c62',
};

const GLAMPING_BAR_FILL: Record<GlampingAmenityPropertyChartKey, string> = {
  unit_hot_tub: '#b8953a',
  property_hot_tub: '#9a7b2e',
  unit_sauna: '#7c6b9e',
  property_sauna: '#5c4d78',
  pool: '#f97316',
  hot_tub_sauna: '#c4a24a',
};

type Datum = {
  amenityKey: string;
  name: string;
  pct: number;
  labelText: string;
};

type Props = {
  rows: Array<{ amenityKey: string; pct: number | null; nProperties: number; nWithAmenity: number }>;
  variant?: 'rv' | 'glamping';
  /** When set, only these keys are shown (in order). */
  chartKeys?: readonly string[];
};

function niceCeil(step: number, floor: number, ...vals: number[]) {
  const m = Math.max(floor, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

export default function AmenitiesByPropertyPctChart({
  rows,
  variant = 'rv',
  chartKeys,
}: Props) {
  const t = useTranslations(
    variant === 'glamping'
      ? 'admin.glampingIndustryOverview.amenitiesByPropertyPct'
      : 'admin.rvIndustryOverview.amenitiesByPropertyPct'
  );

  const barFill = variant === 'glamping' ? GLAMPING_BAR_FILL : RV_BAR_FILL;
  const defaultKeys =
    variant === 'glamping' ? GLAMPING_AMENITY_PROPERTY_CHART_KEYS : AMENITY_PROPERTY_CHART_KEYS;
  const keys = chartKeys ?? defaultKeys;

  const nProperties = rows[0]?.nProperties ?? 0;

  const { data, xMax, ticks } = useMemo(() => {
    const keySet = new Set(keys);
    const withPct = rows.filter(
      (r) => r.pct != null && keySet.has(r.amenityKey)
    ) as Array<AmenityPropertyPctRow & { pct: number }>;
    const sorted = [...withPct].sort((a, b) => a.pct - b.pct);
    const chartData: Datum[] = sorted.map((r) => ({
      amenityKey: r.amenityKey,
      name: t(`amenity.${r.amenityKey}`),
      pct: r.pct,
      labelText: `${r.pct.toFixed(1)}%`,
    }));
    const maxV = chartData.length ? Math.max(...chartData.map((d) => d.pct)) : 0;
    const xMaxVal = niceCeil(20, 90, maxV);
    const tickList: number[] = [];
    for (let v = 0; v <= xMaxVal; v += 20) {
      tickList.push(v);
    }
    return { data: chartData, xMax: xMaxVal, ticks: tickList };
  }, [rows, t, keys]);

  const hasAnyData = nProperties > 0 && data.length > 0;

  return (
    <div className="rounded-lg bg-white px-3 py-4 sm:px-5 sm:py-5">
      {!hasAnyData ? (
        <p className="text-center text-sm text-gray-600 py-12">{t('noData')}</p>
      ) : (
        <div className="w-full h-[min(380px,70vh)] min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 8, right: 56, left: 4, bottom: 40 }}
              barCategoryGap="18%"
            >
              <XAxis
                type="number"
                domain={[0, xMax]}
                ticks={ticks}
                tick={{ fontSize: 11, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                tickLine={{ stroke: '#111827' }}
                axisLine={{ stroke: '#111827' }}
                tickFormatter={(v) => `${v}`}
                label={{
                  value: t('axisX'),
                  position: 'bottom',
                  offset: 18,
                  style: {
                    fontSize: 11,
                    fill: '#111827',
                    fontWeight: 700,
                    fontFamily: 'system-ui, sans-serif',
                  },
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={148}
                tick={{ fontSize: 11, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                tickLine={{ stroke: '#111827' }}
                axisLine={{ stroke: '#111827' }}
                reversed
                label={{
                  value: t('axisY'),
                  angle: -90,
                  position: 'insideLeft',
                  style: {
                    fontSize: 11,
                    fill: '#111827',
                    fontWeight: 700,
                    fontFamily: 'system-ui, sans-serif',
                  },
                }}
              />
              <Bar dataKey="pct" radius={[0, 3, 3, 0]} barSize={22} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell
                    key={d.amenityKey}
                    fill={
                      barFill[d.amenityKey as keyof typeof barFill] ?? '#94a3b8'
                    }
                  />
                ))}
                <LabelList
                  dataKey="labelText"
                  position="right"
                  style={{
                    fontSize: 11,
                    fill: '#111827',
                    fontWeight: 700,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
