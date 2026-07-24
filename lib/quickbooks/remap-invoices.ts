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
  getInvoiceRemapSkipReason,
  buildInvoiceRemapUpdatePayload,
  invoiceMatchesRemapCriteria,
  remapInvoiceLines,
  totalsDiffer,
  txnTaxDetailChanged,
  type RemapTargetRef,
} from '@/lib/quickbooks/invoice-match';
import {
  QBO_REMAP_RULES,
  uniqueRemapTargetItemNames,
} from '@/lib/quickbooks/remap-rules';
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

export async function ensureTargetItem(
  targetItemName: string = QBO_TARGET_ITEM_NAME
): Promise<RemapTargetRef> {
  const existing = await qboFindItemByName(targetItemName);
  if (existing?.Id) {
    return { id: existing.Id, name: existing.Name };
  }

  const source = await qboFindItemByName(QBO_SOURCE_ITEM_NAME);
  const incomeAccountId = source?.IncomeAccountRef?.value;
  if (!incomeAccountId) {
    throw new Error(
      `Target Item "${targetItemName}" does not exist, and source Item "${QBO_SOURCE_ITEM_NAME}" has no IncomeAccountRef to clone from. Create the target Item in QuickBooks first.`
    );
  }

  const created = await qboCreateServiceItem({
    name: targetItemName,
    incomeAccountRefValue: incomeAccountId,
    description: targetItemName,
    unitPrice: typeof source.UnitPrice === 'number' ? source.UnitPrice : undefined,
  });

  return { id: created.Id, name: created.Name };
}

export async function ensureRemapTargetItems(): Promise<Record<string, RemapTargetRef>> {
  const names = uniqueRemapTargetItemNames();
  const targets: Record<string, RemapTargetRef> = {};
  for (const name of names) {
    targets[name] = await ensureTargetItem(name);
  }
  return targets;
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

function primaryTarget(targets: Record<string, RemapTargetRef>): RemapTargetRef {
  return (
    targets[QBO_TARGET_ITEM_NAME] ??
    targets[Object.keys(targets)[0] ?? ''] ?? {
      id: '',
      name: QBO_TARGET_ITEM_NAME,
    }
  );
}

async function updateMatchedInvoice(input: {
  invoice: QboInvoice;
  targetsByName: Record<string, RemapTargetRef>;
  dryRun: boolean;
}): Promise<RemapInvoiceResult> {
  const matchBase = toMatchBase(input.invoice);

  const skipReason = getInvoiceRemapSkipReason(input.invoice);
  if (skipReason) {
    return {
      ...matchBase,
      matchedLineIds: [],
      matchedDescriptions: [],
      updated: false,
      error: skipReason,
    };
  }

  if (!invoiceMatchesRemapCriteria(input.invoice)) {
    return {
      ...matchBase,
      updated: false,
      error: 'Invoice does not match INV- remap criteria',
    };
  }

  if (input.dryRun) {
    return { ...matchBase, updated: false };
  }

  const fresh = await qboGetInvoice(input.invoice.Id);
  const freshSkipReason = getInvoiceRemapSkipReason(fresh);
  if (freshSkipReason) {
    return {
      ...toMatchBase(fresh),
      matchedLineIds: [],
      matchedDescriptions: [],
      updated: false,
      error: freshSkipReason,
    };
  }

  if (!invoiceMatchesRemapCriteria(fresh)) {
    return {
      ...toMatchBase(fresh),
      updated: false,
      error: 'Invoice no longer matches remap criteria after refresh',
    };
  }

  const remapped = remapInvoiceLines({
    lines: fresh.Line ?? [],
    rules: QBO_REMAP_RULES,
    targetsByName: input.targetsByName,
  });

  if (!remapped.changed) {
    return { ...toMatchBase(fresh), updated: false };
  }

  const beforeTotal =
    typeof fresh.TotalAmt === 'number' && Number.isFinite(fresh.TotalAmt)
      ? fresh.TotalAmt
      : null;
  const beforeTaxDetail = fresh.TxnTaxDetail;

  await qboUpdateInvoice(
    buildInvoiceRemapUpdatePayload({
      invoice: fresh,
      lines: remapped.lines,
    })
  );

  const after = await qboGetInvoice(fresh.Id);
  const afterTotal =
    typeof after.TotalAmt === 'number' && Number.isFinite(after.TotalAmt)
      ? after.TotalAmt
      : null;

  const matchedDescriptions = remapped.changedLineIds
    .map((lineId) => {
      const line = (fresh.Line ?? []).find((row) => row.Id === lineId);
      return line?.Description || line?.SalesItemLineDetail?.ItemRef?.name || '';
    })
    .filter(Boolean);

  if (totalsDiffer(beforeTotal, afterTotal)) {
    return {
      ...toMatchBase(fresh),
      matchedLineIds: remapped.changedLineIds,
      matchedDescriptions,
      appliedRules: remapped.appliedRules,
      updated: false,
      error: `Remap safety check failed: TotalAmt changed from ${beforeTotal} to ${afterTotal} on ${fresh.DocNumber ?? fresh.Id}`,
    };
  }

  if (txnTaxDetailChanged(beforeTaxDetail, after.TxnTaxDetail)) {
    return {
      ...toMatchBase(fresh),
      matchedLineIds: remapped.changedLineIds,
      matchedDescriptions,
      appliedRules: remapped.appliedRules,
      updated: false,
      error: `Remap safety check failed: TxnTaxDetail.TaxLine changed on ${fresh.DocNumber ?? fresh.Id}`,
    };
  }

  return {
    ...toMatchBase(fresh),
    matchedLineIds: remapped.changedLineIds,
    matchedDescriptions,
    appliedRules: remapped.appliedRules,
    updated: true,
  };
}

function summarizeResults(input: {
  dryRun: boolean;
  scanned: number;
  targetsByName: Record<string, RemapTargetRef>;
  results: RemapInvoiceResult[];
}): RemapInvoicesSummary {
  const updated = input.results.filter((row) => row.updated).length;
  const errors = input.results.filter((row) => Boolean(row.error)).length;
  const primary = primaryTarget(input.targetsByName);
  return {
    dryRun: input.dryRun,
    scanned: input.scanned,
    matched: input.results.filter((row) => !row.error || row.matchedLineIds.length > 0).length,
    updated,
    skipped: input.results.length - updated - errors,
    errors,
    targetItemId: primary.id,
    targetItemName: primary.name,
    targetItems: Object.values(input.targetsByName),
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
  const targetsByName = await ensureRemapTargetItems();
  const primary = primaryTarget(targetsByName);
  const invoice = await qboGetInvoice(input.invoiceId);
  let result: RemapInvoiceResult;
  try {
    result = await updateMatchedInvoice({
      invoice,
      targetsByName,
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
      targetItemId: primary.id,
      targetItemName: primary.name,
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
  const targetsByName = await ensureRemapTargetItems();
  const primary = primaryTarget(targetsByName);

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
      if (getInvoiceRemapSkipReason(invoice)) continue;
      if (!invoiceMatchesRemapCriteria(invoice)) continue;

      try {
        const result = await updateMatchedInvoice({
          invoice,
          targetsByName,
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
      targetItemId: primary.id,
      targetItemName: primary.name,
      actor: options.actor,
    },
  });

  return summarizeResults({
    dryRun: options.dryRun,
    scanned,
    targetsByName,
    results,
  });
}
