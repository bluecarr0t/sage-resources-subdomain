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
  type AmenityPropertyChartKey,
  type AmenityPropertyPctRow,
} from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';

const BAR_FILL: Record<AmenityPropertyChartKey, string> = {
  hot_tub_sauna: '#b8953a',
  pool: '#f97316',
  fifty_amp_electrical: '#c9986b',
  sewer_hook_up: '#c45c3e',
  water_hookup: '#6d8c62',
};

type Datum = {
  amenityKey: AmenityPropertyChartKey;
  name: string;
  pct: number;
  labelText: string;
};

type Props = {
  rows: AmenityPropertyPctRow[];
};

function niceCeil(step: number, floor: number, ...vals: number[]) {
  const m = Math.max(floor, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

export default function AmenitiesByPropertyPctChart({ rows }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.amenitiesByPropertyPct');

  const nProperties = rows[0]?.nProperties ?? 0;

  const { data, xMax, ticks } = useMemo(() => {
    const withPct = rows.filter((r) => r.pct != null) as Array<AmenityPropertyPctRow & { pct: number }>;
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
  }, [rows, t]);

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
                  <Cell key={d.amenityKey} fill={BAR_FILL[d.amenityKey]} />
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
