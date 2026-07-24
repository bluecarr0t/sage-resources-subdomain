import {
  buildInvoiceRemapUpdatePayload,
  cloneTxnTaxDetailForUpdate,
  findMatchingRuleForLine,
  getInvoiceRemapSkipReason,
  invoiceDocNumberMatchesPrefix,
  invoiceIsVoided,
  invoiceMatchesRemapCriteria,
  invoiceSalesLinesAreAllZero,
  lineMatchesRemapRule,
  lineMatchesSourceItem,
  remapInvoiceLines,
  totalsDiffer,
  txnTaxDetailChanged,
} from '@/lib/quickbooks/invoice-match';
import { QBO_REMAP_RULES } from '@/lib/quickbooks/remap-rules';
import type { QboInvoice, QboTxnTaxDetail } from '@/lib/quickbooks/qbo-types';

describe('quickbooks invoice-match', () => {
  const matchingInvoice: QboInvoice = {
    Id: '1',
    SyncToken: '0',
    DocNumber: 'INV-1001',
    TotalAmt: 2500,
    Line: [
      {
        Id: '1',
        DetailType: 'SalesItemLineDetail',
        Description: 'Appraisal Review',
        Amount: 2500,
        SalesItemLineDetail: {
          ItemRef: { value: '9', name: 'Appraisal Review' },
          Qty: 1,
          UnitPrice: 2500,
        },
      },
    ],
  };

  it('matches INV- doc numbers only', () => {
    expect(invoiceDocNumberMatchesPrefix('INV-1001')).toBe(true);
    expect(invoiceDocNumberMatchesPrefix('QBO-1001')).toBe(false);
    expect(invoiceDocNumberMatchesPrefix(undefined)).toBe(false);
  });

  it('detects voided and all-zero invoices', () => {
    expect(invoiceIsVoided({ PrivateNote: 'Voided' })).toBe(true);
    expect(invoiceIsVoided({ PrivateNote: 'Voided - Voided' })).toBe(true);
    expect(invoiceIsVoided({ PrivateNote: undefined })).toBe(false);
    expect(
      invoiceSalesLinesAreAllZero({
        Line: [
          {
            DetailType: 'SalesItemLineDetail',
            Amount: 0,
            SalesItemLineDetail: { ItemRef: { value: '1', name: 'Appraisal Review' } },
          },
        ],
      })
    ).toBe(true);
    expect(getInvoiceRemapSkipReason({ PrivateNote: 'Voided', Line: matchingInvoice.Line })).toBe(
      'Invoice is voided'
    );
    expect(
      getInvoiceRemapSkipReason({
        Line: [
          {
            DetailType: 'SalesItemLineDetail',
            Amount: 0,
            Description: 'Appraisal Review',
            SalesItemLineDetail: { ItemRef: { value: '1', name: 'Appraisal Review' } },
          },
        ],
      })
    ).toBe('All sales lines are already $0');
  });

  it('does not match voided invoices even when lines would otherwise remap', () => {
    expect(
      invoiceMatchesRemapCriteria({
        ...matchingInvoice,
        PrivateNote: 'Voided',
        TotalAmt: 0,
        Line: [
          {
            Id: '1',
            DetailType: 'SalesItemLineDetail',
            Description: 'Feasibility Study',
            Amount: 0,
            SalesItemLineDetail: {
              ItemRef: { value: '9', name: 'Appraisal Review' },
              Qty: 0,
            },
          },
        ],
      })
    ).toBe(false);
  });

  it('matches Appraisal Review on item name or description', () => {
    expect(
      lineMatchesSourceItem(
        {
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: { ItemRef: { value: '1', name: 'Appraisal Review' } },
        },
        'Appraisal Review'
      )
    ).toBe(true);
    expect(
      lineMatchesSourceItem(
        {
          DetailType: 'SalesItemLineDetail',
          Description: 'Appraisal Review',
          SalesItemLineDetail: { ItemRef: { value: '1', name: 'Services' } },
        },
        'Appraisal Review'
      )
    ).toBe(true);
    expect(
      lineMatchesSourceItem(
        {
          DetailType: 'SalesItemLineDetail',
          Description: 'Other',
          SalesItemLineDetail: { ItemRef: { value: '1', name: 'Consulting' } },
        },
        'Appraisal Review'
      )
    ).toBe(false);
  });

  it('matches description containing Appraisal to appraisal services rule', () => {
    const line = {
      Id: '1',
      DetailType: 'SalesItemLineDetail' as const,
      Description: 'Valuation Analysis / Appraisal',
      SalesItemLineDetail: {
        ItemRef: { value: '4', name: 'Feasibility Study - Outdoor Resort' },
      },
    };
    const rule = QBO_REMAP_RULES.find((row) => row.id === 'appraisal_description');
    expect(rule).toBeTruthy();
    expect(lineMatchesRemapRule(line, rule!)).toBe(true);
    expect(findMatchingRuleForLine(line)?.id).toBe('appraisal_description');
  });

  it('skips lines already on the appraisal services target', () => {
    const line = {
      DetailType: 'SalesItemLineDetail' as const,
      Description: 'Valuation Analysis / Appraisal',
      SalesItemLineDetail: {
        ItemRef: { value: '5', name: 'Appraisal Services - Outdoor Resort' },
      },
    };
    expect(findMatchingRuleForLine(line)).toBeNull();
  });

  it('requires both INV- prefix and a matching remap rule', () => {
    expect(invoiceMatchesRemapCriteria(matchingInvoice)).toBe(true);
    expect(
      invoiceMatchesRemapCriteria({
        ...matchingInvoice,
        DocNumber: '1001',
      })
    ).toBe(false);
    expect(
      invoiceMatchesRemapCriteria({
        ...matchingInvoice,
        Line: [
          {
            Id: '1',
            DetailType: 'SalesItemLineDetail',
            Description: 'Something else',
            Amount: 100,
            SalesItemLineDetail: { ItemRef: { value: '2', name: 'Consulting' } },
          },
        ],
      })
    ).toBe(false);
  });

  it('remaps matching lines and preserves qty/rate/amount', () => {
    const result = remapInvoiceLines({
      lines: matchingInvoice.Line ?? [],
      sourceItemName: 'Appraisal Review',
      targetItemId: '42',
      targetItemName: 'Feasibility Study - Outdoor Resort',
    });

    expect(result.changed).toBe(true);
    expect(result.changedLineIds).toEqual(['1']);
    expect(result.lines[0]?.SalesItemLineDetail?.ItemRef).toEqual({
      value: '42',
      name: 'Feasibility Study - Outdoor Resort',
    });
    expect(result.lines[0]?.Description).toBe('Feasibility Study - Outdoor Resort');
    expect(result.lines[0]?.Amount).toBe(2500);
    expect(result.lines[0]?.SalesItemLineDetail?.Qty).toBe(1);
    expect(result.lines[0]?.SalesItemLineDetail?.UnitPrice).toBe(2500);
    expect(result.lines[0]?.SalesItemLineDetail?.ItemAccountRef).toBeUndefined();
    expect(result.lines[0]?.SalesItemLineDetail?.TaxClassificationRef).toBeUndefined();
  });

  it('derives unit price from amount when catalog item has no rate on the line', () => {
    const result = remapInvoiceLines({
      lines: [
        {
          Id: '1',
          DetailType: 'SalesItemLineDetail',
          Description: 'Feasibility Study',
          Amount: 14500,
          SalesItemLineDetail: {
            ItemRef: { value: '1', name: 'Appraisal Review' },
            Qty: 1,
            ItemAccountRef: { value: '66', name: 'Sales' },
            TaxClassificationRef: {},
          },
        },
      ],
      targetsByName: {
        'Feasibility Study - Outdoor Resort': {
          id: '4',
          name: 'Feasibility Study - Outdoor Resort',
        },
      },
    });

    expect(result.lines[0]?.Amount).toBe(14500);
    expect(result.lines[0]?.SalesItemLineDetail?.Qty).toBe(1);
    expect(result.lines[0]?.SalesItemLineDetail?.UnitPrice).toBe(14500);
  });

  it('prefers appraisal description rule over appraisal review item rule', () => {
    const result = remapInvoiceLines({
      lines: [
        {
          Id: '1',
          DetailType: 'SalesItemLineDetail',
          Description: 'Valuation Analysis / Appraisal',
          Amount: 1000,
          SalesItemLineDetail: {
            ItemRef: { value: '1', name: 'Appraisal Review' },
            Qty: 1,
            UnitPrice: 1000,
          },
        },
      ],
      targetsByName: {
        'Appraisal Services - Outdoor Resort': {
          id: '5',
          name: 'Appraisal Services - Outdoor Resort',
        },
        'Feasibility Study - Outdoor Resort': {
          id: '4',
          name: 'Feasibility Study - Outdoor Resort',
        },
      },
    });

    expect(result.changedLineIds).toEqual(['1']);
    expect(result.lines[0]?.SalesItemLineDetail?.ItemRef?.name).toBe(
      'Appraisal Services - Outdoor Resort'
    );
    expect(result.lines[0]?.Description).toBe('Valuation Analysis / Appraisal');
    expect(result.lines[0]?.Amount).toBe(1000);
    expect(result.lines[0]?.SalesItemLineDetail?.Qty).toBe(1);
    expect(result.lines[0]?.SalesItemLineDetail?.UnitPrice).toBe(1000);
    expect(result.appliedRules).toEqual([
      {
        ruleId: 'appraisal_description',
        targetItemName: 'Appraisal Services - Outdoor Resort',
        lineIds: ['1'],
      },
    ]);
  });

  it('compares totals with tolerance', () => {
    expect(totalsDiffer(100, 100)).toBe(false);
    expect(totalsDiffer(100, 100.005)).toBe(false);
    expect(totalsDiffer(100, 99)).toBe(true);
    expect(totalsDiffer(null, 100)).toBe(false);
  });

  it('clones TxnTaxDetail.TaxLine for sparse updates', () => {
    const detail: QboTxnTaxDetail = {
      TxnTaxCodeRef: { value: '4' },
      TotalTax: 0,
      TaxLine: [
        {
          Amount: 0,
          DetailType: 'TaxLineDetail',
          TaxLineDetail: {
            TaxRateRef: { value: '3' },
            PercentBased: true,
            TaxPercent: 6.25,
            NetAmountTaxable: 0,
          },
        },
        {
          Amount: 0,
          DetailType: 'TaxLineDetail',
          TaxLineDetail: {
            TaxRateRef: { value: '4' },
            PercentBased: true,
            TaxPercent: 1.75,
            NetAmountTaxable: 0,
          },
        },
      ],
    };

    const cloned = cloneTxnTaxDetailForUpdate(detail);
    expect(cloned).toEqual({
      TxnTaxCodeRef: { value: '4' },
      TotalTax: 0,
      TaxLine: [
        {
          Amount: 0,
          DetailType: 'TaxLineDetail',
          TaxLineDetail: {
            TaxRateRef: { value: '3' },
            PercentBased: true,
            TaxPercent: 6.25,
            NetAmountTaxable: 0,
          },
        },
        {
          Amount: 0,
          DetailType: 'TaxLineDetail',
          TaxLineDetail: {
            TaxRateRef: { value: '4' },
            PercentBased: true,
            TaxPercent: 1.75,
            NetAmountTaxable: 0,
          },
        },
      ],
    });
    expect(txnTaxDetailChanged(detail, cloned)).toBe(false);
    expect(
      txnTaxDetailChanged(detail, {
        ...detail,
        TaxLine: [
          {
            Amount: 10,
            DetailType: 'TaxLineDetail',
            TaxLineDetail: {
              TaxRateRef: { value: '3' },
              PercentBased: true,
              TaxPercent: 6.25,
              NetAmountTaxable: 160,
            },
          },
        ],
      })
    ).toBe(true);
  });

  it('includes TxnTaxDetail on remap update payloads when present', () => {
    const payload = buildInvoiceRemapUpdatePayload({
      invoice: {
        Id: '13819',
        SyncToken: '9',
        TxnTaxDetail: {
          TxnTaxCodeRef: { value: '4' },
          TotalTax: 12.5,
          TaxLine: [
            {
              Amount: 12.5,
              DetailType: 'TaxLineDetail',
              TaxLineDetail: {
                TaxRateRef: { value: '3' },
                PercentBased: true,
                TaxPercent: 6.25,
                NetAmountTaxable: 200,
              },
            },
          ],
        },
      },
      lines: [
        {
          Id: '5',
          DetailType: 'SalesItemLineDetail',
          Amount: 200,
          Description: 'Feasibility Study',
          SalesItemLineDetail: {
            ItemRef: { value: '4', name: 'Feasibility Study - Outdoor Resort' },
            Qty: 1,
            UnitPrice: 200,
            TaxCodeRef: { value: 'TAX' },
          },
        },
      ],
    });

    expect(payload.sparse).toBe(true);
    expect(payload.TxnTaxDetail?.TxnTaxCodeRef?.value).toBe('4');
    expect(payload.TxnTaxDetail?.TotalTax).toBe(12.5);
    expect(payload.TxnTaxDetail?.TaxLine).toHaveLength(1);
    expect(payload.TxnTaxDetail?.TaxLine?.[0]?.TaxLineDetail?.TaxPercent).toBe(6.25);
  });

  it('omits TxnTaxDetail when the invoice has none', () => {
    const payload = buildInvoiceRemapUpdatePayload({
      invoice: { Id: '1', SyncToken: '0' },
      lines: [],
    });
    expect(payload.TxnTaxDetail).toBeUndefined();
  });
});
