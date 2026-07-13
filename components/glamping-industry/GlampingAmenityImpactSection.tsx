import type { ReactNode } from 'react';
import type { GlampingAmenityImpactRow } from '@/lib/glamping-amenity-impact';
import { formatGlampingMarketOverviewRate } from '@/lib/glamping-market-overview-currency';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

/** Shown for every market-overview tier filter (All / Luxury / …); not tier-conditional. */
export const AMENITY_IMPACT_SECTION_BLURB =
  'Unit-weighted avg. rate with vs. without each amenity (with − without). Thin “with” samples show as provisional (~); non-positive deltas as Inconclusive.';

export type GlampingAmenityImpactSectionProps = {
  rows: GlampingAmenityImpactRow[];
  market: GlampingMarketSnapshotMarket;
  chart: ReactNode;
};

function formatSignedImpact(
  row: GlampingAmenityImpactRow,
  market: GlampingMarketSnapshotMarket
): string {
  if (row.rateImpactInconclusive) return 'Inconclusive';
  if (row.rateImpact == null) return '—';
  const abs = formatGlampingMarketOverviewRate(Math.abs(row.rateImpact), market);
  const prefix = row.rateImpactProvisional ? '~' : '';
  if (row.rateImpact > 0) return `${prefix}+${abs}`;
  return `${prefix}${abs}`;
}

function ImpactCard({
  label,
  impact,
  unitsWith,
  propertiesWith,
  inconclusive,
}: {
  label: string;
  impact: string;
  unitsWith: number;
  propertiesWith: number;
  inconclusive?: boolean;
}) {
  const nf = new Intl.NumberFormat('en-US');
  return (
    <div className="flex min-h-[7.5rem] flex-col justify-between rounded-md bg-sage-700 px-4 py-4 text-white shadow-sm">
      <div>
        <p className="text-sm font-medium leading-snug tracking-wide">{label}</p>
        <p className="mt-1 text-[10px] font-light leading-relaxed text-sage-100">
          With amenity · {nf.format(unitsWith)} units · {nf.format(propertiesWith)}{' '}
          {propertiesWith === 1 ? 'property' : 'properties'}
        </p>
      </div>
      <p
        className={
          inconclusive
            ? 'mt-3 text-base font-light italic tracking-wide text-sage-100'
            : 'mt-3 text-3xl font-light tabular-nums tracking-tight'
        }
      >
        {impact}
      </p>
    </div>
  );
}

export function GlampingAmenityImpactSection({
  rows,
  market,
  chart,
}: GlampingAmenityImpactSectionProps) {
  return (
    <section
      id="amenity-impact"
      className="mt-16 scroll-mt-28 sm:mt-20"
      aria-labelledby="amenity-impact-heading"
    >
      <h2
        id="amenity-impact-heading"
        className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base"
      >
        Amenity Impact
      </h2>
      <p className="mt-2 whitespace-nowrap text-[10px] leading-relaxed text-neutral-500">
        {AMENITY_IMPACT_SECTION_BLURB}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <ImpactCard
            key={row.key}
            label={row.label}
            impact={formatSignedImpact(row, market)}
            unitsWith={row.unitsWith}
            propertiesWith={row.propertiesWith}
            inconclusive={row.rateImpactInconclusive}
          />
        ))}
      </div>

      <div className="mt-8 min-w-0">{chart}</div>
    </section>
  );
}
