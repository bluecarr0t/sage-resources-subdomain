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

import { formatCurrency } from '@/lib/market-report/format-labels';

type Season = 'Winter' | 'Spring' | 'Summer' | 'Fall';

interface SeasonalRow {
  season: Season;
  weekday: number | null;
  weekend: number | null;
}

const SEASON_ORDER: Season[] = ['Winter', 'Spring', 'Summer', 'Fall'];

/**
 * Maps the flat `seasonalAverages` shape (e.g. `winter_weekday`, `winter_weekend`)
 * onto a row-per-season shape that recharts can group on.
 */
function reshape(seasonalAverages: { key: string; average: number | null }[]): SeasonalRow[] {
  const lookup = new Map<string, number | null>();
  for (const s of seasonalAverages) lookup.set(s.key, s.average);
  return SEASON_ORDER.map((season) => ({
    season,
    weekday: lookup.get(`${season.toLowerCase()}_weekday`) ?? null,
    weekend: lookup.get(`${season.toLowerCase()}_weekend`) ?? null,
  }));
}

interface ChartTooltipPayload {
  name: string;
  value: number | null;
  color: string;
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
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 tabular-nums">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-neutral-600 dark:text-neutral-400">{entry.name}:</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {formatCurrency(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface SeasonalRatesChartProps {
  seasonalAverages: { key: string; average: number | null }[];
  /** Empty-state message when no season has data. */
  emptyLabel?: string;
}

export function SeasonalRatesChart({ seasonalAverages, emptyLabel = 'No seasonal rate data.' }: SeasonalRatesChartProps) {
  const data = useMemo(() => reshape(seasonalAverages), [seasonalAverages]);
  const hasAnyData = useMemo(
    () => data.some((row) => row.weekday != null || row.weekend != null),
    [data]
  );

  if (!hasAnyData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-neutral-200 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-64 w-full" aria-label="Seasonal rates chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }} barCategoryGap={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="season"
            tick={{ fontSize: 12, fill: '#525252' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#525252' }}
            axisLine={{ stroke: '#d4d4d4' }}
            tickLine={false}
            tickFormatter={(value) => formatCurrency(value)}
            width={60}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
            iconType="square"
            iconSize={10}
          />
          <Bar dataKey="weekday" name="Weekday" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={48} />
          <Bar dataKey="weekend" name="Weekend" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
