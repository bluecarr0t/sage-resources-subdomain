import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { GlampingMarketBusinessTypePrompt } from '@/components/glamping-industry/GlampingMarketBusinessTypePrompt';
import { GlampingMarketOverviewGatedShell } from '@/components/glamping-industry/GlampingMarketOverviewGatedShell';
import { getGlampingMarketOverviewAccessState } from '@/lib/glamping-market-overview-access';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import {
  buildGlampingMarketOverviewMetadata,
  generateGlampingMarketOverviewJsonLd,
  resolveGlampingMarketOverviewSeoVariant,
} from '@/lib/glamping-market-overview-seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get('x-pathname');
  const variant = resolveGlampingMarketOverviewSeoVariant(pathname);
  return buildGlampingMarketOverviewMetadata(variant);
}

/**
 * Server gate for `/glamping-market-overview` (and nested routes like `/brands`).
 * Locked visitors see crawlable SEO copy (one H1), a decorative blurred stand-in
 * (no live metrics), and an access modal. Unlocked visitors see the real page;
 * those missing `business_type` get a hard-required backfill modal.
 */
export default async function GlampingMarketOverviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname');
  const seoVariant = resolveGlampingMarketOverviewSeoVariant(pathname);
  const jsonLd = generateGlampingMarketOverviewJsonLd(seoVariant);
  const { unlocked, needsBusinessType } =
    await getGlampingMarketOverviewAccessState();

  if (!unlocked) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GlampingMarketOverviewGatedShell
          pageSlug={GATED_PAGE_GLAMPING_MARKET_OVERVIEW}
          seoVariant={seoVariant}
        />
      </>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {needsBusinessType ? (
        <GlampingMarketBusinessTypePrompt
          pageSlug={GATED_PAGE_GLAMPING_MARKET_OVERVIEW}
        />
      ) : null}
      {children}
    </>
  );
}
