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
  UNIT_TYPE_CHART_BUCKET_KEYS,
  type UnitTypeChartBucketKey,
  type UnitTypeRateChartRow,
} from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';

const BAR_FILL: Record<UnitTypeChartBucketKey, string> = {
  glamping: '#6b8f71',
  rv: '#3b6ea5',
  tent: '#c67f52',
};

type Datum = {
  bucketKey: UnitTypeChartBucketKey;
  name: string;
  value: number;
  labelText: string;
  isEmpty: boolean;
};

type Props = {
  rows: UnitTypeRateChartRow[];
};

function niceCeil(step: number, floor: number, ...vals: number[]) {
  const m = Math.max(floor, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

export default function UnitTypeByRateChart({ rows }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.unitTypeByRate');

  const data = useMemo((): Datum[] => {
    const byKey = new Map(rows.map((r) => [r.bucketKey, r]));
    return UNIT_TYPE_CHART_BUCKET_KEYS.map((bucketKey) => {
      const r = byKey.get(bucketKey);
      const v = r?.avgAdr2025;
      const isEmpty = r == null || v == null || (r.n ?? 0) === 0;
      const value = isEmpty ? 0 : v;
      const labelText = isEmpty ? '-' : `$${Math.round(v!)}`;
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
    () => niceCeil(25, 200, ...data.map((d) => d.value)),
    [data]
  );

  const tickCount = Math.floor(yMax / 25) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) => i * 25);

  const hasAnyData = rows.some((r) => r.n > 0 && r.avgAdr2025 != null);

  return (
    <div className="rounded-lg bg-white px-3 py-4 sm:px-5 sm:py-5">
      {!hasAnyData ? (
        <p className="text-center text-sm text-gray-600 py-12">{t('noData')}</p>
      ) : (
        <div className="w-full h-[min(380px,60vh)] min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 36, right: 16, left: 20, bottom: 76 }}
              barCategoryGap="22%"
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#1f2937', fontFamily: 'system-ui, sans-serif' }}
                tickLine={{ stroke: '#6b7280' }}
                axisLine={{ stroke: '#6b7280' }}
                interval={0}
                angle={-28}
                textAnchor="end"
                height={72}
                tickMargin={14}
              />
              <YAxis
                domain={[0, yMax]}
                ticks={ticks}
                tick={{ fontSize: 11, fill: '#1f2937', fontFamily: 'system-ui, sans-serif' }}
                tickLine={{ stroke: '#6b7280' }}
                axisLine={{ stroke: '#6b7280' }}
                tickFormatter={(v) => `$${v}`}
                label={{
                  value: t('axisY'),
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#111827', fontWeight: 600, fontFamily: 'system-ui, sans-serif' },
                }}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={72} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.bucketKey} fill={BAR_FILL[d.bucketKey]} />
                ))}
                <LabelList
                  dataKey="labelText"
                  position="top"
                  style={{ fontSize: 12, fill: '#111827', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-center text-xs font-semibold text-gray-800 font-sans">{t('axisX')}</p>
    </div>
  );
}
