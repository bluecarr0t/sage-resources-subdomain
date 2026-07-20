import {
  QBO_SOURCE_ITEM_NAME,
  QBO_TARGET_ITEM_NAME,
} from '@/lib/quickbooks/constants';
import {
  qboCreateServiceItem,
  qboFindItemByName,
  qboGetInvoice,
  qboListInvoicesPage,
  qboListInvoicesUpdatedSince,
  qboUpdateInvoice,
} from '@/lib/quickbooks/client';
import {
  findMatchingInvoiceLines,
  invoiceMatchesRemapCriteria,
  remapInvoiceLines,
} from '@/lib/quickbooks/invoice-match';
import {
  recordRemapHistoryEntries,
  type RemapHistoryActor,
  type QuickbooksRemapHistorySource,
} from '@/lib/quickbooks/history';
import type {
  QboInvoice,
  RemapInvoiceResult,
  RemapInvoicesSummary,
} from '@/lib/quickbooks/qbo-types';

export async function ensureTargetItem(): Promise<{ id: string; name: string }> {
  const existing = await qboFindItemByName(QBO_TARGET_ITEM_NAME);
  if (existing?.Id) {
    return { id: existing.Id, name: existing.Name };
  }

  const source = await qboFindItemByName(QBO_SOURCE_ITEM_NAME);
  const incomeAccountId = source?.IncomeAccountRef?.value;
  if (!incomeAccountId) {
    throw new Error(
      `Target Item "${QBO_TARGET_ITEM_NAME}" does not exist, and source Item "${QBO_SOURCE_ITEM_NAME}" has no IncomeAccountRef to clone from. Create the target Item in QuickBooks first.`
    );
  }

  const created = await qboCreateServiceItem({
    name: QBO_TARGET_ITEM_NAME,
    incomeAccountRefValue: incomeAccountId,
    description: QBO_TARGET_ITEM_NAME,
    unitPrice: typeof source.UnitPrice === 'number' ? source.UnitPrice : undefined,
  });

  return { id: created.Id, name: created.Name };
}

function toMatchBase(invoice: QboInvoice): Omit<RemapInvoiceResult, 'updated' | 'error'> {
  const matchedLines = findMatchingInvoiceLines(invoice);
  return {
    invoiceId: invoice.Id,
    docNumber: invoice.DocNumber ?? '',
    syncToken: invoice.SyncToken,
    txnDate: invoice.TxnDate ?? null,
    matchedLineIds: matchedLines.map((line) => line.Id).filter(Boolean) as string[],
    matchedDescriptions: matchedLines
      .map((line) => line.Description || line.SalesItemLineDetail?.ItemRef?.name || '')
      .filter(Boolean),
  };
}

async function updateMatchedInvoice(input: {
  invoice: QboInvoice;
  targetItemId: string;
  targetItemName: string;
  dryRun: boolean;
}): Promise<RemapInvoiceResult> {
  const matchBase = toMatchBase(input.invoice);

  if (!invoiceMatchesRemapCriteria(input.invoice)) {
    return {
      ...matchBase,
      updated: false,
      error: 'Invoice does not match INV- + Appraisal Review criteria',
    };
  }

  if (input.dryRun) {
    return { ...matchBase, updated: false };
  }

  const fresh = await qboGetInvoice(input.invoice.Id);
  if (!invoiceMatchesRemapCriteria(fresh)) {
    return {
      ...toMatchBase(fresh),
      updated: false,
      error: 'Invoice no longer matches remap criteria after refresh',
    };
  }

  const remapped = remapInvoiceLines({
    lines: fresh.Line ?? [],
    sourceItemName: QBO_SOURCE_ITEM_NAME,
    targetItemId: input.targetItemId,
    targetItemName: input.targetItemName,
  });

  if (!remapped.changed) {
    return { ...toMatchBase(fresh), updated: false };
  }

  await qboUpdateInvoice({
    Id: fresh.Id,
    SyncToken: fresh.SyncToken,
    sparse: true,
    Line: remapped.lines,
  });

  return {
    ...toMatchBase(fresh),
    matchedLineIds: remapped.changedLineIds,
    updated: true,
  };
}

function summarizeResults(input: {
  dryRun: boolean;
  scanned: number;
  targetItemId: string;
  targetItemName: string;
  results: RemapInvoiceResult[];
}): RemapInvoicesSummary {
  const updated = input.results.filter((row) => row.updated).length;
  const errors = input.results.filter((row) => Boolean(row.error)).length;
  return {
    dryRun: input.dryRun,
    scanned: input.scanned,
    matched: input.results.filter((row) => !row.error || row.matchedLineIds.length > 0).length,
    updated,
    skipped: input.results.length - updated - errors,
    errors,
    targetItemId: input.targetItemId,
    targetItemName: input.targetItemName,
    results: input.results,
  };
}

export type RemapRunOptions = {
  dryRun: boolean;
  source: QuickbooksRemapHistorySource;
  actor?: RemapHistoryActor | null;
  maxPages?: number;
  pageSize?: number;
  /** Only scan invoices with MetaData.LastUpdatedTime after this instant (cron). */
  updatedSince?: Date;
};

export async function remapInvoiceById(input: {
  invoiceId: string;
  dryRun?: boolean;
  source?: QuickbooksRemapHistorySource;
  actor?: RemapHistoryActor | null;
}): Promise<RemapInvoiceResult> {
  const dryRun = input.dryRun === true;
  const source = input.source ?? 'webhook';
  const target = await ensureTargetItem();
  const invoice = await qboGetInvoice(input.invoiceId);
  let result: RemapInvoiceResult;
  try {
    result = await updateMatchedInvoice({
      invoice,
      targetItemId: target.id,
      targetItemName: target.name,
      dryRun,
    });
  } catch (err) {
    result = {
      ...toMatchBase(invoice),
      updated: false,
      error: err instanceof Error ? err.message : 'Update failed',
    };
  }

  await recordRemapHistoryEntries({
    results: [result],
    context: {
      source,
      dryRun,
      targetItemId: target.id,
      targetItemName: target.name,
      actor: input.actor,
    },
  });

  return result;
}

export async function remapMatchingInvoices(
  options: RemapRunOptions
): Promise<RemapInvoicesSummary> {
  const pageSize = options.pageSize ?? 100;
  const maxPages = options.maxPages ?? 50;
  const target = await ensureTargetItem();

  const results: RemapInvoiceResult[] = [];
  let scanned = 0;
  let startPosition = 1;

  for (let page = 0; page < maxPages; page += 1) {
    const invoices = options.updatedSince
      ? await qboListInvoicesUpdatedSince({
          updatedSince: options.updatedSince,
          startPosition,
          maxResults: pageSize,
        })
      : await qboListInvoicesPage({ startPosition, maxResults: pageSize });

    if (invoices.length === 0) break;

    for (const invoice of invoices) {
      scanned += 1;
      if (!invoiceMatchesRemapCriteria(invoice)) continue;

      try {
        const result = await updateMatchedInvoice({
          invoice,
          targetItemId: target.id,
          targetItemName: target.name,
          dryRun: options.dryRun,
        });
        results.push(result);
      } catch (err) {
        results.push({
          ...toMatchBase(invoice),
          updated: false,
          error: err instanceof Error ? err.message : 'Update failed',
        });
      }
    }

    if (invoices.length < pageSize) break;
    startPosition += pageSize;
  }

  await recordRemapHistoryEntries({
    results,
    context: {
      source: options.source,
      dryRun: options.dryRun,
      targetItemId: target.id,
      targetItemName: target.name,
      actor: options.actor,
    },
  });

  return summarizeResults({
    dryRun: options.dryRun,
    scanned,
    targetItemId: target.id,
    targetItemName: target.name,
    results,
  });
}
