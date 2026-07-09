import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { GlampingMarketOverviewGatedShell } from '@/components/glamping-industry/GlampingMarketOverviewGatedShell';
import { checkGatedPageAccess } from '@/lib/check-gated-page-access';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import {
  buildGlampingMarketOverviewMetadata,
  generateGlampingMarketOverviewJsonLd,
  resolveGlampingMarketOverviewSeoVariant,
} from '@/lib/glamping-market-overview-seo';
import { createServerClientWithCookies } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get('x-pathname');
  const variant = resolveGlampingMarketOverviewSeoVariant(pathname);
  return buildGlampingMarketOverviewMetadata(variant);
}

/**
 * Server gate for `/glamping-market-overview` (and nested routes like `/brands`).
 * Locked visitors see public SEO copy, the real page slightly blurred, and an access modal;
 * unlocked visitors (magic link or active admin) see the page normally.
 */
export default async function GlampingMarketOverviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname');
  const seoVariant = resolveGlampingMarketOverviewSeoVariant(pathname);
  const jsonLd = generateGlampingMarketOverviewJsonLd(seoVariant);

  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const unlocked = await checkGatedPageAccess(
    supabase,
    user,
    GATED_PAGE_GLAMPING_MARKET_OVERVIEW
  );

  if (!unlocked) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GlampingMarketOverviewGatedShell pageSlug={GATED_PAGE_GLAMPING_MARKET_OVERVIEW} seoVariant={seoVariant}>
          {children}
        </GlampingMarketOverviewGatedShell>
      </>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
