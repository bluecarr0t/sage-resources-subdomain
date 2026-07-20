/**
 * Seed extra sandbox Product/Services and multi-line INV- invoices
 * with Appraisal Review as a 50% retainer (qty 0.5 @ $7,000).
 *
 *   npx tsx scripts/seed-quickbooks-sandbox-multi-line-invoices.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  QBO_REMAP_DOC_NUMBER_PREFIX,
  QBO_SOURCE_ITEM_NAME,
} from '../lib/quickbooks/constants';
import {
  qboCreateServiceItem,
  qboFindItemByName,
  qboQuery,
} from '../lib/quickbooks/client';
import {
  getQuickbooksAppConfig,
  getQuickbooksEnvironment,
} from '../lib/quickbooks/config';
import { getValidAccessToken, loadQuickbooksConnection } from '../lib/quickbooks/tokens';
import type { QboItem } from '../lib/quickbooks/qbo-types';

type QboAccount = { Id: string; Name: string; AccountType?: string };
type QboCustomer = { Id: string; DisplayName: string };
type CreatedInvoice = { Id: string; DocNumber?: string; TotalAmt?: number };

const EXTRA_SERVICES: Array<{ name: string; unitPrice: number }> = [
  { name: 'Site Visit', unitPrice: 1500 },
  { name: 'Expedite', unitPrice: 750 },
  { name: 'Market Analysis Add-On', unitPrice: 1200 },
  { name: 'Travel Expense', unitPrice: 350 },
];

const APPRAISAL_REVIEW_UNIT_PRICE = 7000;
const APPRAISAL_REVIEW_QTY = 0.5; // 50% retainer

async function findIncomeAccountId(): Promise<string> {
  const response = await qboQuery<QboAccount>(
    "select Id, Name, AccountType from Account where AccountType = 'Income' maxresults 50"
  );
  const accounts =
    (response.QueryResponse as { Account?: QboAccount[] } | undefined)?.Account ?? [];
  if (accounts.length === 0) {
    throw new Error('No Income accounts found in this QuickBooks company.');
  }
  const preferred = accounts.find((a) => /fees billed|services|sales/i.test(a.Name));
  return (preferred ?? accounts[0]!).Id;
}

async function ensureServiceItem(input: {
  name: string;
  incomeAccountId: string;
  unitPrice: number;
}): Promise<QboItem> {
  const existing = await qboFindItemByName(input.name);
  if (existing?.Id) return existing;
  return qboCreateServiceItem({
    name: input.name,
    incomeAccountRefValue: input.incomeAccountId,
    description: input.name,
    unitPrice: input.unitPrice,
  });
}

async function qboCreateInvoice(payload: Record<string, unknown>): Promise<CreatedInvoice> {
  const appConfig = getQuickbooksAppConfig();
  if (!appConfig) throw new Error('QuickBooks app is not configured.');
  const { accessToken, realmId } = await getValidAccessToken();
  const url = `${appConfig.apiBaseUrl}/v3/company/${encodeURIComponent(realmId)}/invoice?minorversion=75`;
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

function salesLine(input: {
  item: QboItem;
  qty: number;
  unitPrice: number;
  description?: string;
}) {
  const amount = Number((input.qty * input.unitPrice).toFixed(2));
  return {
    Amount: amount,
    DetailType: 'SalesItemLineDetail',
    Description: input.description ?? input.item.Name,
    SalesItemLineDetail: {
      ItemRef: { value: input.item.Id, name: input.item.Name },
      Qty: input.qty,
      UnitPrice: input.unitPrice,
    },
  };
}

async function main() {
  const env = getQuickbooksEnvironment();
  const connection = await loadQuickbooksConnection();
  console.log(
    JSON.stringify(
      { environment: env, realmId: connection?.realmId ?? null },
      null,
      2
    )
  );

  if (env !== 'sandbox') {
    throw new Error(`Refusing to seed outside sandbox (env=${env}).`);
  }
  if (!connection) {
    throw new Error('QuickBooks is not connected. Connect from /admin/quickbooks first.');
  }

  const incomeAccountId = await findIncomeAccountId();

  const appraisalReview = await ensureServiceItem({
    name: QBO_SOURCE_ITEM_NAME,
    incomeAccountId,
    unitPrice: APPRAISAL_REVIEW_UNIT_PRICE,
  });

  const extras: QboItem[] = [];
  for (const service of EXTRA_SERVICES) {
    const item = await ensureServiceItem({
      name: service.name,
      incomeAccountId,
      unitPrice: service.unitPrice,
    });
    extras.push(item);
    console.log(
      JSON.stringify(
        { service: item.Name, id: item.Id, unitPrice: service.unitPrice },
        null,
        2
      )
    );
  }

  const customersRes = await qboQuery<QboCustomer>(
    'select Id, DisplayName from Customer maxresults 10'
  );
  const customers =
    (customersRes.QueryResponse as { Customer?: QboCustomer[] } | undefined)?.Customer ?? [];
  if (customers.length === 0) {
    throw new Error('No customers found in sandbox.');
  }

  const stamp = `${new Date().toISOString().slice(5, 10).replace('-', '')}B`; // MMDDB — ≤21 chars with INV-
  const siteVisit = extras.find((i) => i.Name === 'Site Visit')!;
  const expedite = extras.find((i) => i.Name === 'Expedite')!;
  const marketAddOn = extras.find((i) => i.Name === 'Market Analysis Add-On')!;
  const travel = extras.find((i) => i.Name === 'Travel Expense')!;

  const specs = [
    {
      docNumber: `${QBO_REMAP_DOC_NUMBER_PREFIX}${stamp}-1`,
      customer: customers[0]!,
      note: 'retainer + site visit + expedite',
      lines: [
        salesLine({
          item: appraisalReview,
          qty: APPRAISAL_REVIEW_QTY,
          unitPrice: APPRAISAL_REVIEW_UNIT_PRICE,
          description: QBO_SOURCE_ITEM_NAME,
        }),
        salesLine({ item: siteVisit, qty: 1, unitPrice: 1500 }),
        salesLine({ item: expedite, qty: 1, unitPrice: 750 }),
      ],
    },
    {
      docNumber: `${QBO_REMAP_DOC_NUMBER_PREFIX}${stamp}-2`,
      customer: customers[3] ?? customers[1] ?? customers[0]!,
      note: 'retainer + market add-on + travel',
      lines: [
        salesLine({
          item: appraisalReview,
          qty: APPRAISAL_REVIEW_QTY,
          unitPrice: APPRAISAL_REVIEW_UNIT_PRICE,
          description: QBO_SOURCE_ITEM_NAME,
        }),
        salesLine({ item: marketAddOn, qty: 1, unitPrice: 1200 }),
        salesLine({ item: travel, qty: 2, unitPrice: 350 }),
      ],
    },
    {
      docNumber: `${QBO_REMAP_DOC_NUMBER_PREFIX}${stamp}-3`,
      customer: customers[4] ?? customers[2] ?? customers[0]!,
      note: 'full multi-service mix with retainer',
      lines: [
        salesLine({
          item: appraisalReview,
          qty: APPRAISAL_REVIEW_QTY,
          unitPrice: APPRAISAL_REVIEW_UNIT_PRICE,
          description: QBO_SOURCE_ITEM_NAME,
        }),
        salesLine({ item: siteVisit, qty: 1, unitPrice: 1500 }),
        salesLine({ item: expedite, qty: 1, unitPrice: 750 }),
        salesLine({ item: marketAddOn, qty: 1, unitPrice: 1200 }),
        salesLine({ item: travel, qty: 1, unitPrice: 350 }),
      ],
    },
  ];

  // DocNumber max 21 — verify before create
  for (const spec of specs) {
    if (spec.docNumber.length > 21) {
      throw new Error(`DocNumber too long (${spec.docNumber.length}): ${spec.docNumber}`);
    }
  }

  const created = [];
  for (const spec of specs) {
    const invoice = await qboCreateInvoice({
      DocNumber: spec.docNumber,
      CustomerRef: { value: spec.customer.Id },
      PrivateNote: `Sage remapper multi-line sandbox mock — ${spec.note}`,
      Line: spec.lines,
    });
    created.push({
      id: invoice.Id,
      docNumber: invoice.DocNumber,
      total: invoice.TotalAmt,
      customer: spec.customer.DisplayName,
      lineCount: spec.lines.length,
      appraisalReview: {
        qty: APPRAISAL_REVIEW_QTY,
        unitPrice: APPRAISAL_REVIEW_UNIT_PRICE,
        amount: APPRAISAL_REVIEW_QTY * APPRAISAL_REVIEW_UNIT_PRICE,
      },
      note: spec.note,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        appraisalReviewItem: { id: appraisalReview.Id, name: appraisalReview.Name },
        extraServices: extras.map((i) => ({ id: i.Id, name: i.Name })),
        created,
        next: 'Dry run on /admin/quickbooks — only Appraisal Review lines should remap; other services stay unchanged.',
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
