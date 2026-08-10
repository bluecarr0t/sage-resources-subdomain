/**
 * Server-only access check for `/glamping-market-overview` (and nested routes).
 * Used by the layout gate and by pages so locked requests skip metric fetches.
 * Wrapped in React `cache()` so layout + page share one auth/lead lookup per request.
 */

import { cache } from 'react';
import { isAllowedEmailDomain, isManagedUser } from '@/lib/auth-helpers';
import { findVerifiedGatedLead } from '@/lib/check-gated-page-access';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import { createServerClientWithCookies } from '@/lib/supabase-server';

export type GlampingMarketOverviewAccessState = {
  unlocked: boolean;
  /**
   * True when a verified magic-link lead is missing `business_type`.
   * Managed admins never need this prompt.
   */
  needsBusinessType: boolean;
};

export const getGlampingMarketOverviewAccessState = cache(
  async (): Promise<GlampingMarketOverviewAccessState> => {
    const supabase = await createServerClientWithCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id && !user?.email) {
      return { unlocked: false, needsBusinessType: false };
    }

    if (
      user.id &&
      isAllowedEmailDomain(user.email) &&
      (await isManagedUser(user.id))
    ) {
      return { unlocked: true, needsBusinessType: false };
    }

    const lead = await findVerifiedGatedLead(
      user,
      GATED_PAGE_GLAMPING_MARKET_OVERVIEW
    );
    if (!lead) {
      return { unlocked: false, needsBusinessType: false };
    }

    return {
      unlocked: true,
      needsBusinessType: lead.businessType === null,
    };
  }
);

export const isGlampingMarketOverviewUnlocked = cache(async (): Promise<boolean> => {
  const state = await getGlampingMarketOverviewAccessState();
  return state.unlocked;
});
