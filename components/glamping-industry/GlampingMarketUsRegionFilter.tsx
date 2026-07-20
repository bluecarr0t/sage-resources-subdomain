import Link from 'next/link';
import {
  glampingMarketOverviewPathForRegion,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import {
  GLAMPING_MARKET_US_REGION_FILTER_OPTIONS,
  GLAMPING_MARKET_US_REGION_SHORT_LABELS,
  regionMatchingStates,
  type GlampingMarketUsRegionFilter,
  type GlampingMarketUsRegionId,
} from '@/lib/glamping-market-snapshot-us-regions';

type Props = {
  market: GlampingMarketSnapshotMarket;
  tier: GlampingMarketSnapshotTierFilter;
  /** Active USPS selection; null = national. */
  states: string[] | null;
  /** Hide on Canada or when compact sticky needs a shorter control. */
  compact?: boolean;
};

/**
 * US-only region preset control. Selecting a region expands to that region’s
 * full state set via URL. “All US” clears geographic filters.
 */
export function GlampingMarketUsRegionFilter({
  market,
  tier,
  states,
  compact = false,
}: Props) {
  if (market !== 'us') return null;

  const activeRegion: GlampingMarketUsRegionFilter =
    states == null || states.length === 0
      ? 'all'
      : regionMatchingStates(states) ?? 'all';
  const isCustom = states != null && states.length > 0 && regionMatchingStates(states) == null;

  const active =
    'rounded-sm bg-sage-600 px-3 py-2 text-[11px] font-medium tracking-wide text-white';
  const idle =
    'rounded-sm px-3 py-2 text-[11px] font-medium tracking-wide text-neutral-600 transition-colors hover:text-neutral-900';

  return (
    <div
      className={
        compact
          ? 'flex max-w-full flex-col items-start sm:items-end'
          : 'flex max-w-full flex-col items-start gap-1.5 sm:items-end'
      }
    >
      <div
        className="inline-flex max-w-full shrink-0 flex-wrap self-start rounded border border-sage-200 p-0.5 sm:self-end"
        role="group"
        aria-label="US region"
      >
        {GLAMPING_MARKET_US_REGION_FILTER_OPTIONS.map((opt) => {
          const isActive =
            opt.value === 'all'
              ? activeRegion === 'all' && !isCustom
              : activeRegion === opt.value;
          return (
            <Link
              key={opt.value}
              href={glampingMarketOverviewPathForRegion(market, tier, opt.value)}
              scroll={false}
              className={isActive ? active : idle}
              aria-current={isActive ? 'true' : undefined}
            >
              {compact && opt.value !== 'all'
                ? GLAMPING_MARKET_US_REGION_SHORT_LABELS[opt.value as GlampingMarketUsRegionId]
                : opt.label}
            </Link>
          );
        })}
      </div>
      {!compact && isCustom ? (
        <p className="self-start text-[10px] font-light text-neutral-500 sm:self-end">
          Custom · {states!.length} states selected
        </p>
      ) : null}
    </div>
  );
}
