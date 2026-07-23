/**
 * Auth callback — establishes a session from either:
 * - Email OTP `token_hash` + `type` (gated magic links; works on any device)
 * - PKCE `code` (admin Google OAuth / legacy PKCE email links)
 *
 * Add this URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 * - http://localhost:3003/auth/callback (development)
 * - https://yourdomain.com/auth/callback (production)
 * - https://yourdomain.com/auth/callback?redirect=**
 */

import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server';
import {
  GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  getGatedPageRedirectPath,
  isEmailOtpType,
  isGatedPageSlug,
} from '@/lib/gated-access';
import { logGatedContentEvent } from '@/lib/gated-content-events';
import { joinFullName, splitFullName } from '@/lib/person-name';
import { notifyZapierGatedLead } from '@/lib/zapier-webhook';
import {
  notifyMarketOverviewReturnSigninSlack,
  notifyMarketOverviewSignupSlack,
} from '@/lib/slack/website-slack-client';
import {
  countAuthVerifiedForEmail,
  countVerifiedGatedLeads,
} from '@/lib/gated-content-signup-count';
import { DEFAULT_ADMIN_PATH } from '@/lib/admin-ui';

export const dynamic = 'force-dynamic';

function getSafeRedirect(redirect: string | null): string {
  if (!redirect) return DEFAULT_ADMIN_PATH;
  if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes(':')) {
    return redirect;
  }
  return DEFAULT_ADMIN_PATH;
}

/**
 * Map a redirect path back to a gated page slug (the inverse of
 * `getGatedPageRedirectPath`). Returns null when the destination is not a
 * gated content page (e.g. the admin project pipeline).
 */
function gatedSlugForRedirect(redirect: string): string | null {
  const path = redirect.split('?')[0]?.replace(/\/+$/, '') || redirect;
  if (
    path === '/glamping-market-overview' ||
    path.startsWith('/glamping-market-overview/')
  ) {
    return GATED_PAGE_GLAMPING_MARKET_OVERVIEW;
  }
  const slug = path.replace(/^\//, '');
  return isGatedPageSlug(slug) ? slug : null;
}

/**
 * Record the lead for a gated-page magic-link sign-in. Best-effort: a failure
 * here must never block the user from reaching the page.
 */
async function upsertGatedLead(user: User, pageSlug: string): Promise<void> {
  const meta = user.user_metadata ?? {};
  const metaFirst =
    typeof meta.first_name === 'string' ? meta.first_name.trim() : '';
  const metaLast = typeof meta.last_name === 'string' ? meta.last_name.trim() : '';
  const metaFull =
    typeof meta.full_name === 'string' ? meta.full_name.trim() : '';

  const split = splitFullName(metaFull);
  const firstName = metaFirst || split.first_name || null;
  const lastName = metaLast || split.last_name || null;
  const name =
    metaFull || joinFullName(firstName ?? '', lastName ?? '') || null;

  const verifiedAt = new Date().toISOString();
  const email = user.email ?? '';
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from('gated_content_leads')
    .select('verified_at')
    .eq('email', email)
    .eq('page_slug', pageSlug)
    .maybeSingle();

  const isNewSignup = Boolean(email) && !existing?.verified_at;
  const firstVerifiedAt = existing?.verified_at ?? verifiedAt;

  const { error } = await supabase.from('gated_content_leads').upsert(
    {
      user_id: user.id,
      email,
      name,
      first_name: firstName,
      last_name: lastName,
      page_slug: pageSlug,
      // Keep the original first-verify timestamp on return sign-ins.
      verified_at: firstVerifiedAt,
    },
    { onConflict: 'email,page_slug' }
  );

  if (error) {
    console.error('[auth/callback] gated lead upsert failed:', error.message);
  } else if (email) {
    // Await so return-signin counts include this verify before Slack posts.
    await logGatedContentEvent({
      eventType: 'auth_verified',
      email,
      pageSlug,
      userId: user.id,
      metadata: {
        ...(name ? { name, first_name: firstName, last_name: lastName } : {}),
        is_new_signup: isNewSignup,
        is_return: !isNewSignup,
      },
    });
    notifyZapierGatedLead({
      email,
      name,
      first_name: firstName,
      last_name: lastName,
      page_slug: pageSlug,
      verified_at: verifiedAt,
    });

    if (pageSlug === GATED_PAGE_GLAMPING_MARKET_OVERVIEW) {
      const { count: totalVerified, error: countError } =
        await countVerifiedGatedLeads(supabase, pageSlug);

      if (countError) {
        console.error(
          '[auth/callback] market overview signup count failed:',
          countError
        );
      }

      if (isNewSignup && typeof totalVerified === 'number' && totalVerified > 0) {
        console.info(
          `[auth/callback] market overview signup #${totalVerified} (${email})`
        );
        // Await so Vercel does not freeze the function before Slack posts.
        await notifyMarketOverviewSignupSlack({
          signupNumber: totalVerified,
          email,
          name,
        });
      } else if (!isNewSignup) {
        const signInCount = Math.max(
          await countAuthVerifiedForEmail(supabase, email, pageSlug),
          2
        );
        console.info(
          `[auth/callback] market overview return sign-in #${signInCount} (${email})`
        );
        await notifyMarketOverviewReturnSigninSlack({
          email,
          name,
          signInCount,
          firstVerifiedAt,
          totalVerifiedEmails:
            typeof totalVerified === 'number' && totalVerified > 0
              ? totalVerified
              : 0,
        });
      }
    }
  }
}

/**
 * Where to send the visitor when something goes wrong. Gated magic-link users
 * are lead-capture only — they must never be bounced to `/login` (the admin
 * sign-in). Instead, return them to the gated page with `?access=link-expired`
 * so the access modal can prompt a fresh sign-in link. Only non-gated (admin)
 * flows fall back to `/login`.
 */
function buildFailureRedirect(
  request: NextRequest,
  gatedSlug: string | null,
  loginError: string
): NextResponse {
  if (gatedSlug) {
    const path = `${getGatedPageRedirectPath(gatedSlug)}?access=link-expired`;
    return NextResponse.redirect(new URL(path, request.url));
  }
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(loginError)}`, request.url)
  );
}

async function completeGatedSession(
  response: NextResponse,
  gatedSlug: string | null,
  user: User | null | undefined
): Promise<NextResponse> {
  if (gatedSlug && user) {
    await upsertGatedLead(user, gatedSlug);
  }
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const otpTypeParam = requestUrl.searchParams.get('type');
  const redirectParam = requestUrl.searchParams.get('redirect');

  const destination = getSafeRedirect(redirectParam);
  const gatedSlug = gatedSlugForRedirect(destination);
  const redirectTarget = gatedSlug
    ? getGatedPageRedirectPath(gatedSlug)
    : destination;

  // Prefer token_hash (cross-device email links) over PKCE code exchange.
  if (tokenHash && isEmailOtpType(otpTypeParam)) {
    const response = NextResponse.redirect(new URL(redirectTarget, request.url));

    try {
      const supabase = createSupabaseRouteHandlerClient(request, response);
      const { data, error } = await supabase.auth.verifyOtp({
        type: otpTypeParam,
        token_hash: tokenHash,
      });

      if (error) {
        console.error('[auth/callback] OTP verify failed:', error);
        return buildFailureRedirect(request, gatedSlug, error.message);
      }

      const user = data.session?.user ?? data.user;
      return completeGatedSession(response, gatedSlug, user);
    } catch (err) {
      console.error('[auth/callback] OTP verify error:', err);
      return buildFailureRedirect(request, gatedSlug, 'Authentication failed');
    }
  }

  if (tokenHash && !isEmailOtpType(otpTypeParam)) {
    console.error('[auth/callback] Missing or invalid OTP type for token_hash');
    return buildFailureRedirect(request, gatedSlug, 'Sign-in link is missing or invalid');
  }

  if (code) {
    const response = NextResponse.redirect(new URL(redirectTarget, request.url));

    try {
      const supabase = createSupabaseRouteHandlerClient(request, response);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[auth/callback] Code exchange failed:', error);
        return buildFailureRedirect(request, gatedSlug, error.message);
      }

      const user = data.session?.user ?? data.user;
      return completeGatedSession(response, gatedSlug, user);
    } catch (err) {
      console.error('[auth/callback] Error:', err);
      return buildFailureRedirect(request, gatedSlug, 'Authentication failed');
    }
  }

  if (gatedSlug) {
    return buildFailureRedirect(request, gatedSlug, 'Sign-in link is missing or invalid');
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
