'use client';

import { useId, useMemo, type CSSProperties } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  niceRateAxisMax,
  type GlampingProximityAnalysis,
} from '@/lib/glamping-proximity-analysis';
import { formatGlampingMarketOverviewRate } from '@/lib/glamping-market-overview-currency';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

/** sage-500 — within-threshold band ARDR */
const COLOR_RATE_WITHIN = '#5c7a5c';
/** sage-300 — beyond-threshold band ARDR */
const COLOR_RATE_BEYOND = '#a3b5a3';
/** Muted placeholder for inconclusive (units but no published rates). */
const COLOR_RATE_INCONCLUSIVE = '#d4d4d4';
/** sage-teal — open units */
const COLOR_UNITS = '#00b6a6';
const COLOR_THRESHOLD = '#3d503d';
const COLOR_GRID = '#e0dbd2';

/** Ghost bar height as a share of the rate axis (not a real ADR). */
const INCONCLUSIVE_BAR_AXIS_FRACTION = 0.1;

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

export type GlampingProximityBandChartProps = {
  analysis: GlampingProximityAnalysis;
  market: GlampingMarketSnapshotMarket;
  xAxisLabel: string;
  ariaLabel: string;
  /** When false, hides the nearer/farther mean rate-impact footnote. Default true. */
  showRateImpactFootnote?: boolean;
  /**
   * When true, dark green marks > threshold bands (and light green ≤ threshold).
   * Default emphasizes nearer (≤ threshold) bands.
   */
  emphasizeBeyondRates?: boolean;
};

type ChartDatum = {
  label: string;
  /** Plotted rate value (real ADR, or ghost placeholder for inconclusive). */
  meanRate: number | null;
  /** True ADR when known; null for inconclusive placeholders. */
  actualMeanRate: number | null;
  openUnits: number;
  withinThreshold: boolean;
  meanRateProvisional: boolean;
  meanRateInconclusive: boolean;
  rateLabel: string;
  unitsLabel: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  market,
  thresholdMiles,
  minRatedPropertiesPerBand,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number | null;
    color?: string;
    name?: string;
    payload?: ChartDatum;
  }>;
  label?: string;
  market: GlampingMarketSnapshotMarket;
  thresholdMiles: number;
  minRatedPropertiesPerBand: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-md border border-sage-200 bg-[#faf9f3] px-3 py-2 text-xs shadow-sm">
      <p className="mb-0.5 font-medium text-neutral-800">{label} mi</p>
      {row ? (
        <p className="mb-1 text-[10px] text-neutral-500">
          {row.withinThreshold
            ? `Within ${thresholdMiles} mi`
            : `≥ ${thresholdMiles} mi`}
        </p>
      ) : null}
      {row?.meanRateProvisional ? (
        <p className="mb-1 text-[10px] text-neutral-500">
          Provisional — fewer than {minRatedPropertiesPerBand} rated properties
        </p>
      ) : null}
      {row?.meanRateInconclusive ? (
        <p className="mb-1 text-[10px] text-neutral-500">
          Inconclusive — no published retail rates in this band
        </p>
      ) : null}
      {payload.map((entry) => {
        const isRate = entry.dataKey === 'meanRate';
        if (isRate && row?.meanRateInconclusive) {
          return (
            <p key={String(entry.dataKey)} className="flex items-center gap-2 tabular-nums">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: COLOR_RATE_INCONCLUSIVE }}
              />
              <span className="text-neutral-500">{entry.name}:</span>
              <span className="font-medium text-neutral-800">—</span>
            </p>
          );
        }
        const rateValue = isRate ? row?.actualMeanRate ?? entry.value : entry.value;
        const formatted = isRate
          ? `${row?.meanRateProvisional ? '~' : ''}${formatGlampingMarketOverviewRate(
              rateValue == null ? null : Number(rateValue),
              market
            )}`
          : entry.value == null
            ? '—'
            : Number(entry.value).toLocaleString('en-US');
        return (
          <p key={String(entry.dataKey)} className="flex items-center gap-2 tabular-nums">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-neutral-500">{entry.name}:</span>
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

export function GlampingProximityBandChart({
  analysis,
  market,
  xAxisLabel,
  ariaLabel,
  showRateImpactFootnote = true,
  emphasizeBeyondRates = false,
}: GlampingProximityBandChartProps) {
  const patternIdBase = useId().replace(/:/g, '');
  const patternWithinId = `${patternIdBase}-prov-within`;
  const patternBeyondId = `${patternIdBase}-prov-beyond`;

  const rateAxisMax = useMemo(() => {
    if (analysis.rateAxisMax != null) return analysis.rateAxisMax;
    const hasInconclusive = analysis.distanceBands.some((b) => b.meanRateInconclusive);
    return hasInconclusive ? niceRateAxisMax(100) : null;
  }, [analysis.distanceBands, analysis.rateAxisMax]);

  const data: ChartDatum[] = useMemo(() => {
    const ghostHeight =
      rateAxisMax != null
        ? Math.max(1, Math.round(rateAxisMax * INCONCLUSIVE_BAR_AXIS_FRACTION))
        : 10;

    return analysis.distanceBands.map((b) => {
      const provisional = b.meanRateProvisional;
      const inconclusive = b.meanRateInconclusive;
      const rateLabel = inconclusive
        ? '—'
        : b.meanRate == null
          ? ''
          : `${provisional ? '~' : ''}${formatGlampingMarketOverviewRate(b.meanRate, market)}`;

      return {
        label: b.label,
        meanRate: inconclusive ? ghostHeight : b.meanRate,
        actualMeanRate: b.meanRate,
        openUnits: b.openUnits,
        withinThreshold: b.withinThreshold,
        meanRateProvisional: provisional,
        meanRateInconclusive: inconclusive,
        rateLabel,
        unitsLabel: b.openUnits > 0 ? b.openUnits.toLocaleString('en-US') : '',
      };
    });
  }, [analysis.distanceBands, market, rateAxisMax]);

  const thresholdBandLabel = useMemo(() => {
    // Place the threshold marker at the right edge of the last within-threshold
    // band (left of the first beyond rate bar).
    const within = analysis.distanceBands.filter((b) => b.withinThreshold);
    return within.length > 0 ? within[within.length - 1]!.label : null;
  }, [analysis.distanceBands]);

  const unitsAxisMax = useMemo(() => {
    const maxUnits = Math.max(0, ...data.map((d) => d.openUnits));
    return maxUnits > 0 ? niceRateAxisMax(maxUnits) : undefined;
  }, [data]);

  if (data.length === 0 || analysis.propertiesWithCoords === 0) {
    return (
      <div className="flex h-72 items-center justify-center border border-dashed border-sage-200 text-sm text-neutral-500">
        No proximity band data in this cohort.
      </div>
    );
  }

  const withinMeanLabel =
    analysis.withinMeanRate == null
      ? null
      : formatGlampingMarketOverviewRate(analysis.withinMeanRate, market);
  const beyondMeanLabel =
    analysis.beyondMeanRate == null
      ? null
      : formatGlampingMarketOverviewRate(analysis.beyondMeanRate, market);

  const colorWithin = emphasizeBeyondRates ? COLOR_RATE_BEYOND : COLOR_RATE_WITHIN;
  const colorBeyond = emphasizeBeyondRates ? COLOR_RATE_WITHIN : COLOR_RATE_BEYOND;
  const minRatedPropertiesPerBand = 3;
  const hasProvisionalRates = data.some((d) => d.meanRateProvisional);

  return (
    <div className="w-full">
      <div className="h-[20rem] w-full sm:h-[24rem]" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 36, right: 8, left: 4, bottom: 8 }}
            barCategoryGap="22%"
            barGap={3}
          >
            <defs>
              <ProvisionalStripePattern id={patternWithinId} color={colorWithin} />
              <ProvisionalStripePattern id={patternBeyondId} color={colorBeyond} />
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#737373' }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              interval={0}
              height={28}
              tickMargin={6}
            />
            <YAxis
              yAxisId="rate"
              orientation="left"
              domain={rateAxisMax != null ? [0, rateAxisMax] : [0, 'auto']}
              tick={{ fontSize: 10, fill: COLOR_RATE_WITHIN }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              width={market === 'ca' ? 72 : 52}
              tickFormatter={(v: number) => formatAxisRate(v, market)}
            />
            <YAxis
              yAxisId="units"
              orientation="right"
              domain={unitsAxisMax != null ? [0, unitsAxisMax] : [0, 'auto']}
              tick={{ fontSize: 10, fill: COLOR_UNITS }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              width={40}
              tickFormatter={(v: number) =>
                Number(v).toLocaleString('en-US', { notation: 'compact' })
              }
            />
            <Tooltip
              content={
                <ChartTooltip
                  market={market}
                  thresholdMiles={analysis.thresholdMiles}
                  minRatedPropertiesPerBand={minRatedPropertiesPerBand}
                />
              }
              cursor={{ fill: 'rgba(92,122,92,0.06)' }}
            />
            {thresholdBandLabel ? (
              <ReferenceLine
                x={thresholdBandLabel}
                yAxisId="rate"
                position="end"
                stroke={COLOR_THRESHOLD}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                ifOverflow="extendDomain"
                label={{
                  value: `${analysis.thresholdMiles} mi`,
                  position: 'insideTopRight',
                  fill: COLOR_THRESHOLD,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            ) : null}
            <Bar
              yAxisId="rate"
              dataKey="meanRate"
              name="Band avg. rate"
              legendType="none"
              radius={[2, 2, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            >
              {data.map((row) => {
                if (row.meanRateInconclusive) {
                  return (
                    <Cell key={row.label} fill={COLOR_RATE_INCONCLUSIVE} fillOpacity={0.85} />
                  );
                }
                if (row.meanRateProvisional) {
                  return (
                    <Cell
                      key={row.label}
                      fill={`url(#${row.withinThreshold ? patternWithinId : patternBeyondId})`}
                    />
                  );
                }
                const fill = row.withinThreshold ? colorWithin : colorBeyond;
                return <Cell key={row.label} fill={fill} />;
              })}
              <LabelList
                dataKey="rateLabel"
                position="top"
                style={{ fontSize: 9, fill: '#404040', fontWeight: 600 }}
              />
            </Bar>
            <Bar
              yAxisId="units"
              dataKey="openUnits"
              name="Open units"
              legendType="none"
              fill={COLOR_UNITS}
              fillOpacity={0.55}
              radius={[2, 2, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="unitsLabel"
                position="top"
                style={{ fontSize: 9, fill: COLOR_UNITS, fontWeight: 600 }}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[10px] text-neutral-500">{xAxisLabel}</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-neutral-500">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colorWithin }}
          />
          Avg. rate (≤ {analysis.thresholdMiles} mi)
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colorBeyond }}
          />
          Avg. rate (&gt; {analysis.thresholdMiles} mi)
        </li>
        {hasProvisionalRates ? (
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm border border-sage-200/80"
              style={provisionalStripeSwatchStyle(colorBeyond)}
            />
            Provisional rate (~)
          </li>
        ) : null}
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: COLOR_UNITS }}
          />
          Open units
        </li>
      </ul>
      {showRateImpactFootnote && (withinMeanLabel || beyondMeanLabel) ? (
        <p className="mt-1.5 text-center text-[10px] leading-relaxed text-neutral-500">
          Rate impact compares
          {analysis.rateImpactDirection === 'nearerMinusFarther' ? (
            <>
              {' '}
              ≤ {analysis.thresholdMiles} mi
              {analysis.rateImpactComparisonMaxMiles != null
                ? ` vs. ${analysis.thresholdMiles}–${analysis.rateImpactComparisonMaxMiles} mi`
                : ` vs. > ${analysis.thresholdMiles} mi`}
              {withinMeanLabel ? <> · Nearer mean {withinMeanLabel}</> : null}
              {beyondMeanLabel ? <> · Farther mean {beyondMeanLabel}</> : null}
            </>
          ) : (
            <>
              {analysis.rateImpactComparisonMaxMiles != null
                ? ` ${analysis.thresholdMiles}–${analysis.rateImpactComparisonMaxMiles} mi vs. ≤ ${analysis.thresholdMiles} mi`
                : ` > ${analysis.thresholdMiles} mi vs. ≤ ${analysis.thresholdMiles} mi`}
              {beyondMeanLabel ? <> · Farther mean {beyondMeanLabel}</> : null}
              {withinMeanLabel ? <> · Nearer mean {withinMeanLabel}</> : null}
            </>
          )}
          . Unit-weighted band averages.
        </p>
      ) : null}
    </div>
  );
}

export default GlampingProximityBandChart;
