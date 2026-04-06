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
  SEASON_RATE_KEYS,
  type SeasonRateKey,
  type SeasonRatesChartRow,
} from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';

/** Weekday / weekend pairs: lighter then darker (muted, earthy). */
const BAR_FILL: Record<SeasonRateKey, string> = {
  winter_weekday: '#b4c0ce',
  winter_weekend: '#7d92a8',
  spring_weekday: '#9aaa8e',
  spring_weekend: '#5c6b52',
  summer_weekday: '#c9a099',
  summer_weekend: '#9c3d3a',
  fall_weekday: '#ddc4a8',
  fall_weekend: '#b85c28',
};

type Datum = {
  rateKey: SeasonRateKey;
  name: string;
  value: number;
  labelText: string;
  isEmpty: boolean;
};

type Props = {
  rows: SeasonRatesChartRow[];
};

/** Next tick ≥ max value (step-aligned). Do not pass a high floor — that wastes axis space (e.g. $100 when data tops out ~$72). */
function niceCeil(step: number, minCeil: number, ...vals: number[]) {
  const m = Math.max(minCeil, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

export default function RatesBySeasonChart({ rows }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.ratesBySeason');

  const data = useMemo((): Datum[] => {
    const byKey = new Map(rows.map((r) => [r.rateKey, r]));
    return SEASON_RATE_KEYS.map((rateKey) => {
      const r = byKey.get(rateKey);
      const v = r?.avgRate;
      const isEmpty = r == null || v == null || (r.n ?? 0) === 0;
      const value = isEmpty ? 0 : v;
      const labelText = isEmpty ? '-' : `$${Math.round(v!)}`;
      return {
        rateKey,
        name: t(`bar.${rateKey}`),
        value,
        labelText,
        isEmpty,
      };
    });
  }, [rows, t]);

  const yMax = useMemo(() => {
    const vals = rows
      .filter((r) => r.n > 0 && r.avgRate != null)
      .map((r) => r.avgRate as number);
    if (vals.length === 0) return 80;
    return niceCeil(10, 0, ...vals);
  }, [rows]);

  const yMin = useMemo(() => {
    const vals = rows
      .filter((r) => r.n > 0 && r.avgRate != null)
      .map((r) => r.avgRate as number);
    if (vals.length === 0) return 0;
    const rawMin = Math.min(...vals);
    return Math.max(0, Math.floor(rawMin / 10) * 10 - 10);
  }, [rows]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = yMin; v <= yMax; v += 10) {
      out.push(v);
    }
    return out;
  }, [yMin, yMax]);

  const hasAnyData = rows.some((r) => r.n > 0 && r.avgRate != null);

  return (
    <div className="rounded-lg bg-white p-3 sm:p-4">
      {!hasAnyData ? (
        <p className="text-center text-sm text-gray-600 py-12">{t('noData')}</p>
      ) : (
        <div className="w-full h-[min(400px,65vh)] min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 36, right: 12, left: 4, bottom: 100 }}
              barCategoryGap="12%"
              barGap={4}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                tickLine={{ stroke: '#111827' }}
                axisLine={{ stroke: '#111827' }}
                interval={0}
                angle={-32}
                textAnchor="end"
                height={96}
                tickMargin={24}
              />
              <YAxis
                domain={[yMin, yMax]}
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
                    fontWeight: 600,
                    fontFamily: 'system-ui, sans-serif',
                  },
                }}
              />
              <Bar dataKey="value" radius={[1, 1, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.rateKey} fill={BAR_FILL[d.rateKey]} />
                ))}
                <LabelList
                  dataKey="labelText"
                  position="top"
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
      <p className="mt-2 text-center text-xs font-semibold text-gray-900 font-sans">{t('axisX')}</p>
    </div>
  );
}
