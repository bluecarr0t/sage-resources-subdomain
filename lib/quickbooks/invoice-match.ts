import {
  QBO_REMAP_DOC_NUMBER_PREFIX,
  QBO_SOURCE_ITEM_NAME,
} from '@/lib/quickbooks/constants';
import type { QboInvoice, QboInvoiceLine } from '@/lib/quickbooks/qbo-types';

export function invoiceDocNumberMatchesPrefix(
  docNumber: string | null | undefined,
  prefix: string = QBO_REMAP_DOC_NUMBER_PREFIX
): boolean {
  return Boolean(docNumber?.startsWith(prefix));
}

export function lineMatchesSourceItem(
  line: QboInvoiceLine,
  sourceName: string = QBO_SOURCE_ITEM_NAME
): boolean {
  if (line.DetailType !== 'SalesItemLineDetail') return false;
  const itemName = line.SalesItemLineDetail?.ItemRef?.name?.trim();
  const description = line.Description?.trim();
  return itemName === sourceName || description === sourceName;
}

export function findMatchingInvoiceLines(
  invoice: QboInvoice,
  sourceName: string = QBO_SOURCE_ITEM_NAME
): QboInvoiceLine[] {
  return (invoice.Line ?? []).filter((line) => lineMatchesSourceItem(line, sourceName));
}

export function invoiceMatchesRemapCriteria(
  invoice: Pick<QboInvoice, 'DocNumber' | 'Line'>,
  options?: {
    docNumberPrefix?: string;
    sourceItemName?: string;
  }
): boolean {
  const prefix = options?.docNumberPrefix ?? QBO_REMAP_DOC_NUMBER_PREFIX;
  const sourceName = options?.sourceItemName ?? QBO_SOURCE_ITEM_NAME;
  if (!invoiceDocNumberMatchesPrefix(invoice.DocNumber, prefix)) return false;
  return (invoice.Line ?? []).some((line) => lineMatchesSourceItem(line, sourceName));
}

export function remapInvoiceLines(input: {
  lines: QboInvoiceLine[];
  sourceItemName: string;
  targetItemId: string;
  targetItemName: string;
}): { lines: QboInvoiceLine[]; changedLineIds: string[]; changed: boolean } {
  const changedLineIds: string[] = [];
  let changed = false;
  const lines = input.lines.map((line) => {
    if (!lineMatchesSourceItem(line, input.sourceItemName)) return line;

    changed = true;
    if (line.Id) changedLineIds.push(line.Id);

    return {
      ...line,
      Description:
        line.Description === input.sourceItemName || !line.Description
          ? input.targetItemName
          : line.Description,
      SalesItemLineDetail: {
        ...(line.SalesItemLineDetail ?? {}),
        ItemRef: {
          value: input.targetItemId,
          name: input.targetItemName,
        },
      },
    };
  });

  return {
    lines,
    changedLineIds,
    changed,
  };
}
