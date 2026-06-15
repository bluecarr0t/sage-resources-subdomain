import Link from 'next/link';
import {
  GLAMPING_MARKET_CLASSIFICATION_FILTER_OPTIONS,
  glampingMarketOverviewPath,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

type Props = {
  market: GlampingMarketSnapshotMarket;
  tier: GlampingMarketSnapshotTierFilter;
  pathForMarketTier?: (
    market: GlampingMarketSnapshotMarket,
    tier: GlampingMarketSnapshotTierFilter
  ) => string;
};

export function GlampingMarketClassificationFilter({
  market,
  tier,
  pathForMarketTier = glampingMarketOverviewPath,
}: Props) {
  const active =
    'rounded-sm bg-sage-600 px-3 py-2 text-[11px] font-medium tracking-wide text-white';
  const idle =
    'rounded-sm px-3 py-2 text-[11px] font-medium tracking-wide text-neutral-600 transition-colors hover:text-neutral-900';

  return (
    <div
      className="inline-flex shrink-0 rounded border border-sage-200 p-0.5"
      role="group"
      aria-label="Classification"
    >
      {GLAMPING_MARKET_CLASSIFICATION_FILTER_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={pathForMarketTier(market, opt.value)}
          scroll={false}
          className={tier === opt.value ? active : idle}
          aria-current={tier === opt.value ? 'true' : undefined}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
