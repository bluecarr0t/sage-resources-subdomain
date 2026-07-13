'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GlampingMarketClassificationFilter } from '@/components/glamping-industry/GlampingMarketClassificationFilter';
import { GlampingMarketSnapshotToggle } from '@/components/glamping-industry/GlampingMarketSnapshotToggle';
import type { GlampingMarketSnapshotTierFilter } from '@/lib/glamping-market-snapshot-classification';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

type Props = {
  market: GlampingMarketSnapshotMarket;
  tier: GlampingMarketSnapshotTierFilter;
  /** Rendered under the in-flow title only (not in the sticky bar). */
  lastUpdated?: ReactNode;
};

/**
 * In-flow title + filters; once the page title leaves the viewport, a compact
 * sticky bar keeps the title and market/tier toggles available while scrolling.
 */
export function GlampingMarketOverviewStickyNav({ market, tier, lastUpdated }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <h1
        ref={titleRef}
        className="font-[Georgia] text-base font-medium uppercase tracking-[0.28em] text-neutral-900 sm:text-lg"
      >
        Glamping Market Overview
      </h1>

      {lastUpdated}

      <div className="mt-6 flex w-full flex-wrap items-start justify-start gap-4 sm:justify-between">
        <GlampingMarketSnapshotToggle market={market} tier={tier} />
        <GlampingMarketClassificationFilter market={market} tier={tier} />
      </div>

      <div
        className={`fixed inset-x-0 top-0 z-40 border-b border-sage-200/80 bg-[#faf9f3]/95 shadow-sm backdrop-blur transition-transform duration-200 ${
          stuck ? 'translate-y-0' : 'pointer-events-none -translate-y-full'
        }`}
        aria-hidden={!stuck}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-start gap-3 px-6 py-3 sm:justify-between">
          <p className="font-[Georgia] text-xs font-medium uppercase tracking-[0.22em] text-neutral-900">
            Glamping Market Overview
          </p>
          <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
            <GlampingMarketSnapshotToggle market={market} tier={tier} />
            <GlampingMarketClassificationFilter market={market} tier={tier} compact />
          </div>
        </div>
      </div>
    </>
  );
}
