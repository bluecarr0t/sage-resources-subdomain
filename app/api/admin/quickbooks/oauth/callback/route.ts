import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { exchangeAuthorizationCode } from '@/lib/quickbooks';
import { QBO_OAUTH_STATE_COOKIE } from '@/lib/quickbooks/oauth';

export const dynamic = 'force-dynamic';

function redirectToQuickbooksAdmin(request: NextRequest, params: Record<string, string>) {
  const url = new URL('/admin/quickbooks', request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  response.cookies.set(QBO_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export const GET = withAdminAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  if (error) {
    return redirectToQuickbooksAdmin(request, {
      oauth: 'error',
      message: searchParams.get('error_description') || error,
    });
  }

  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId');
  const state = searchParams.get('state');
  const expectedState = request.cookies.get(QBO_OAUTH_STATE_COOKIE)?.value;

  if (!code || !realmId) {
    return redirectToQuickbooksAdmin(request, {
      oauth: 'error',
      message: 'Missing authorization code or realmId from Intuit.',
    });
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectToQuickbooksAdmin(request, {
      oauth: 'error',
      message: 'OAuth state mismatch. Try connecting again.',
    });
  }

  try {
    await exchangeAuthorizationCode({
      code,
      realmId,
      connectedByUserId: auth.session.user.id,
    });
    return redirectToQuickbooksAdmin(request, { oauth: 'connected' });
  } catch (err) {
    return redirectToQuickbooksAdmin(request, {
      oauth: 'error',
      message: err instanceof Error ? err.message : 'OAuth token exchange failed',
    });
  }
}, { requireRole: 'admin' });
