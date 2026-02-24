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
import { createServerClientWithCookies } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getSafeRedirect(redirect: string | null): string {
  if (!redirect) return '/admin/dashboard';
  if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes(':')) {
    return redirect;
  }
  return '/admin/dashboard';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectParam = requestUrl.searchParams.get('redirect');

  if (code) {
    try {
      const supabase = await createServerClientWithCookies();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[auth/callback] Code exchange failed:', error);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
        );
      }
    } catch (err) {
      console.error('[auth/callback] Error:', err);
      return NextResponse.redirect(
        new URL('/login?error=Authentication+failed', request.url)
      );
    }
  }

  const destination = getSafeRedirect(redirectParam);
  return NextResponse.redirect(new URL(destination, request.url));
}
