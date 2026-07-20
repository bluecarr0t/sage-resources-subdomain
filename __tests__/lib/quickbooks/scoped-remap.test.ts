import { createHmac } from 'crypto';
import {
  invoiceMatchesRemapCriteria,
  remapInvoiceLines,
} from '@/lib/quickbooks/invoice-match';
import {
  collectInvoiceIdsFromWebhookPayload,
  verifyQuickbooksWebhookSignature,
} from '@/lib/quickbooks/webhooks';
import type { QboInvoice } from '@/lib/quickbooks/qbo-types';

function makeInvoice(overrides: Partial<QboInvoice>): QboInvoice {
  return {
    Id: '1',
    SyncToken: '0',
    DocNumber: 'INV-1001',
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
      {
        Id: '2',
        DetailType: 'SubTotalLineDetail',
        Amount: 2500,
      },
    ],
    ...overrides,
  };
}

describe('quickbooks scoped remapper', () => {
  it('updates only INV- invoices that include Appraisal Review', () => {
    const match = makeInvoice({});
    const wrongPrefix = makeInvoice({ DocNumber: 'SOA-1001' });
    const wrongItem = makeInvoice({
      Line: [
        {
          Id: '1',
          DetailType: 'SalesItemLineDetail',
          Description: 'Consulting',
          SalesItemLineDetail: { ItemRef: { value: '3', name: 'Consulting' } },
        },
      ],
    });

    expect(invoiceMatchesRemapCriteria(match)).toBe(true);
    expect(invoiceMatchesRemapCriteria(wrongPrefix)).toBe(false);
    expect(invoiceMatchesRemapCriteria(wrongItem)).toBe(false);
  });

  it('does not alter non-matching lines on a matched invoice', () => {
    const invoice = makeInvoice({
      Line: [
        {
          Id: '1',
          DetailType: 'SalesItemLineDetail',
          Description: 'Appraisal Review',
          SalesItemLineDetail: { ItemRef: { value: '9', name: 'Appraisal Review' } },
        },
        {
          Id: '2',
          DetailType: 'SalesItemLineDetail',
          Description: 'Travel',
          SalesItemLineDetail: { ItemRef: { value: '4', name: 'Travel' } },
        },
        {
          Id: '3',
          DetailType: 'SubTotalLineDetail',
          Amount: 100,
        },
      ],
    });

    const remapped = remapInvoiceLines({
      lines: invoice.Line ?? [],
      sourceItemName: 'Appraisal Review',
      targetItemId: '42',
      targetItemName: 'Feasibility Study - Outdoor Report',
    });

    expect(remapped.changedLineIds).toEqual(['1']);
    expect(remapped.lines[0]?.SalesItemLineDetail?.ItemRef?.name).toBe(
      'Feasibility Study - Outdoor Report'
    );
    expect(remapped.lines[1]?.SalesItemLineDetail?.ItemRef).toEqual({
      value: '4',
      name: 'Travel',
    });
    expect(remapped.lines[2]?.DetailType).toBe('SubTotalLineDetail');
  });

  it('leaves catalog source item name out of scope (criteria is invoice-line only)', () => {
    // Remapper never renames Item entities; only swaps ItemRef on matching lines.
    const untouched = makeInvoice({ DocNumber: 'AR-9' });
    expect(invoiceMatchesRemapCriteria(untouched)).toBe(false);
  });
});

describe('quickbooks webhooks', () => {
  it('verifies intuit-signature HMAC', () => {
    const rawBody = '{"eventNotifications":[]}';
    const verifierToken = 'test-verifier';
    const signature = createHmac('sha256', verifierToken)
      .update(rawBody, 'utf8')
      .digest('base64');

    expect(
      verifyQuickbooksWebhookSignature({
        rawBody,
        signatureHeader: signature,
        verifierToken,
      })
    ).toBe(true);
    expect(
      verifyQuickbooksWebhookSignature({
        rawBody,
        signatureHeader: 'bad',
        verifierToken,
      })
    ).toBe(false);
  });

  it('collects Invoice create/update ids for the expected realm only', () => {
    const ids = collectInvoiceIdsFromWebhookPayload(
      {
        eventNotifications: [
          {
            realmId: 'realm-a',
            dataChangeEvent: {
              entities: [
                { name: 'Invoice', id: '10', operation: 'Create' },
                { name: 'Invoice', id: '11', operation: 'Update' },
                { name: 'Invoice', id: '12', operation: 'Delete' },
                { name: 'Customer', id: '99', operation: 'Create' },
              ],
            },
          },
          {
            realmId: 'realm-b',
            dataChangeEvent: {
              entities: [{ name: 'Invoice', id: '20', operation: 'Create' }],
            },
          },
        ],
      },
      'realm-a'
    );

    expect(ids).toEqual(['10', '11']);
  });
});
