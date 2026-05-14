'use client';

import { useMemo } from 'react';

import { formatCurrency, humanLabel } from '@/lib/market-report/format-labels';

export interface UnitTypeRateDumbbellRow {
  unit_type: string;
  count: number;
  meanAdr?: number | null;
  minAdr?: number | null;
  maxAdr?: number | null;
}

export interface UnitTypeRateDumbbellChartProps {
  rows: UnitTypeRateDumbbellRow[];
  emptyLabel?: string;
  ariaLabel?: string;
  /** Legend / series labels (i18n). */
  legendMin: string;
  legendAvg: string;
  legendMax: string;
  /** Tiny labels beside the numeric column (i18n). */
  valueLabelMin: string;
  valueLabelAvg: string;
  valueLabelMax: string;
}

const COLOR_MIN = '#64748b'; // slate-500
const COLOR_MAX = '#475569'; // slate-600
const COLOR_AVG = '#f97316'; // orange-500
const COLOR_BAR = '#cbd5e1'; // slate-300 track

interface PreparedRow {
  key: string;
  label: string;
  count: number;
  min: number;
  max: number;
  avg: number;
}

function pctInDomain(value: number, lo: number, hi: number): number {
  if (hi <= lo) return 50;
  return ((value - lo) / (hi - lo)) * 100;
}

function DumbbellTrack({ row, lo, hi }: { row: PreparedRow; lo: number; hi: number }) {
  const pMin = pctInDomain(row.min, lo, hi);
  const pMax = pctInDomain(row.max, lo, hi);
  const pAvg = pctInDomain(row.avg, lo, hi);
  const left = Math.min(pMin, pMax);
  const width = Math.abs(pMax - pMin);
  const showConnector = width > 0.5;

  return (
    <div className="relative h-9 w-full min-w-0">
      {/* Full-width light track */}
      <div
        className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: COLOR_BAR }}
        aria-hidden
      />
      {/* Min–max connector (dumbbell shaft) */}
      {showConnector ? (
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: COLOR_MIN,
          }}
          aria-hidden
        />
      ) : null}
      {/* End caps: min (left), max (right) */}
      <div
        className="absolute top-1/2 z-[1] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm dark:border-neutral-900"
        style={{ left: `${pMin}%`, backgroundColor: COLOR_MIN }}
        title={`${row.label} — min`}
      />
      <div
        className="absolute top-1/2 z-[1] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm dark:border-neutral-900"
        style={{ left: `${pMax}%`, backgroundColor: COLOR_MAX }}
        title={`${row.label} — max`}
      />
      {/* Average (distinct from ends when not coincident) */}
      <div
        className="absolute top-1/2 z-[2] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow dark:border-neutral-900"
        style={{ left: `${pAvg}%`, backgroundColor: COLOR_AVG }}
        title={`${row.label} — avg`}
      />
    </div>
  );
}

export function UnitTypeRateDumbbellChart({
  rows,
  emptyLabel = 'No rate range data.',
  ariaLabel = 'Unit type rate range',
  legendMin,
  legendAvg,
  legendMax,
  valueLabelMin,
  valueLabelAvg,
  valueLabelMax,
}: UnitTypeRateDumbbellChartProps) {
  const prepared: PreparedRow[] = useMemo(() => {
    const out: PreparedRow[] = [];
    for (const r of rows) {
      const min = r.minAdr;
      const max = r.maxAdr;
      const avg = r.meanAdr;
      if (min == null || max == null || avg == null) continue;
      if (min < 0 || max < 0 || avg < 0) continue;
      if (min > max) continue;
      const key = (r.unit_type ?? '').trim() || 'unknown';
      out.push({
        key,
        label: humanLabel(r.unit_type),
        count: r.count,
        min,
        max,
        avg,
      });
    }
    out.sort((a, b) => b.count - a.count);
    return out;
  }, [rows]);

  const domain = useMemo(() => {
    if (prepared.length === 0) return [0, 1] as const;
    let lo = Math.min(...prepared.map((p) => p.min));
    let hi = Math.max(...prepared.map((p) => p.max));
    const span = hi - lo;
    const pad = span > 0 ? span * 0.06 : Math.max(hi * 0.06, 25);
    lo -= pad;
    hi += pad;
    if (lo < 0) lo = 0;
    return [lo, hi] as const;
  }, [prepared]);

  if (prepared.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-neutral-200 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        {emptyLabel}
      </div>
    );
  }

  const [lo, hi] = domain;

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-[11px] text-neutral-600 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_MIN }} />
          {legendMin}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLOR_AVG }} />
          {legendAvg}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_MAX }} />
          {legendMax}
        </span>
        <span className="ml-auto tabular-nums text-neutral-500 dark:text-neutral-500">
          {formatCurrency(lo)} – {formatCurrency(hi)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-y-2.5">
        {prepared.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[minmax(0,9.5rem)_1fr_minmax(4.5rem,5.5rem)] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,11rem)_1fr_minmax(5rem,6rem)]"
          >
            <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-100" title={row.label}>
              {row.label}
            </p>
            <DumbbellTrack row={row} lo={lo} hi={hi} />
            <div className="text-right text-[10px] leading-tight text-neutral-600 dark:text-neutral-400">
              <div>
                <span className="text-neutral-500 dark:text-neutral-500">{valueLabelMin}</span>{' '}
                <span className="tabular-nums text-neutral-800 dark:text-neutral-200">{formatCurrency(row.min)}</span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-500">{valueLabelAvg}</span>{' '}
                <span className="tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(row.avg)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-500">{valueLabelMax}</span>{' '}
                <span className="tabular-nums text-neutral-800 dark:text-neutral-200">{formatCurrency(row.max)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
