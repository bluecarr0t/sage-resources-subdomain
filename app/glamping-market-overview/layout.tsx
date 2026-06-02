import type { ReactNode } from 'react';
import { GlampingMarketOverviewGatedShell } from '@/components/glamping-industry/GlampingMarketOverviewGatedShell';
import { checkGatedPageAccess } from '@/lib/check-gated-page-access';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';

export const dynamic = 'force-dynamic';

/**
 * Server gate for `/glamping-market-overview` (and nested routes like `/brands`).
 * Locked visitors see the real page slightly blurred with an access modal;
 * unlocked visitors (magic link or active admin) see the page normally.
 */
export default async function GlampingMarketOverviewLayout({
  children,
}: {
  children: ReactNode;
}) {
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
      <GlampingMarketOverviewGatedShell pageSlug={GATED_PAGE_GLAMPING_MARKET_OVERVIEW}>
        {children}
      </GlampingMarketOverviewGatedShell>
    );
  }

  return <>{children}</>;
}
