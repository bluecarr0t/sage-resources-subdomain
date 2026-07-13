import { GlampingMarketAccessGate } from '@/components/glamping-industry/GlampingMarketAccessGate';
import { GlampingMarketOverviewLockedPreview } from '@/components/glamping-industry/GlampingMarketOverviewLockedPreview';
import { GlampingMarketOverviewPublicSeo } from '@/components/glamping-industry/GlampingMarketOverviewPublicSeo';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import type { GlampingMarketOverviewSeoVariant } from '@/lib/glamping-market-overview-seo';

/**
 * Locked experience: crawlable SEO (visually hidden; single document H1),
 * a decorative blurred stand-in (no live metrics / no second H1), and the
 * access modal. Real page content renders only after unlock in the layout.
 */
export function GlampingMarketOverviewGatedShell({
  pageSlug = GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  seoVariant = 'overview',
}: {
  pageSlug?: string;
  seoVariant?: GlampingMarketOverviewSeoVariant;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf9f3]">
      <div className="sr-only">
        <GlampingMarketOverviewPublicSeo variant={seoVariant} />
      </div>
      <div
        className="pointer-events-none fixed inset-0 select-none overflow-hidden"
        aria-hidden
      >
        <div className="h-full min-h-screen w-full origin-top scale-105 blur-[8px] brightness-[0.98] contrast-[0.9] saturate-[0.8]">
          <GlampingMarketOverviewLockedPreview variant={seoVariant} />
        </div>
      </div>
      <GlampingMarketAccessGate pageSlug={pageSlug} />
    </div>
  );
}
