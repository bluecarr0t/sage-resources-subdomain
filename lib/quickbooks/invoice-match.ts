import { QBO_REMAP_DOC_NUMBER_PREFIX } from '@/lib/quickbooks/constants';
import {
  QBO_REMAP_RULES,
  type RemapRuleDefinition,
  type RemapRuleId,
} from '@/lib/quickbooks/remap-rules';
import type {
  QboInvoice,
  QboInvoiceLine,
  QboSalesItemLineDetail,
  QboTaxLine,
  QboTxnTaxDetail,
} from '@/lib/quickbooks/qbo-types';

export type RemapTargetRef = {
  id: string;
  name: string;
};

export type AppliedRemapRule = {
  ruleId: RemapRuleId;
  targetItemName: string;
  lineIds: string[];
};

function isSalesItemLine(line: QboInvoiceLine): boolean {
  return line.DetailType === 'SalesItemLineDetail';
}

export function invoiceDocNumberMatchesPrefix(
  docNumber: string | null | undefined,
  prefix: string = QBO_REMAP_DOC_NUMBER_PREFIX
): boolean {
  return Boolean(docNumber?.startsWith(prefix));
}

/** QBO sets PrivateNote to "Voided" (sometimes repeated) when an invoice is voided. */
export function invoiceIsVoided(
  invoice: Pick<QboInvoice, 'PrivateNote'>
): boolean {
  return Boolean(invoice.PrivateNote?.toLowerCase().includes('voided'));
}

/** True when every sales line is missing or $0 (typical of voided invoices). */
export function invoiceSalesLinesAreAllZero(
  invoice: Pick<QboInvoice, 'Line'>
): boolean {
  const sales = (invoice.Line ?? []).filter(isSalesItemLine);
  if (sales.length === 0) return false;
  return sales.every((line) => !(typeof line.Amount === 'number' && line.Amount !== 0));
}

export function getInvoiceRemapSkipReason(
  invoice: Pick<QboInvoice, 'PrivateNote' | 'Line'>
): string | null {
  if (invoiceIsVoided(invoice)) return 'Invoice is voided';
  if (invoiceSalesLinesAreAllZero(invoice)) return 'All sales lines are already $0';
  return null;
}

/** @deprecated Prefer rule-based matchers; kept for existing unit tests. */
export function lineMatchesSourceItem(
  line: QboInvoiceLine,
  sourceName: string
): boolean {
  if (!isSalesItemLine(line)) return false;
  const itemName = line.SalesItemLineDetail?.ItemRef?.name?.trim();
  const description = line.Description?.trim();
  return itemName === sourceName || description === sourceName;
}

export function lineMatchesRemapRule(
  line: QboInvoiceLine,
  rule: RemapRuleDefinition
): boolean {
  if (!isSalesItemLine(line)) return false;

  const itemName = line.SalesItemLineDetail?.ItemRef?.name?.trim() ?? '';
  if (itemName === rule.targetItemName) return false;

  const description = line.Description?.trim() ?? '';
  const match = rule.match;

  switch (match.kind) {
    case 'description_contains': {
      if (!description) return false;
      return description.toLowerCase().includes(match.value.toLowerCase());
    }
    case 'exact_item_or_description': {
      return itemName === match.value || description === match.value;
    }
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}

export function findMatchingRuleForLine(
  line: QboInvoiceLine,
  rules: RemapRuleDefinition[] = QBO_REMAP_RULES
): RemapRuleDefinition | null {
  for (const rule of rules) {
    if (lineMatchesRemapRule(line, rule)) return rule;
  }
  return null;
}

export function findMatchingInvoiceLines(
  invoice: QboInvoice,
  rules: RemapRuleDefinition[] = QBO_REMAP_RULES
): QboInvoiceLine[] {
  return (invoice.Line ?? []).filter((line) => findMatchingRuleForLine(line, rules));
}

export function invoiceMatchesRemapCriteria(
  invoice: Pick<QboInvoice, 'DocNumber' | 'Line' | 'PrivateNote'>,
  options?: {
    docNumberPrefix?: string;
    rules?: RemapRuleDefinition[];
    /** @deprecated Use rules instead. */
    sourceItemName?: string;
    /** When true (default), voided/zeroed invoices do not match. */
    skipVoidedOrZeroed?: boolean;
  }
): boolean {
  const prefix = options?.docNumberPrefix ?? QBO_REMAP_DOC_NUMBER_PREFIX;
  if (!invoiceDocNumberMatchesPrefix(invoice.DocNumber, prefix)) return false;

  if (options?.skipVoidedOrZeroed !== false && getInvoiceRemapSkipReason(invoice)) {
    return false;
  }

  if (options?.sourceItemName && !options.rules) {
    return (invoice.Line ?? []).some((line) =>
      lineMatchesSourceItem(line, options.sourceItemName!)
    );
  }

  const rules = options?.rules ?? QBO_REMAP_RULES;
  return (invoice.Line ?? []).some((line) => findMatchingRuleForLine(line, rules));
}

function resolveQtyAndUnitPrice(input: {
  amount: number;
  qty?: number;
  unitPrice?: number;
}): { qty: number; unitPrice: number } {
  const hasQty = typeof input.qty === 'number' && Number.isFinite(input.qty);
  const hasPrice =
    typeof input.unitPrice === 'number' && Number.isFinite(input.unitPrice);

  if (hasQty && hasPrice) {
    return { qty: input.qty as number, unitPrice: input.unitPrice as number };
  }
  if (hasQty && (input.qty as number) !== 0) {
    return { qty: input.qty as number, unitPrice: input.amount / (input.qty as number) };
  }
  if (hasPrice && (input.unitPrice as number) !== 0) {
    return {
      qty: input.amount / (input.unitPrice as number),
      unitPrice: input.unitPrice as number,
    };
  }
  // Fallback: treat amount as a 1-qty custom rate so ItemRef swaps cannot
  // inherit a $0 catalog UnitPrice.
  return { qty: 1, unitPrice: input.amount };
}

function buildSalesItemLineForUpdate(input: {
  line: QboInvoiceLine;
  itemRef: { value: string; name: string };
  description?: string;
}): QboInvoiceLine {
  const detail = input.line.SalesItemLineDetail ?? {};
  const amount =
    typeof input.line.Amount === 'number' && Number.isFinite(input.line.Amount)
      ? input.line.Amount
      : 0;
  const { qty, unitPrice } = resolveQtyAndUnitPrice({
    amount,
    qty: typeof detail.Qty === 'number' ? detail.Qty : undefined,
    unitPrice: typeof detail.UnitPrice === 'number' ? detail.UnitPrice : undefined,
  });

  const salesDetail: QboSalesItemLineDetail = {
    ItemRef: {
      value: input.itemRef.value,
      name: input.itemRef.name,
    },
    Qty: qty,
    UnitPrice: unitPrice,
  };

  if (detail.TaxCodeRef?.value) {
    salesDetail.TaxCodeRef = {
      value: detail.TaxCodeRef.value,
      ...(detail.TaxCodeRef.name ? { name: detail.TaxCodeRef.name } : {}),
    };
  }

  const classRef = detail.ClassRef;
  if (
    classRef &&
    typeof classRef === 'object' &&
    'value' in classRef &&
    typeof (classRef as { value?: unknown }).value === 'string'
  ) {
    salesDetail.ClassRef = classRef;
  }

  return {
    ...(input.line.Id ? { Id: input.line.Id } : {}),
    ...(typeof input.line.LineNum === 'number' ? { LineNum: input.line.LineNum } : {}),
    DetailType: 'SalesItemLineDetail',
    Amount: amount,
    Description: input.description ?? input.line.Description,
    SalesItemLineDetail: salesDetail,
  };
}

/** Build a QBO-safe Line array: remapped sales lines keep Amount/Qty/UnitPrice. */
export function sanitizeInvoiceLinesForUpdate(lines: QboInvoiceLine[]): QboInvoiceLine[] {
  return lines.map((line) => {
    if (line.DetailType === 'SalesItemLineDetail') {
      const itemRef = line.SalesItemLineDetail?.ItemRef;
      if (!itemRef?.value) return line;
      return buildSalesItemLineForUpdate({
        line,
        itemRef: {
          value: itemRef.value,
          name: itemRef.name ?? '',
        },
        description: line.Description,
      });
    }

    if (line.DetailType === 'SubTotalLineDetail') {
      return {
        ...(line.Id ? { Id: line.Id } : {}),
        DetailType: 'SubTotalLineDetail',
        ...(typeof line.Amount === 'number' ? { Amount: line.Amount } : {}),
      };
    }

    return line;
  });
}

export function remapInvoiceLines(input: {
  lines: QboInvoiceLine[];
  rules?: RemapRuleDefinition[];
  targetsByName: Record<string, RemapTargetRef>;
  /** @deprecated Single-rule API for older tests. */
  sourceItemName?: string;
  /** @deprecated Single-rule API for older tests. */
  targetItemId?: string;
  /** @deprecated Single-rule API for older tests. */
  targetItemName?: string;
}): {
  lines: QboInvoiceLine[];
  changedLineIds: string[];
  changed: boolean;
  appliedRules: AppliedRemapRule[];
} {
  // Back-compat path used by existing unit tests.
  if (input.sourceItemName && input.targetItemId && input.targetItemName) {
    const legacyRule: RemapRuleDefinition = {
      id: 'appraisal_review_item',
      label: input.sourceItemName,
      match: { kind: 'exact_item_or_description', value: input.sourceItemName },
      targetItemName: input.targetItemName,
      replaceDescriptionWhenExact: true,
    };
    return remapInvoiceLines({
      lines: input.lines,
      rules: [legacyRule],
      targetsByName: {
        [input.targetItemName]: {
          id: input.targetItemId,
          name: input.targetItemName,
        },
      },
    });
  }

  const rules = input.rules ?? QBO_REMAP_RULES;
  const changedLineIds: string[] = [];
  const appliedByRule = new Map<RemapRuleId, AppliedRemapRule>();
  let changed = false;

  const lines = input.lines.map((line) => {
    const rule = findMatchingRuleForLine(line, rules);
    if (!rule) {
      if (isSalesItemLine(line) || line.DetailType === 'SubTotalLineDetail') {
        return sanitizeInvoiceLinesForUpdate([line])[0]!;
      }
      return line;
    }

    const target = input.targetsByName[rule.targetItemName];
    if (!target?.id) return line;

    changed = true;
    if (line.Id) {
      changedLineIds.push(line.Id);
      const existing = appliedByRule.get(rule.id);
      if (existing) {
        existing.lineIds.push(line.Id);
      } else {
        appliedByRule.set(rule.id, {
          ruleId: rule.id,
          targetItemName: rule.targetItemName,
          lineIds: [line.Id],
        });
      }
    }

    const match = rule.match;
    let nextDescription = line.Description;
    if (
      rule.replaceDescriptionWhenExact &&
      match.kind === 'exact_item_or_description' &&
      (line.Description === match.value || !line.Description)
    ) {
      nextDescription = rule.targetItemName;
    }

    return buildSalesItemLineForUpdate({
      line,
      itemRef: { value: target.id, name: target.name },
      description: nextDescription,
    });
  });

  return {
    lines,
    changedLineIds,
    changed,
    appliedRules: [...appliedByRule.values()],
  };
}

export function totalsDiffer(
  before: number | null | undefined,
  after: number | null | undefined,
  tolerance = 0.009
): boolean {
  if (typeof before !== 'number' || typeof after !== 'number') return false;
  if (!Number.isFinite(before) || !Number.isFinite(after)) return false;
  return Math.abs(before - after) > tolerance;
}

function cloneTaxRef(ref: { value?: string; name?: string } | undefined):
  | { value: string; name?: string }
  | undefined {
  if (!ref?.value) return undefined;
  return {
    value: ref.value,
    ...(ref.name ? { name: ref.name } : {}),
  };
}

/**
 * Clone TxnTaxDetail for a sparse invoice update so TaxLine / tax code stay
 * unchanged when only Product/Service ItemRefs are remapped.
 */
export function cloneTxnTaxDetailForUpdate(
  detail: QboTxnTaxDetail | null | undefined
): QboTxnTaxDetail | undefined {
  if (!detail) return undefined;

  const cloned: QboTxnTaxDetail = {};
  const taxCodeRef = cloneTaxRef(detail.TxnTaxCodeRef);
  if (taxCodeRef) cloned.TxnTaxCodeRef = taxCodeRef;

  if (typeof detail.TotalTax === 'number' && Number.isFinite(detail.TotalTax)) {
    cloned.TotalTax = detail.TotalTax;
  }

  if (Array.isArray(detail.TaxLine) && detail.TaxLine.length > 0) {
    cloned.TaxLine = detail.TaxLine.map((line): QboTaxLine => {
      const rateRef = cloneTaxRef(line.TaxLineDetail?.TaxRateRef);
      return {
        ...(typeof line.Amount === 'number' && Number.isFinite(line.Amount)
          ? { Amount: line.Amount }
          : {}),
        DetailType: 'TaxLineDetail',
        TaxLineDetail: {
          ...(rateRef ? { TaxRateRef: rateRef } : {}),
          ...(typeof line.TaxLineDetail?.PercentBased === 'boolean'
            ? { PercentBased: line.TaxLineDetail.PercentBased }
            : {}),
          ...(typeof line.TaxLineDetail?.TaxPercent === 'number' &&
          Number.isFinite(line.TaxLineDetail.TaxPercent)
            ? { TaxPercent: line.TaxLineDetail.TaxPercent }
            : {}),
          ...(typeof line.TaxLineDetail?.NetAmountTaxable === 'number' &&
          Number.isFinite(line.TaxLineDetail.NetAmountTaxable)
            ? { NetAmountTaxable: line.TaxLineDetail.NetAmountTaxable }
            : {}),
        },
      };
    });
  }

  // Nothing meaningful to send — omit from sparse payload.
  if (
    !cloned.TxnTaxCodeRef &&
    typeof cloned.TotalTax !== 'number' &&
    !cloned.TaxLine?.length
  ) {
    return undefined;
  }

  return cloned;
}

export type InvoiceRemapUpdatePayload = {
  Id: string;
  SyncToken: string;
  sparse: true;
  Line: QboInvoiceLine[];
  TxnTaxDetail?: QboTxnTaxDetail;
};

/** Sparse update body: remapped lines + preserved tax detail when present. */
export function buildInvoiceRemapUpdatePayload(input: {
  invoice: Pick<QboInvoice, 'Id' | 'SyncToken' | 'TxnTaxDetail'>;
  lines: QboInvoiceLine[];
}): InvoiceRemapUpdatePayload {
  const payload: InvoiceRemapUpdatePayload = {
    Id: input.invoice.Id,
    SyncToken: input.invoice.SyncToken,
    sparse: true,
    Line: input.lines,
  };

  const taxDetail = cloneTxnTaxDetailForUpdate(input.invoice.TxnTaxDetail);
  if (taxDetail) {
    payload.TxnTaxDetail = taxDetail;
  }

  return payload;
}

function taxLineSignature(line: QboTaxLine): string {
  const detail = line.TaxLineDetail;
  return [
    line.Amount ?? '',
    detail?.TaxRateRef?.value ?? '',
    detail?.PercentBased ?? '',
    detail?.TaxPercent ?? '',
    detail?.NetAmountTaxable ?? '',
  ].join('|');
}

/** True when TaxLine set / tax code / total tax changed after an update. */
export function txnTaxDetailChanged(
  before: QboTxnTaxDetail | null | undefined,
  after: QboTxnTaxDetail | null | undefined
): boolean {
  if (!before && !after) return false;
  if (!before || !after) return true;

  if ((before.TxnTaxCodeRef?.value ?? '') !== (after.TxnTaxCodeRef?.value ?? '')) {
    return true;
  }
  if (totalsDiffer(before.TotalTax, after.TotalTax)) return true;

  const beforeLines = before.TaxLine ?? [];
  const afterLines = after.TaxLine ?? [];
  if (beforeLines.length !== afterLines.length) return true;

  const beforeSigs = beforeLines.map(taxLineSignature).sort();
  const afterSigs = afterLines.map(taxLineSignature).sort();
  return beforeSigs.some((sig, index) => sig !== afterSigs[index]);
}
