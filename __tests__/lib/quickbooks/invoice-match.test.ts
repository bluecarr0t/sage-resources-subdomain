import {
  invoiceDocNumberMatchesPrefix,
  invoiceMatchesRemapCriteria,
  lineMatchesSourceItem,
  remapInvoiceLines,
} from '@/lib/quickbooks/invoice-match';
import type { QboInvoice } from '@/lib/quickbooks/qbo-types';

describe('quickbooks invoice-match', () => {
  const matchingInvoice: QboInvoice = {
    Id: '1',
    SyncToken: '0',
    DocNumber: 'INV-1001',
    Line: [
      {
        Id: '1',
        DetailType: 'SalesItemLineDetail',
        Description: 'Appraisal Review',
        SalesItemLineDetail: {
          ItemRef: { value: '9', name: 'Appraisal Review' },
        },
      },
    ],
  };

  it('matches INV- doc numbers only', () => {
    expect(invoiceDocNumberMatchesPrefix('INV-1001')).toBe(true);
    expect(invoiceDocNumberMatchesPrefix('QBO-1001')).toBe(false);
    expect(invoiceDocNumberMatchesPrefix(undefined)).toBe(false);
  });

  it('matches Appraisal Review on item name or description', () => {
    expect(
      lineMatchesSourceItem({
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: { ItemRef: { value: '1', name: 'Appraisal Review' } },
      })
    ).toBe(true);
    expect(
      lineMatchesSourceItem({
        DetailType: 'SalesItemLineDetail',
        Description: 'Appraisal Review',
        SalesItemLineDetail: { ItemRef: { value: '1', name: 'Services' } },
      })
    ).toBe(true);
    expect(
      lineMatchesSourceItem({
        DetailType: 'SalesItemLineDetail',
        Description: 'Other',
        SalesItemLineDetail: { ItemRef: { value: '1', name: 'Consulting' } },
      })
    ).toBe(false);
  });

  it('requires both INV- prefix and Appraisal Review line', () => {
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
            SalesItemLineDetail: { ItemRef: { value: '2', name: 'Consulting' } },
          },
        ],
      })
    ).toBe(false);
  });

  it('remaps matching lines to the target item', () => {
    const result = remapInvoiceLines({
      lines: matchingInvoice.Line ?? [],
      sourceItemName: 'Appraisal Review',
      targetItemId: '42',
      targetItemName: 'Feasibility Study - Outdoor Report',
    });

    expect(result.changed).toBe(true);
    expect(result.changedLineIds).toEqual(['1']);
    expect(result.lines[0]?.SalesItemLineDetail?.ItemRef).toEqual({
      value: '42',
      name: 'Feasibility Study - Outdoor Report',
    });
    expect(result.lines[0]?.Description).toBe('Feasibility Study - Outdoor Report');
  });
});
