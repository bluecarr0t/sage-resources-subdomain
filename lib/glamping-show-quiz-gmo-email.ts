/**
 * Send a Glamping Market Overview magic link after a booth quiz submit.
 * Uses a cookie-less Supabase client so the tablet session is not signed out.
 */

import { createClient } from '@supabase/supabase-js';
import {
  GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  buildMagicLinkRedirectUrl,
} from '@/lib/gated-access';
import type { GatedAccessBusinessType } from '@/lib/gated-access-business-type';
import { lookupGatedLead } from '@/lib/gated-access-lead';
import { syncGlampingMarketOverviewContactAsync } from '@/lib/ghl/contacts';
import { joinFullName } from '@/lib/person-name';
import { getResourcesSiteOrigin } from '@/lib/site-url';

export type QuizMarketOverviewEmailInput = {
  email: string;
  firstName: string;
  lastName: string;
  businessType: GatedAccessBusinessType;
};

function otpClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function sendQuizMarketOverviewMagicLink(
  input: QuizMarketOverviewEmailInput
): Promise<void> {
  try {
    const email = input.email.trim().toLowerCase();
    if (!email) return;

    const pageSlug = GATED_PAGE_GLAMPING_MARKET_OVERVIEW;
    const existing = await lookupGatedLead(email, pageSlug);
    const firstName = existing.firstName?.trim() || input.firstName.trim();
    const lastName = existing.lastName?.trim() || input.lastName.trim();
    const businessType = existing.businessType ?? input.businessType;
    const fullName = joinFullName(firstName, lastName);

    syncGlampingMarketOverviewContactAsync(pageSlug, {
      email,
      firstName,
      lastName,
      businessType,
    });

    const supabase = otpClient();
    if (!supabase) {
      console.error(
        '[glamping-show-quiz] GMO magic link skipped (missing Supabase URL or anon key)'
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          business_type: businessType,
          gated_page: pageSlug,
          source: 'glamping-show-quiz',
        },
        emailRedirectTo: buildMagicLinkRedirectUrl(
          getResourcesSiteOrigin(),
          pageSlug
        ),
      },
    });

    if (error) {
      console.error(
        '[glamping-show-quiz] GMO magic link failed:',
        error.message
      );
    }
  } catch (err) {
    console.error('[glamping-show-quiz] GMO magic link failed:', err);
  }
}
