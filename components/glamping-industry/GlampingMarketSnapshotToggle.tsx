import Link from 'next/link';
import {
  glampingMarketOverviewPath,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

type Props = {
  market: GlampingMarketSnapshotMarket;
  tier: GlampingMarketSnapshotTierFilter;
};

export function GlampingMarketSnapshotToggle({ market, tier }: Props) {
  const active =
    'rounded-sm bg-sage-600 px-4 py-2 text-[11px] font-medium tracking-wide text-white';
  const idle =
    'rounded-sm px-4 py-2 text-[11px] font-medium tracking-wide text-neutral-600 transition-colors hover:text-neutral-900';

  return (
    <div
      className="inline-flex shrink-0 rounded border border-sage-200 p-0.5"
      role="tablist"
      aria-label="Market"
    >
      <Link
        href={glampingMarketOverviewPath('us', tier)}
        scroll={false}
        className={market === 'us' ? active : idle}
        role="tab"
        aria-selected={market === 'us'}
      >
        United States
      </Link>
      <Link
        href={glampingMarketOverviewPath('ca', tier)}
        scroll={false}
        className={market === 'ca' ? active : idle}
        role="tab"
        aria-selected={market === 'ca'}
      >
        Canada
      </Link>
    </div>
  );
}
