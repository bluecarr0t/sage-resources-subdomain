'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCurrency, humanLabel } from '@/lib/market-report/format-labels';

/**
 * Dual-axis bar chart for the Site/Unit Analysis section: count of cohort rows
 * per unit type (left axis) alongside median ARDR for that unit type (right axis).
 *
 * Why median ARDR (not mean): the rest of the report treats median as the
 * canonical headline rate (more robust to a few luxury outliers in a small
 * cohort). Mean is still surfaced in the Market Summary table for analysts
 * who want both.
 *
 * Empty-state: if every row is missing both count and rate (shouldn't happen
 * in practice — count is always present), render a dashed placeholder rather
 * than a broken/zero-bar chart.
 */
export interface UnitTypeRateCountChartRow {
  unit_type: string;
  count: number;
  meanAdr?: number | null;
  medianAdr?: number | null;
}

export interface UnitTypeRateCountChartProps {
  rows: UnitTypeRateCountChartRow[];
  /** Empty-state copy (i18n string, falls back to English). */
  emptyLabel?: string;
  /** Aria label for the chart container. */
  ariaLabel?: string;
}

interface ChartDatum {
  unit_type: string;
  label: string;
  count: number;
  rate: number | null;
}

const COLOR_COUNT = '#0ea5e9'; // sky-500
const COLOR_RATE = '#f59e0b'; // amber-500

interface ChartTooltipPayload {
  name: string;
  value: number | null;
  color: string;
  dataKey: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-900">
      <p className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
      {payload.map((entry) => {
        const isRate = entry.dataKey === 'rate';
        const formatted =
          entry.value == null
            ? '—'
            : isRate
            ? formatCurrency(entry.value)
            : entry.value.toLocaleString();
        return (
          <p key={entry.dataKey} className="flex items-center gap-2 tabular-nums">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-neutral-600 dark:text-neutral-400">{entry.name}:</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatted}</span>
          </p>
        );
      })}
    </div>
  );
}

export function UnitTypeRateCountChart({
  rows,
  emptyLabel = 'No unit type data.',
  ariaLabel = 'Unit type by rate and count',
}: UnitTypeRateCountChartProps) {
  const data: ChartDatum[] = useMemo(
    () =>
      rows
        .map((r) => ({
          unit_type: r.unit_type,
          label: humanLabel(r.unit_type),
          count: r.count,
          rate: r.medianAdr ?? null,
        }))
        // Sort by count descending so the chart reads as a ranked breakdown.
        .sort((a, b) => b.count - a.count),
    [rows]
  );

  const hasAnyData = data.length > 0;

  if (!hasAnyData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-neutral-200 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        {emptyLabel}
      </div>
    );
  }

  // Heuristic for X-axis tick density: rotate labels when we have many bars
  // so longer human labels (e.g. "Glamping pod") don't collide.
  const longTickMode = data.length > 6;

  return (
    <div className="h-80 w-full" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: longTickMode ? 48 : 8 }}
          barCategoryGap={20}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#525252' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            interval={0}
            angle={longTickMode ? -28 : 0}
            textAnchor={longTickMode ? 'end' : 'middle'}
            height={longTickMode ? 76 : 36}
            // Adds vertical breathing room between the axis line and the
            // first line of the tick label so rotated text doesn't kiss
            // (or overlap) the bars / axis.
            tickMargin={longTickMode ? 12 : 8}
          />
          <YAxis
            yAxisId="rate"
            orientation="left"
            tick={{ fontSize: 11, fill: '#525252' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            tickFormatter={(value) => formatCurrency(value)}
            width={60}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 11, fill: '#525252' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            width={42}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} iconType="square" iconSize={10} />
          <Bar
            yAxisId="count"
            dataKey="count"
            name="Count of units"
            fill={COLOR_COUNT}
            radius={[3, 3, 0, 0]}
            maxBarSize={42}
          />
          <Bar
            yAxisId="rate"
            dataKey="rate"
            name="Median ARDR"
            fill={COLOR_RATE}
            radius={[3, 3, 0, 0]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
