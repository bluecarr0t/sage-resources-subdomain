import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { isQuickbooksAppConfigured } from '@/lib/quickbooks';
import {
  buildQuickbooksAuthorizeUrl,
  createQuickbooksOAuthState,
  QBO_OAUTH_STATE_COOKIE,
} from '@/lib/quickbooks/oauth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
  if (!isQuickbooksAppConfigured()) {
    return NextResponse.json(
      {
        error:
          'QuickBooks app is not configured. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.',
      },
      { status: 503 }
    );
  }

  const state = createQuickbooksOAuthState();
  const authorizeUrl = buildQuickbooksAuthorizeUrl(state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(QBO_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  return response;
}, { requireRole: 'admin' });
