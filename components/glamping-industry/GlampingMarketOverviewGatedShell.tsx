import type { ReactNode } from 'react';
import { GlampingMarketAccessGate } from '@/components/glamping-industry/GlampingMarketAccessGate';
import { GlampingMarketOverviewPublicSeo } from '@/components/glamping-industry/GlampingMarketOverviewPublicSeo';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import type { GlampingMarketOverviewSeoVariant } from '@/lib/glamping-market-overview-seo';

/**
 * Renders crawlable public SEO copy, the real page underneath a moderate blur, and the access modal.
 * Metrics in the blurred layer are preview-only; interaction stays blocked until unlock.
 */
export function GlampingMarketOverviewGatedShell({
  children,
  pageSlug = GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  seoVariant = 'overview',
}: {
  children: ReactNode;
  pageSlug?: string;
  seoVariant?: GlampingMarketOverviewSeoVariant;
}) {
  return (
    <div className="relative min-h-screen">
      <GlampingMarketOverviewPublicSeo variant={seoVariant} />
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
