'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { GlampingAmenityImpactRow } from '@/lib/glamping-amenity-impact';
import { formatGlampingMarketOverviewRate } from '@/lib/glamping-market-overview-currency';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

/** Terracotta — matches AmenitiesByAvgAdrChart “without” (on-brand, not bright red). */
const COLOR_WITHOUT = '#b54a3c';
const COLOR_WITH = '#5c7a5c'; // sage-500
const COLOR_GRID = '#e0dbd2';
const COLOR_IMPACT = '#3d503d'; // sage-700

export type GlampingAmenityImpactChartProps = {
  rows: GlampingAmenityImpactRow[];
  market: GlampingMarketSnapshotMarket;
};

type ChartDatum = {
  label: string;
  without: number | null;
  withAmenity: number | null;
  withoutLabel: string;
  withLabel: string;
  impactLabel: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  market,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | null; color?: string; name?: string }>;
  label?: string;
  market: GlampingMarketSnapshotMarket;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-sage-200 bg-[#faf9f3] px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-neutral-800">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 tabular-nums">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-neutral-500">{entry.name}:</span>
          <span className="font-medium text-neutral-800">
            {formatGlampingMarketOverviewRate(
              entry.value == null ? null : Number(entry.value),
              market
            )}
          </span>
        </p>
      ))}
    </div>
  );
}

export function GlampingAmenityImpactChart({
  rows,
  market,
}: GlampingAmenityImpactChartProps) {
  const data: ChartDatum[] = useMemo(
    () =>
      rows.map((r) => ({
        label: r.label,
        without: r.avgWithout,
        withAmenity: r.avgWith,
        withoutLabel:
          r.avgWithout == null
            ? ''
            : formatGlampingMarketOverviewRate(r.avgWithout, market),
        withLabel:
          r.avgWith == null ? '' : formatGlampingMarketOverviewRate(r.avgWith, market),
        impactLabel:
          r.rateImpact == null
            ? ''
            : `${r.rateImpactProvisional ? '~' : ''}+${formatGlampingMarketOverviewRate(
                Math.abs(r.rateImpact),
                market
              )}`,
      })),
    [rows, market]
  );

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center border border-dashed border-sage-200 text-sm text-neutral-500">
        No amenity rate data in this cohort.
      </div>
    );
  }

  return (
    <div
      className="h-[22rem] w-full sm:h-[24rem]"
      aria-label="Average retail daily rate with and without selected amenities"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 36, right: 8, left: 4, bottom: 8 }}
          barCategoryGap="28%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#737373' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#737373' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            width={market === 'ca' ? 72 : 52}
            tickFormatter={(v: number) =>
              market === 'ca' ? `CA $${v}` : `$${v}`
            }
            label={{
              value: market === 'ca' ? 'Avg. Rate (CA $)' : 'Avg. Rate ($)',
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              style: { fontSize: 10, fill: '#737373' },
            }}
          />
          <Tooltip content={<ChartTooltip market={market} />} cursor={{ fill: 'rgba(92,122,92,0.06)' }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#525252' }}
            iconType="square"
            iconSize={10}
          />
          <Bar
            dataKey="without"
            name="Without amenity"
            fill={COLOR_WITHOUT}
            radius={[2, 2, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="withoutLabel"
              position="top"
              style={{ fontSize: 9, fill: COLOR_WITHOUT, fontWeight: 600 }}
            />
          </Bar>
          <Bar
            dataKey="withAmenity"
            name="With amenity"
            fill={COLOR_WITH}
            radius={[2, 2, 0, 0]}
            maxBarSize={48}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="withLabel"
              position="top"
              style={{ fontSize: 9, fill: COLOR_WITH, fontWeight: 600 }}
            />
            <LabelList
              dataKey="impactLabel"
              position="top"
              offset={18}
              style={{ fontSize: 10, fill: COLOR_IMPACT, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default GlampingAmenityImpactChart;
