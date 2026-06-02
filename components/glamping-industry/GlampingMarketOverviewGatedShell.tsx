import type { ReactNode } from 'react';
import { GlampingMarketAccessGate } from '@/components/glamping-industry/GlampingMarketAccessGate';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';

/**
 * Renders the real page underneath a moderate blur with the access modal on top.
 * Metrics are present in the DOM (preview only); interaction stays blocked until unlock.
 */
export function GlampingMarketOverviewGatedShell({
  children,
  pageSlug = GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
}: {
  children: ReactNode;
  pageSlug?: string;
}) {
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none select-none blur-[8px] brightness-[0.97] contrast-[0.96]"
        aria-hidden
      >
        {children}
      </div>
      <GlampingMarketAccessGate pageSlug={pageSlug} />
    </div>
  );
}
