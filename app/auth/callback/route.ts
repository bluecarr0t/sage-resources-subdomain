/**
 * OAuth callback route - handles PKCE code exchange on the server
 * The code_verifier is stored in cookies when OAuth is initiated; the server
 * receives those cookies with this request and can complete the exchange.
 *
 * Add this URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 * - http://localhost:3003/auth/callback (development)
 * - https://yourdomain.com/auth/callback (production)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import {
  GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  getGatedPageRedirectPath,
  isGatedPageSlug,
} from '@/lib/gated-access';

export const dynamic = 'force-dynamic';

function getSafeRedirect(redirect: string | null): string {
  if (!redirect) return '/admin/dashboard';
  if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes(':')) {
    return redirect;
  }
  return '/admin/dashboard';
}

/**
 * Map a redirect path back to a gated page slug (the inverse of
 * `getGatedPageRedirectPath`). Returns null when the destination is not a
 * gated content page (e.g. the admin dashboard).
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
async function upsertGatedLead(
  supabase: SupabaseClient,
  user: User,
  pageSlug: string
): Promise<void> {
  const name =
    (typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : null) ?? null;

  const { error } = await supabase.from('gated_content_leads').upsert(
    {
      user_id: user.id,
      email: user.email ?? '',
      name,
      page_slug: pageSlug,
      verified_at: new Date().toISOString(),
    },
    { onConflict: 'email,page_slug' }
  );

  if (error) {
    console.error('[auth/callback] gated lead upsert failed:', error.message);
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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectParam = requestUrl.searchParams.get('redirect');

  const destination = getSafeRedirect(redirectParam);
  const gatedSlug = gatedSlugForRedirect(destination);

  if (code) {
    try {
      const supabase = await createServerClientWithCookies();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[auth/callback] Code exchange failed:', error);
        return buildFailureRedirect(request, gatedSlug, error.message);
      }

      // For gated content pages, record the verified lead before redirecting.
      if (gatedSlug) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await upsertGatedLead(supabase, user, gatedSlug);
        }
        return NextResponse.redirect(
          new URL(getGatedPageRedirectPath(gatedSlug), request.url)
        );
      }
    } catch (err) {
      console.error('[auth/callback] Error:', err);
      return buildFailureRedirect(request, gatedSlug, 'Authentication failed');
    }
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
