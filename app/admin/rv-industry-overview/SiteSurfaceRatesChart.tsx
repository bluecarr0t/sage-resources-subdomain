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
  SURFACE_CHART_BUCKET_KEYS,
  type SurfaceChartBucketKey,
  type SurfaceRatesChartRow,
} from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';

const BAR_FILL: Record<SurfaceChartBucketKey, string> = {
  concrete_pad: '#898989',
  loose_gravel: '#CD853F',
  grass_or_field: '#82A674',
};

type Datum = {
  bucketKey: SurfaceChartBucketKey;
  name: string;
  value: number;
  labelText: string;
  isEmpty: boolean;
};

type Props = {
  rows: SurfaceRatesChartRow[];
};

function niceCeil(step: number, floor: number, ...vals: number[]) {
  const m = Math.max(floor, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

export default function SiteSurfaceRatesChart({ rows }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.siteSurfaceRates');

  const data = useMemo((): Datum[] => {
    const byKey = new Map(rows.map((r) => [r.bucketKey, r]));
    return SURFACE_CHART_BUCKET_KEYS.map((bucketKey) => {
      const r = byKey.get(bucketKey);
      const v = r?.avgAdr2025;
      const isEmpty = r == null || v == null || (r.n ?? 0) === 0;
      const value = isEmpty ? 0 : v;
      const labelText = isEmpty ? '—' : `$${Math.round(v!)}`;
      return {
        bucketKey,
        name: t(`bucket.${bucketKey}`),
        value,
        labelText,
        isEmpty,
      };
    });
  }, [rows, t]);

  const yMax = useMemo(
    () => niceCeil(10, 80, ...data.map((d) => d.value)),
    [data]
  );

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= yMax; v += 10) {
      out.push(v);
    }
    return out;
  }, [yMax]);

  const hasAnyData = rows.some((r) => r.n > 0 && r.avgAdr2025 != null);

  return (
    <div className="rounded-lg bg-white p-3 sm:p-4">
      {!hasAnyData ? (
        <p className="text-center text-sm text-gray-600 py-12">{t('noData')}</p>
      ) : (
        <div className="rounded-md bg-white px-2 py-3 sm:px-3 sm:py-4">
          <div className="w-full h-[min(360px,58vh)] min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 32, right: 12, left: 4, bottom: 84 }}
                barCategoryGap="24%"
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                  tickLine={{ stroke: '#111827' }}
                  axisLine={{ stroke: '#111827' }}
                  interval={0}
                  angle={-42}
                  textAnchor="end"
                  height={80}
                  tickMargin={16}
                />
                <YAxis
                  domain={[0, yMax]}
                  ticks={ticks}
                  tick={{ fontSize: 11, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                  tickLine={{ stroke: '#111827' }}
                  axisLine={{ stroke: '#111827' }}
                  tickFormatter={(v) => `$${v}`}
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
                <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={80} isAnimationActive={false}>
                  {data.map((d) => (
                    <Cell key={d.bucketKey} fill={BAR_FILL[d.bucketKey]} />
                  ))}
                  <LabelList
                    dataKey="labelText"
                    position="top"
                    style={{
                      fontSize: 12,
                      fill: '#111827',
                      fontWeight: 700,
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-center text-xs font-bold text-gray-900 font-sans">{t('axisX')}</p>
        </div>
      )}
    </div>
  );
}
