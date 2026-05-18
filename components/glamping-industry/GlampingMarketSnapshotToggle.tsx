import Link from 'next/link';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

const MARKET_OVERVIEW_PATH = '/glamping-market-overview';

type Props = {
  market: GlampingMarketSnapshotMarket;
};

export function GlampingMarketSnapshotToggle({ market }: Props) {
  const active =
    'rounded-sm bg-sage-600 px-4 py-2 text-[11px] font-medium tracking-wide text-white';
  const idle =
    'rounded-sm px-4 py-2 text-[11px] font-medium tracking-wide text-neutral-600 transition-colors hover:text-neutral-900';

  return (
    <div
      className="mt-6 inline-flex self-start rounded border border-sage-200 p-0.5"
      role="tablist"
      aria-label="Market"
    >
      <Link
        href={MARKET_OVERVIEW_PATH}
        scroll={false}
        className={market === 'us' ? active : idle}
        role="tab"
        aria-selected={market === 'us'}
      >
        United States
      </Link>
      <Link
        href={`${MARKET_OVERVIEW_PATH}?market=ca`}
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
