/**
 * Daily cron: full scan of INV- invoices for QuickBooks line remaps.
 *
 * Applies all remap rules (Appraisal Review item → Feasibility Study;
 * description contains "Appraisal" → Appraisal Services - Outdoor Resort).
 *
 * Schedule in vercel.json: once daily.
 * Complements the 15-minute recent-updates cron.
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
    const summary = await remapMatchingInvoices({
      dryRun: false,
      source: 'cron',
      maxPages: 50,
      pageSize: 100,
    });

    return NextResponse.json({
      ok: true,
      cronSkipped: false,
      mode: 'daily-full-scan',
      ...summary,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/quickbooks-remap-invoices-daily]', message);
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
