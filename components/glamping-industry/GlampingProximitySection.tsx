import type { ReactNode } from 'react';
import { GlampingAllClassificationsPill } from '@/components/glamping-industry/GlampingAllClassificationsPill';
import type { GlampingProximityAnalysis } from '@/lib/glamping-proximity-analysis';
import { formatGlampingMarketOverviewRate } from '@/lib/glamping-market-overview-currency';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

export type GlampingProximitySectionProps = {
  headingId: string;
  title: string;
  subtitle: string;
  unitsWithinLabel: string;
  unitsWithinSubLabel: string;
  /** KPI card: share of geocoded properties within threshold (default), beyond threshold, or open-unit count. */
  withinMetric?: 'units' | 'propertiesPct' | 'propertiesBeyondPct';
  rateImpactSubLabel: string;
  analysis: GlampingProximityAnalysis;
  market: GlampingMarketSnapshotMarket;
  chart: ReactNode;
  /** When true (page tier ≠ All under a geo scope), show the All classifications chip. */
  showAllClassificationsScope?: boolean;
};

function MetricCard({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[8.5rem] flex-col justify-between rounded-md bg-sage-700 px-5 py-5 text-white shadow-sm">
      <div>
        <p className="text-sm font-medium leading-snug tracking-wide">{title}</p>
        <p className="mt-1 text-[10px] font-light leading-relaxed text-sage-100">
          {subtitle}
        </p>
      </div>
      <p className="mt-4 text-4xl font-light tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function formatSignedRateImpact(
  impact: number | null,
  market: GlampingMarketSnapshotMarket
): string {
  if (impact == null) return '—';
  const abs = formatGlampingMarketOverviewRate(Math.abs(impact), market);
  if (impact > 0) return `+${abs}`;
  if (impact < 0) return `-${abs}`;
  return abs;
}

export function GlampingProximitySection({
  headingId,
  title,
  subtitle,
  unitsWithinLabel,
  unitsWithinSubLabel,
  withinMetric = 'propertiesPct',
  rateImpactSubLabel,
  analysis,
  market,
  chart,
  showAllClassificationsScope = false,
}: GlampingProximitySectionProps) {
  const sectionId = headingId.replace(/-heading$/, '');

  const withinValue =
    withinMetric === 'units'
      ? new Intl.NumberFormat('en-US').format(analysis.unitsWithin)
      : analysis.propertiesWithinPct == null
        ? '—'
        : withinMetric === 'propertiesBeyondPct'
          ? `${Math.max(0, 100 - analysis.propertiesWithinPct)}%`
          : `${analysis.propertiesWithinPct}%`;

  return (
    <section
      id={sectionId}
      className="mt-16 scroll-mt-28 sm:mt-20"
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h2
          id={headingId}
          className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base"
        >
          {title}
        </h2>
        {showAllClassificationsScope ? <GlampingAllClassificationsPill /> : null}
      </div>
      <p className="mt-2 max-w-xl text-[10px] leading-relaxed text-neutral-500">
        {subtitle}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <MetricCard
            title={unitsWithinLabel}
            subtitle={unitsWithinSubLabel}
            value={withinValue}
          />
          <MetricCard
            title="Proximity Rate Impact"
            subtitle={rateImpactSubLabel}
            value={formatSignedRateImpact(analysis.rateImpact, market)}
          />
        </div>
        <div className="min-w-0">{chart}</div>
      </div>
    </section>
  );
}
