/**
 * Intuit QuickBooks Online webhooks → remap INV- Appraisal Review invoices.
 *
 * Configure in Intuit Developer portal:
 *   Endpoint: https://<host>/api/webhooks/quickbooks
 *   Entities: Invoice (Create, Update)
 *   Verifier token → QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  remapInvoiceById,
} from '@/lib/quickbooks';
import {
  collectInvoiceIdsFromWebhookPayload,
  verifyQuickbooksWebhookSignature,
  type QuickbooksWebhookPayload,
} from '@/lib/quickbooks/webhooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const verifierToken = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN?.trim();

  if (!verifierToken) {
    return NextResponse.json(
      { error: 'QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN is not configured' },
      { status: 503 }
    );
  }

  const signature = request.headers.get('intuit-signature');
  if (
    !verifyQuickbooksWebhookSignature({
      rawBody,
      signatureHeader: signature,
      verifierToken,
    })
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!isQuickbooksAppConfigured()) {
    // Acknowledge so Intuit does not retry forever when app secrets are missing.
    return NextResponse.json({ ok: true, skipped: true, reason: 'app_not_configured' });
  }

  const connection = await loadQuickbooksConnection();
  if (!connection) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'not_connected' });
  }

  let payload: QuickbooksWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as QuickbooksWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const invoiceIds = collectInvoiceIdsFromWebhookPayload(payload, connection.realmId);
  if (invoiceIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, results: [] });
  }

  const results = [];
  for (const invoiceId of invoiceIds) {
    try {
      results.push(await remapInvoiceById({ invoiceId, dryRun: false, source: 'webhook' }));
    } catch (err) {
      results.push({
        invoiceId,
        docNumber: '',
        syncToken: '',
        txnDate: null,
        matchedLineIds: [],
        matchedDescriptions: [],
        updated: false,
        error: err instanceof Error ? err.message : 'Remap failed',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: invoiceIds.length,
    updated: results.filter((row) => row.updated).length,
    results,
  });
}
