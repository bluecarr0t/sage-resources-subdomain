/**
 * Create sandbox mock invoices for remapper testing.
 * Requires QUICKBOOKS_ENVIRONMENT=sandbox and an OAuth connection.
 *
 *   npx tsx scripts/seed-quickbooks-sandbox-mock-invoices.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  QBO_REMAP_DOC_NUMBER_PREFIX,
  QBO_SOURCE_ITEM_NAME,
} from '../lib/quickbooks/constants';
import { qboFindItemByName, qboQuery } from '../lib/quickbooks/client';
import {
  getQuickbooksAppConfig,
  getQuickbooksEnvironment,
} from '../lib/quickbooks/config';
import { getValidAccessToken, loadQuickbooksConnection } from '../lib/quickbooks/tokens';

type QboCustomer = { Id: string; DisplayName: string };
type CreatedInvoice = {
  Id: string;
  DocNumber?: string;
  TotalAmt?: number;
};

async function qboCreateInvoice(payload: Record<string, unknown>): Promise<CreatedInvoice> {
  const config = getQuickbooksAppConfig();
  if (!config) throw new Error('QuickBooks app is not configured.');
  const { accessToken, realmId } = await getValidAccessToken();
  const url = `${config.apiBaseUrl}/v3/company/${encodeURIComponent(realmId)}/invoice?minorversion=75`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as {
    Invoice?: CreatedInvoice;
    Fault?: { Error?: Array<{ Message?: string; Detail?: string }> };
  };
  if (!res.ok || !json.Invoice) {
    const fault = json.Fault?.Error?.[0];
    throw new Error(fault?.Detail || fault?.Message || `Create invoice failed (${res.status})`);
  }
  return json.Invoice;
}

async function main() {
  const env = getQuickbooksEnvironment();
  const connection = await loadQuickbooksConnection();
  console.log(
    JSON.stringify(
      {
        environment: env,
        realmId: connection?.realmId ?? null,
      },
      null,
      2
    )
  );

  if (env !== 'sandbox') {
    throw new Error(`Refusing to create mock invoices outside sandbox (env=${env}).`);
  }
  if (!connection) {
    throw new Error('QuickBooks is not connected. Connect from /admin/quickbooks first.');
  }

  const sourceItem = await qboFindItemByName(QBO_SOURCE_ITEM_NAME);
  if (!sourceItem?.Id) {
    throw new Error(
      `Item "${QBO_SOURCE_ITEM_NAME}" not found. Run seed-quickbooks-sandbox-remap-items.ts first.`
    );
  }

  const customersRes = await qboQuery<QboCustomer>(
    'select Id, DisplayName from Customer maxresults 5'
  );
  const customers =
    (customersRes.QueryResponse as { Customer?: QboCustomer[] } | undefined)?.Customer ?? [];
  if (customers.length === 0) {
    throw new Error('No customers found in sandbox.');
  }

  const stamp = new Date().toISOString().slice(5, 10).replace('-', ''); // MMDD
  const specs = [
    {
      docNumber: `${QBO_REMAP_DOC_NUMBER_PREFIX}M${stamp}-01`,
      customer: customers[0]!,
      amount: 2500,
      qty: 1,
      note: 'should match remapper',
    },
    {
      docNumber: `${QBO_REMAP_DOC_NUMBER_PREFIX}M${stamp}-02`,
      customer: customers[1] ?? customers[0]!,
      amount: 1800,
      qty: 1,
      note: 'should match remapper',
    },
    {
      docNumber: `${QBO_REMAP_DOC_NUMBER_PREFIX}M${stamp}-03`,
      customer: customers[2] ?? customers[0]!,
      amount: 3200,
      qty: 1,
      note: 'should match remapper',
    },
  ];

  const created = [];
  for (const spec of specs) {
    const description = QBO_SOURCE_ITEM_NAME;
    const invoice = await qboCreateInvoice({
      DocNumber: spec.docNumber,
      CustomerRef: { value: spec.customer.Id },
      PrivateNote: `Sage remapper sandbox mock — ${spec.note}`,
      Line: [
        {
          Amount: spec.amount * spec.qty,
          DetailType: 'SalesItemLineDetail',
          Description: description,
          SalesItemLineDetail: {
            ItemRef: {
              value: sourceItem.Id,
              name: sourceItem.Name,
            },
            Qty: spec.qty,
            UnitPrice: spec.amount,
          },
        },
      ],
    });
    created.push({
      id: invoice.Id,
      docNumber: invoice.DocNumber,
      total: invoice.TotalAmt,
      customer: spec.customer.DisplayName,
      note: spec.note,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceItem: { id: sourceItem.Id, name: sourceItem.Name },
        created,
        next: 'Run Dry run on /admin/quickbooks — expect matched ≥ 3.',
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
