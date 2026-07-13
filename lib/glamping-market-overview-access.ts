/**
 * Server-only access check for `/glamping-market-overview` (and nested routes).
 * Used by the layout gate and by pages so locked requests skip metric fetches.
 * Wrapped in React `cache()` so layout + page share one auth/lead lookup per request.
 */

import { cache } from 'react';
import { checkGatedPageAccess } from '@/lib/check-gated-page-access';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import { createServerClientWithCookies } from '@/lib/supabase-server';

export const isGlampingMarketOverviewUnlocked = cache(async (): Promise<boolean> => {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return checkGatedPageAccess(
    supabase,
    user,
    GATED_PAGE_GLAMPING_MARKET_OVERVIEW
  );
});
