import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  remapMatchingInvoices,
} from '@/lib/quickbooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RemapBody = {
  dryRun?: boolean;
};

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  if (!isQuickbooksAppConfigured()) {
    return NextResponse.json(
      {
        error:
          'QuickBooks app is not configured. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.',
      },
      { status: 503 }
    );
  }

  const connection = await loadQuickbooksConnection();
  if (!connection) {
    return NextResponse.json(
      {
        error:
          'QuickBooks is not connected. Use Connect QuickBooks on this page, or set QUICKBOOKS_REFRESH_TOKEN and QUICKBOOKS_REALM_ID.',
      },
      { status: 503 }
    );
  }

  let body: RemapBody = {};
  try {
    body = (await request.json()) as RemapBody;
  } catch {
    body = {};
  }

  const dryRun = body.dryRun !== false;

  try {
    const summary = await remapMatchingInvoices({
      dryRun,
      source: 'admin',
      actor: {
        userId: auth.session.user.id,
        email: auth.session.user.email ?? null,
      },
    });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'QuickBooks remap failed',
      },
      { status: 500 }
    );
  }
}, { requireRole: 'admin' });
