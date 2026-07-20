import { createServerClient } from '@/lib/supabase';
import {
  QBO_SOURCE_ITEM_NAME,
  QBO_TARGET_ITEM_NAME,
} from '@/lib/quickbooks/constants';
import type { RemapInvoiceResult } from '@/lib/quickbooks/qbo-types';

export type QuickbooksRemapHistorySource = 'admin' | 'cron' | 'webhook' | 'script';

export type QuickbooksRemapHistoryAction = 'updated' | 'matched_dry_run' | 'error';

export type QuickbooksRemapHistoryRow = {
  id: number;
  created_at: string;
  source: QuickbooksRemapHistorySource;
  action: QuickbooksRemapHistoryAction;
  dry_run: boolean;
  invoice_id: string;
  doc_number: string | null;
  txn_date: string | null;
  matched_line_ids: string[];
  matched_descriptions: string[];
  source_item_name: string;
  target_item_id: string | null;
  target_item_name: string | null;
  error_message: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
};

export type RemapHistoryActor = {
  userId?: string | null;
  email?: string | null;
};

export type RemapHistoryContext = {
  source: QuickbooksRemapHistorySource;
  dryRun: boolean;
  targetItemId?: string | null;
  targetItemName?: string | null;
  actor?: RemapHistoryActor | null;
};

export function resolveRemapHistoryAction(
  result: Pick<RemapInvoiceResult, 'updated' | 'error'>,
  dryRun: boolean
): QuickbooksRemapHistoryAction | null {
  if (result.error) {
    // Webhook probes of non-matching invoices — skip noisy history.
    if (result.error.includes('does not match INV-')) return null;
    return 'error';
  }
  if (result.updated) return 'updated';
  if (dryRun) return 'matched_dry_run';
  return null;
}

function resolveAction(
  result: RemapInvoiceResult,
  dryRun: boolean
): QuickbooksRemapHistoryAction | null {
  return resolveRemapHistoryAction(result, dryRun);
}

export async function recordRemapHistoryEntries(input: {
  results: RemapInvoiceResult[];
  context: RemapHistoryContext;
}): Promise<void> {
  const rows = input.results
    .map((result) => {
      const action = resolveAction(result, input.context.dryRun);
      if (!action) return null;
      return {
        source: input.context.source,
        action,
        dry_run: input.context.dryRun,
        invoice_id: result.invoiceId,
        doc_number: result.docNumber || null,
        txn_date: result.txnDate,
        matched_line_ids: result.matchedLineIds,
        matched_descriptions: result.matchedDescriptions,
        source_item_name: QBO_SOURCE_ITEM_NAME,
        target_item_id: input.context.targetItemId ?? null,
        target_item_name: input.context.targetItemName ?? QBO_TARGET_ITEM_NAME,
        error_message: result.error ?? null,
        actor_user_id: input.context.actor?.userId ?? null,
        actor_email: input.context.actor?.email ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) return;

  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('quickbooks_remap_history').insert(rows);
    if (error) {
      console.error('[quickbooks/history] insert failed:', error.message);
    }
  } catch (err) {
    console.error(
      '[quickbooks/history] insert failed:',
      err instanceof Error ? err.message : err
    );
  }
}

export async function listRemapHistory(input?: {
  limit?: number;
  offset?: number;
  action?: QuickbooksRemapHistoryAction | 'all';
  source?: QuickbooksRemapHistorySource | 'all';
}): Promise<{ entries: QuickbooksRemapHistoryRow[]; total: number }> {
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const offset = Math.max(input?.offset ?? 0, 0);
  const supabase = createServerClient();

  let query = supabase
    .from('quickbooks_remap_history')
    .select('*', { count: 'exact' });

  if (input?.action && input.action !== 'all') {
    query = query.eq('action', input.action);
  }
  if (input?.source && input.source !== 'all') {
    query = query.eq('source', input.source);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    throw new Error(error.message);
  }

  return {
    entries: (data ?? []) as QuickbooksRemapHistoryRow[],
    total: count ?? 0,
  };
}
