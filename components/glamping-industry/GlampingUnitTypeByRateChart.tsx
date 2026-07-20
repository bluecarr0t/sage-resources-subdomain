'use client';

import { useId, useMemo, type CSSProperties } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { GlampingTopUnitTypeRow } from '@/lib/fetch-glamping-industry-metrics';
import { formatGlampingMarketOverviewRate } from '@/lib/glamping-market-overview-currency';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import {
  filterUnitTypesForRateChart,
  sortUnitTypesForRateChart,
  unitTypeRateChartCountLabel,
} from '@/lib/glamping-unit-type-by-rate-chart';

/** sage-500 — avg daily rate bars */
const COLOR_RATE = '#5c7a5c';
/** sage-teal — unit count bars */
const COLOR_COUNT = '#00b6a6';
const COLOR_GRID = '#e0dbd2';

function ProvisionalStripePattern({ id, color }: { id: string; color: string }) {
  return (
    <pattern
      id={id}
      width="7"
      height="7"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width="7" height="7" fill="#faf9f3" />
      <rect width="3.5" height="7" fill={color} />
    </pattern>
  );
}

function provisionalStripeSwatchStyle(color: string): CSSProperties {
  return {
    backgroundImage: `repeating-linear-gradient(
      -45deg,
      ${color},
      ${color} 2px,
      #faf9f3 2px,
      #faf9f3 4px
    )`,
  };
}

export type GlampingUnitTypeByRateChartProps = {
  rows: GlampingTopUnitTypeRow[];
  market: GlampingMarketSnapshotMarket;
};

type ChartDatum = {
  label: string;
  count: number;
  rate: number | null;
  rateLabel: string;
  countLabel: string;
  provisional: boolean;
};

interface ChartTooltipPayload {
  name: string;
  value: number | null;
  color: string;
  dataKey: string;
  payload: ChartDatum;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
  market,
}: ChartTooltipProps & { market: GlampingMarketSnapshotMarket }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-md border border-sage-200 bg-[#faf9f3] px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-neutral-800">{label}</p>
      {payload.map((entry) => {
        const isRate = entry.dataKey === 'rate';
        const formatted = isRate
          ? formatGlampingMarketOverviewRate(entry.value, market, {
              provisional: row?.provisional,
            })
          : entry.dataKey === 'count' && row?.countLabel
            ? row.countLabel
            : entry.value == null
              ? '—'
              : entry.value.toLocaleString('en-US');
        return (
          <p key={entry.dataKey} className="flex items-center gap-2 tabular-nums">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={
                isRate && row?.provisional
                  ? provisionalStripeSwatchStyle(COLOR_RATE)
                  : { backgroundColor: entry.color }
              }
            />
            <span className="text-neutral-500">
              {isRate && row?.provisional ? 'Provisional rate' : entry.name}:
            </span>
            <span className="font-medium text-neutral-800">{formatted}</span>
          </p>
        );
      })}
    </div>
  );
}

function formatAxisRate(value: number, market: GlampingMarketSnapshotMarket): string {
  if (market === 'ca') {
    return `CA $${Math.round(value).toLocaleString('en-US')}`;
  }
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

/**
 * Pad past the tallest value so top LabelList text clears the chart boundary.
 */
function niceAxisMax(rawMax: number): number {
  if (!(rawMax > 0)) return 100;
  const padded = rawMax * 1.22;
  if (padded <= 100) return Math.ceil(padded / 25) * 25;
  if (padded <= 500) return Math.ceil(padded / 50) * 50;
  if (padded <= 1000) return Math.ceil(padded / 100) * 100;
  if (padded <= 5000) return Math.ceil(padded / 250) * 250;
  return Math.ceil(padded / 500) * 500;
}

export function GlampingUnitTypeByRateChart({ rows, market }: GlampingUnitTypeByRateChartProps) {
  const patternId = `unit-type-rate-provisional-${useId().replace(/:/g, '')}`;

  const data: ChartDatum[] = useMemo(
    () =>
      sortUnitTypesForRateChart(filterUnitTypesForRateChart(rows)).map((r) => ({
        label: r.label,
        count: Number(r.openUnits),
        rate: r.avgRetailDailyRateMean,
        rateLabel:
          r.avgRetailDailyRateMean == null
            ? ''
            : formatGlampingMarketOverviewRate(r.avgRetailDailyRateMean, market, {
                provisional: r.avgRetailDailyRateProvisional,
              }),
        countLabel: unitTypeRateChartCountLabel(r),
        provisional: r.avgRetailDailyRateProvisional,
      })),
    [rows, market]
  );

  const hasProvisional = data.some((d) => d.provisional && d.rate != null);

  const rateAxisMax = useMemo(() => {
    const maxRate = Math.max(0, ...data.map((d) => d.rate ?? 0));
    return niceAxisMax(maxRate);
  }, [data]);

  const countAxisMax = useMemo(() => {
    const maxCount = Math.max(0, ...data.map((d) => d.count));
    return niceAxisMax(maxCount);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center border border-dashed border-sage-200 text-sm text-neutral-500">
        No unit type rate data in this cohort.
      </div>
    );
  }

  const longTickMode = data.length > 6;

  return (
    <div
      className="h-[22rem] w-full sm:h-[26rem]"
      aria-label="Average retail daily rate and unit count by unit type"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 36, right: 8, left: 4, bottom: longTickMode ? 60 : 12 }}
          barCategoryGap="18%"
        >
          <defs>
            <ProvisionalStripePattern id={patternId} color={COLOR_RATE} />
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#737373' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            interval={0}
            angle={longTickMode ? -32 : 0}
            textAnchor={longTickMode ? 'end' : 'middle'}
            height={longTickMode ? 88 : 36}
            tickMargin={longTickMode ? 18 : 8}
            label={
              longTickMode
                ? undefined
                : {
                    value: 'Unit Type',
                    position: 'insideBottom',
                    offset: -2,
                    style: { fontSize: 10, fill: '#737373' },
                  }
            }
          />
          <YAxis
            yAxisId="rate"
            orientation="left"
            domain={[0, rateAxisMax]}
            tick={{ fontSize: 10, fill: COLOR_RATE }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            tickFormatter={(value: number) => formatAxisRate(value, market)}
            width={market === 'ca' ? 72 : 52}
            label={{
              value: market === 'ca' ? 'Average Rate (CA $)' : 'Average Rate ($)',
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              style: { fontSize: 10, fill: COLOR_RATE },
            }}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            domain={[0, countAxisMax]}
            tick={{ fontSize: 10, fill: COLOR_COUNT }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            width={44}
            allowDecimals={false}
            label={{
              value: 'Number of Units',
              angle: 90,
              position: 'insideRight',
              offset: 4,
              style: { fontSize: 10, fill: COLOR_COUNT },
            }}
          />
          <Tooltip
            content={<ChartTooltip market={market} />}
            cursor={{ fill: 'rgba(92, 122, 92, 0.06)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#525252' }}
            iconType="square"
            iconSize={10}
            content={({ payload }) => {
              const items = payload ?? [];
              return (
                <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2">
                  {items.map((entry) => (
                    <li
                      key={String(entry.value)}
                      className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600"
                    >
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.value}
                    </li>
                  ))}
                  {hasProvisional ? (
                    <li className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={provisionalStripeSwatchStyle(COLOR_RATE)}
                      />
                      Provisional rate (~)
                    </li>
                  ) : null}
                </ul>
              );
            }}
          />
          <Bar
            yAxisId="rate"
            dataKey="rate"
            name="Avg. Daily Rate"
            fill={COLOR_RATE}
            radius={[2, 2, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          >
            {data.map((row) => (
              <Cell
                key={row.label}
                fill={row.provisional ? `url(#${patternId})` : COLOR_RATE}
              />
            ))}
            <LabelList
              dataKey="rateLabel"
              position="top"
              style={{ fontSize: 9, fill: COLOR_RATE, fontWeight: 600 }}
            />
          </Bar>
          <Bar
            yAxisId="count"
            dataKey="count"
            name="Unit Count"
            fill={COLOR_COUNT}
            fillOpacity={0.55}
            radius={[2, 2, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="countLabel"
              position="top"
              style={{ fontSize: 9, fill: COLOR_COUNT, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default GlampingUnitTypeByRateChart;
