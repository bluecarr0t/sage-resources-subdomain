/**
 * GET /api/glamping-show-quiz/open-market-overview
 *
 * Verifies a short-lived booth QR token, sets a Market Overview cookie, and
 * redirects to /glamping-market-overview. Invalid or expired tokens still
 * redirect so the visitor can use the emailed magic link.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GMO_BOOTH_UNLOCK_COOKIE,
  gmoBoothUnlockCookieOptions,
  verifyGmoBoothUnlockToken,
} from '@/lib/gmo-booth-unlock';
import { GLAMPING_SHOW_QUIZ_UTM } from '@/lib/glamping-show-quiz';
import { getResourcesSiteOrigin } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function marketOverviewRedirect(request: NextRequest): URL {
  const dest = new URL('/glamping-market-overview', getResourcesSiteOrigin());
  const keys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
  ] as const;
  for (const key of keys) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) dest.searchParams.set(key, value);
  }
  if (!dest.searchParams.get('utm_source')) {
    dest.searchParams.set('utm_source', GLAMPING_SHOW_QUIZ_UTM.utm_source);
    dest.searchParams.set('utm_medium', GLAMPING_SHOW_QUIZ_UTM.utm_medium);
    dest.searchParams.set('utm_campaign', GLAMPING_SHOW_QUIZ_UTM.utm_campaign);
  }
  return dest;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('booth');
  const verified = verifyGmoBoothUnlockToken(token);
  const dest = marketOverviewRedirect(request);
  const response = NextResponse.redirect(dest);
  if (verified && token) {
    response.cookies.set(
      GMO_BOOTH_UNLOCK_COOKIE,
      token,
      gmoBoothUnlockCookieOptions(verified.remainingSec)
    );
  }
  return response;
}
