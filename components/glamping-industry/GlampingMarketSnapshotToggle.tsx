import Link from 'next/link';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

const SNAPSHOT_PATH = '/glamping-market-snapshot';

type Props = {
  market: GlampingMarketSnapshotMarket;
};

export function GlampingMarketSnapshotToggle({ market }: Props) {
  const active = 'rounded-sm bg-neutral-900 px-4 py-2 text-[11px] font-medium tracking-wide text-white';
  const idle =
    'rounded-sm px-4 py-2 text-[11px] font-medium tracking-wide text-neutral-500 transition-colors hover:text-neutral-800';

  return (
    <div
      className="mt-6 inline-flex rounded border border-neutral-300 p-0.5"
      role="tablist"
      aria-label="Market"
    >
      <Link
        href={SNAPSHOT_PATH}
        scroll={false}
        className={market === 'us' ? active : idle}
        role="tab"
        aria-selected={market === 'us'}
      >
        United States
      </Link>
      <Link
        href={`${SNAPSHOT_PATH}?market=ca`}
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
