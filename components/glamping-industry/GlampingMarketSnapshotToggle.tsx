import Link from 'next/link';
import {
  glampingMarketOverviewPath,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

type Props = {
  market: GlampingMarketSnapshotMarket;
  tier: GlampingMarketSnapshotTierFilter;
  /** Override link target (e.g. Pipeline Quarterly uses the same filters on a different route). */
  pathForMarketTier?: (
    market: GlampingMarketSnapshotMarket,
    tier: GlampingMarketSnapshotTierFilter
  ) => string;
};

/**
 * US / Canada market switcher. Uses a navigation group (not tabs): these are
 * page links that change the URL/market cohort, not in-page tabpanels.
 */
export function GlampingMarketSnapshotToggle({
  market,
  tier,
  pathForMarketTier = glampingMarketOverviewPath,
}: Props) {
  const active =
    'rounded-sm bg-sage-600 px-4 py-2 text-[11px] font-medium tracking-wide text-white';
  const idle =
    'rounded-sm px-4 py-2 text-[11px] font-medium tracking-wide text-neutral-600 transition-colors hover:text-neutral-900';

  return (
    <nav
      className="inline-flex shrink-0 rounded border border-sage-200 p-0.5"
      aria-label="Market"
    >
      <Link
        href={pathForMarketTier('us', tier)}
        scroll={false}
        className={market === 'us' ? active : idle}
        aria-current={market === 'us' ? 'page' : undefined}
      >
        United States
      </Link>
      <Link
        href={pathForMarketTier('ca', tier)}
        scroll={false}
        className={market === 'ca' ? active : idle}
        aria-current={market === 'ca' ? 'page' : undefined}
      >
        Canada
      </Link>
    </nav>
  );
}
