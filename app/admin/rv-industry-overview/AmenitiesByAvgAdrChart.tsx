'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
/* Recharts `LabelList` `content` callbacks use Label `Props`, not `LabelList` component props. */
import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type LabelProps as RechartsLabelProps,
} from 'recharts';
import { AMENITY_ADR_CHART_KEYS } from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';
import { GLAMPING_AMENITY_ADR_CHART_KEYS } from '@/lib/glamping-industry-overview/glamping-amenity-adr-chart-data';

export type AmenityAdrChartRowLike = {
  amenityKey: string;
  avgWithout: number | null;
  avgWith: number | null;
  nWithout: number;
  nWith: number;
  diffRounded: number | null;
};

const FILL_WITHOUT = '#b54a3c';
const FILL_WITH = '#6d8c62';

/** Recharts grouped-bar gap (`barGap` on `BarChart`) — used to center diff labels. */
const GROUPED_BAR_GAP_PX = 4;

/** Extra y-axis headroom so pair diff + value labels clear the plot top. */
const CHART_TOP_LABEL_HEADROOM = 48;
const CHART_TOP_MARGIN = 28;
const CHART_LEFT_MARGIN = 58;
const CHART_BOTTOM_MARGIN = 108;
const X_AXIS_TICK_ANGLE = -28;
/** Push rotated category labels below the axis line (avoids overlap with axis stroke). */
const X_AXIS_TICK_DY = 14;

/** Diff sits above per-bar $ labels (see VALUE_LABEL_OFFSET_PX). */
const DIFF_LABEL_OFFSET_PX = 22;
const VALUE_LABEL_OFFSET_PX = 6;

const DIFF_POSITIVE_FILL = '#15803d';
const DIFF_NEGATIVE_FILL = '#dc2626';
const DIFF_NEUTRAL_FILL = '#111827';

export function formatAdrDiff(diff: number): string {
  if (diff > 0) return `+$${diff}`;
  if (diff < 0) return `-$${Math.abs(diff)}`;
  return '$0';
}

export function diffLabelFill(diff: number): string {
  if (diff > 0) return DIFF_POSITIVE_FILL;
  if (diff < 0) return DIFF_NEGATIVE_FILL;
  return DIFF_NEUTRAL_FILL;
}

/** Center x between grouped without (left) and with (right) bars of equal width. */
export function diffLabelCenterX(
  withoutBarX: number,
  withoutBarWidth: number,
  barGap = GROUPED_BAR_GAP_PX
): number {
  return withoutBarX + withoutBarWidth + barGap / 2;
}

/** Top y of the taller bar in a pair sharing the same baseline. */
export function diffLabelTopY(
  withoutBarY: number,
  withoutBarHeight: number,
  withoutAdr: number,
  withAdr: number
): number {
  if (withoutBarHeight <= 0) return withoutBarY;
  const baseY = withoutBarY + withoutBarHeight;
  const withBarHeight =
    withoutAdr > 0 ? (withoutBarHeight * withAdr) / withoutAdr : withoutBarHeight;
  const withBarY = baseY - withBarHeight;
  return Math.min(withoutBarY, withBarY);
}

export function amenityAdrDiffRounded(payload: {
  diffRounded: number | null;
  withNull: boolean;
  withoutNull: boolean;
  withAdr: number;
  withoutAdr: number;
}): number | null {
  if (payload.withNull || payload.withoutNull) return null;
  if (payload.diffRounded != null) return payload.diffRounded;
  return Math.round(payload.withAdr - payload.withoutAdr);
}

type ChartDatum = {
  name: string;
  amenityKey: string;
  withoutAdr: number;
  withAdr: number;
  withoutNull: boolean;
  withNull: boolean;
  diffRounded: number | null;
};

type Props = {
  rows: AmenityAdrChartRowLike[];
  variant?: 'rv' | 'glamping';
  /** When set, only these keys are shown (in order). */
  chartKeys?: readonly string[];
};

function niceCeil(step: number, floor: number, ...vals: number[]) {
  const m = Math.max(floor, ...vals.map((v) => (Number.isFinite(v) ? v : 0)));
  return Math.ceil(m / step) * step;
}

/** Recharts passes SVG-ish coords as string | number; normalize for layout math. */
function labelCoord(v: string | number | undefined, fallback = 0): number {
  if (v == null) return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function labelNumericValue(value: unknown): number | null {
  if (value == null || typeof value === 'boolean') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** LabelList passes payload at runtime; it is not on the public Label `Props` type. */
type LabelListContentProps = RechartsLabelProps & {
  payload?: ChartDatum;
  index?: number;
  height?: string | number;
};

function createWithoutBarLabel() {
  return function WithoutBarLabel(props: RechartsLabelProps) {
    const { x, y, width, value, payload } = props as LabelListContentProps;
    const xN = labelCoord(x);
    const yN = labelCoord(y);
    const wN = labelCoord(width);
    if (payload?.withoutNull) return null;
    const v = labelNumericValue(value);
    if (v == null) return null;
    return (
      <text
        x={xN + wN / 2}
        y={yN - VALUE_LABEL_OFFSET_PX}
        fill="#111827"
        fontSize={11}
        fontWeight={700}
        textAnchor="middle"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {`$${Math.round(v)}`}
      </text>
    );
  };
}

function createWithBarLabel() {
  return function WithBarLabel(props: RechartsLabelProps) {
    const { x, y, width, value, payload } = props as LabelListContentProps;
    const xN = labelCoord(x);
    const yN = labelCoord(y);
    const wN = labelCoord(width);
    if (payload?.withNull) return null;
    const v = labelNumericValue(value);
    if (v == null) return null;
    return (
      <text
        x={xN + wN / 2}
        y={yN - VALUE_LABEL_OFFSET_PX}
        fill="#111827"
        fontSize={11}
        fontWeight={700}
        textAnchor="middle"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {`$${Math.round(v)}`}
      </text>
    );
  };
}

/**
 * Rendered on the without (left) bar so x/y/width/height match that bar; with bar geometry is derived.
 */
function AmenityCategoryAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  if (x == null || y == null || payload?.value == null) return null;
  const anchorY = y + X_AXIS_TICK_DY;
  return (
    <text
      x={x}
      y={anchorY}
      fill="#111827"
      fontSize={10}
      fontFamily="system-ui, sans-serif"
      textAnchor="end"
      transform={`rotate(${X_AXIS_TICK_ANGLE}, ${x}, ${anchorY})`}
    >
      {payload.value}
    </text>
  );
}

function createDiffBetweenBarsLabel() {
  return function DiffBetweenBarsLabel(props: RechartsLabelProps) {
    const { x, y, width, height, payload } = props as LabelListContentProps;
    if (!payload) return null;

    const diff = amenityAdrDiffRounded(payload);
    if (diff == null) return null;

    const xN = labelCoord(x);
    const yN = labelCoord(y);
    const wN = labelCoord(width);
    const hN = labelCoord(height);
    if (wN <= 0 || hN <= 0) return null;

    const cx = diffLabelCenterX(xN, wN);
    const yTop = diffLabelTopY(yN, hN, payload.withoutAdr, payload.withAdr);

    return (
      <text
        x={cx}
        y={yTop - DIFF_LABEL_OFFSET_PX}
        fill={diffLabelFill(diff)}
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {formatAdrDiff(diff)}
      </text>
    );
  };
}

export default function AmenitiesByAvgAdrChart({
  rows,
  variant = 'rv',
  chartKeys,
}: Props) {
  const t = useTranslations(
    variant === 'glamping'
      ? 'admin.glampingIndustryOverview.amenitiesByAvgAdr'
      : 'admin.rvIndustryOverview.amenitiesByAvgAdr'
  );

  const keys =
    chartKeys ?? (variant === 'glamping' ? GLAMPING_AMENITY_ADR_CHART_KEYS : AMENITY_ADR_CHART_KEYS);

  const data = useMemo((): ChartDatum[] => {
    const byKey = new Map(rows.map((r) => [r.amenityKey, r]));
    return keys.map((amenityKey) => {
      const r = byKey.get(amenityKey) ?? {
        amenityKey,
        avgWithout: null,
        avgWith: null,
        nWithout: 0,
        nWith: 0,
        diffRounded: null,
      };
      const withoutNull = r.nWithout === 0 || r.avgWithout == null;
      const withNull = r.nWith === 0 || r.avgWith == null;
      return {
        amenityKey,
        name: t(`amenity.${amenityKey}`),
        withoutAdr: withoutNull ? 0 : r.avgWithout!,
        withAdr: withNull ? 0 : r.avgWith!,
        withoutNull,
        withNull,
        diffRounded: r.diffRounded,
      };
    });
  }, [rows, t, keys]);

  const yMax = useMemo(() => {
    const vals = data.flatMap((d) => [
      d.withoutNull ? 0 : d.withoutAdr,
      d.withNull ? 0 : d.withAdr,
    ]);
    return niceCeil(20, 100, ...vals, 0) + CHART_TOP_LABEL_HEADROOM;
  }, [data]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= yMax; v += 20) {
      out.push(v);
    }
    return out;
  }, [yMax]);

  const hasAnyData = rows.some((r) => r.nWith > 0 || r.nWithout > 0);

  const WithoutBarLabel = useMemo(() => createWithoutBarLabel(), []);
  const WithBarLabel = useMemo(() => createWithBarLabel(), []);
  const DiffBetweenBarsLabel = useMemo(() => createDiffBetweenBarsLabel(), []);

  return (
    <div className="rounded-lg bg-white p-3 sm:p-4">
      {!hasAnyData ? (
        <p className="text-center text-sm text-gray-600 py-12">{t('noData')}</p>
      ) : (
        <div className="rounded-md bg-white px-2 py-3 sm:px-3">
          <div
            className="mb-2 flex flex-wrap justify-end gap-x-5 gap-y-1 pr-1 text-xs font-medium text-gray-900"
            aria-hidden
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: FILL_WITH }}
              />
              {t('legend.with')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: FILL_WITHOUT }}
              />
              {t('legend.without')}
            </span>
          </div>
          <div className="w-full h-[min(400px,68vh)] min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{
                  top: CHART_TOP_MARGIN,
                  right: 12,
                  left: CHART_LEFT_MARGIN,
                  bottom: CHART_BOTTOM_MARGIN,
                }}
                barCategoryGap="22%"
                barGap={GROUPED_BAR_GAP_PX}
              >
                <XAxis
                  dataKey="name"
                  tick={AmenityCategoryAxisTick}
                  tickLine={{ stroke: '#111827' }}
                  axisLine={{ stroke: '#111827' }}
                  interval={0}
                  height={80}
                  label={{
                    value: t('axisX'),
                    position: 'bottom',
                    offset: 52,
                    style: {
                      fontSize: 11,
                      fill: '#111827',
                      fontWeight: 700,
                      fontFamily: 'system-ui, sans-serif',
                    },
                  }}
                />
                <YAxis
                  width={52}
                  domain={[0, yMax]}
                  ticks={ticks}
                  tick={{ fontSize: 11, fill: '#111827', fontFamily: 'system-ui, sans-serif' }}
                  tickLine={{ stroke: '#111827' }}
                  axisLine={{ stroke: '#111827' }}
                  tickFormatter={(v) => `$${v}`}
                  label={{
                    value: t('axisY'),
                    angle: -90,
                    position: 'left',
                    offset: 8,
                    style: {
                      fontSize: 11,
                      fill: '#111827',
                      fontWeight: 700,
                      fontFamily: 'system-ui, sans-serif',
                      textAnchor: 'middle',
                    },
                  }}
                />
                <Bar
                  dataKey="withoutAdr"
                  name={t('legend.without')}
                  fill={FILL_WITHOUT}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                >
                  <LabelList content={WithoutBarLabel} />
                  <LabelList content={DiffBetweenBarsLabel} />
                </Bar>
                <Bar
                  dataKey="withAdr"
                  name={t('legend.with')}
                  fill={FILL_WITH}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                >
                  <LabelList content={WithBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
