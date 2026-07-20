/**
 * Cron: remap recent GHL-to-QBO invoices matching INV- + "Appraisal Review".
 *
 * Schedule in vercel.json: every 15 minutes.
 * Looks at invoices updated in the last 2 hours so GHL re-syncs are caught.
 *
 * Auth: authorizeVercelCronRequest (CRON_SECRET / Vercel cron headers).
 * No-op (200) when QuickBooks is not configured/connected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import {
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  remapMatchingInvoices,
} from '@/lib/quickbooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LOOKBACK_MS = 2 * 60 * 60 * 1000;

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  if (!isQuickbooksAppConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'QuickBooks app not configured',
      elapsedMs: Date.now() - started,
    });
  }

  const connection = await loadQuickbooksConnection();
  if (!connection) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'QuickBooks not connected',
      elapsedMs: Date.now() - started,
    });
  }

  try {
    const updatedSince = new Date(Date.now() - LOOKBACK_MS);
    const summary = await remapMatchingInvoices({
      dryRun: false,
      source: 'cron',
      updatedSince,
      maxPages: 10,
      pageSize: 100,
    });

    return NextResponse.json({
      ok: true,
      cronSkipped: false,
      updatedSince: updatedSince.toISOString(),
      ...summary,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/quickbooks-remap-invoices]', message);
    return NextResponse.json(
      { ok: false, error: message, elapsedMs: Date.now() - started },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
