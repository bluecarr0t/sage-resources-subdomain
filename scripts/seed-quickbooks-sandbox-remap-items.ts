/**
 * Seed sandbox QBO Product/Services needed by the INV- remapper.
 * Uses the already-connected OAuth tokens (sandbox only).
 *
 *   npx tsx scripts/seed-quickbooks-sandbox-remap-items.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  QBO_SOURCE_ITEM_NAME,
  QBO_TARGET_ITEM_NAME,
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
import { loadQuickbooksConnection } from '../lib/quickbooks/tokens';
import type { QboItem } from '../lib/quickbooks/qbo-types';

type QboAccount = {
  Id: string;
  Name: string;
  AccountType?: string;
  AccountSubType?: string;
  Active?: boolean;
};

async function findIncomeAccountId(): Promise<string> {
  const response = await qboQuery<QboAccount>(
    "select Id, Name, AccountType, AccountSubType from Account where AccountType = 'Income' maxresults 50"
  );
  const accounts = (response.QueryResponse as { Account?: QboAccount[] })?.Account ?? [];
  if (accounts.length === 0) {
    throw new Error('No Income accounts found in this QuickBooks company.');
  }

  const preferred = accounts.find((a) =>
    /services|sales|consulting|fee/i.test(a.Name)
  );
  const chosen = preferred ?? accounts[0]!;
  console.log(
    JSON.stringify(
      {
        incomeAccountId: chosen.Id,
        incomeAccountName: chosen.Name,
        candidates: accounts.slice(0, 10).map((a) => ({ id: a.Id, name: a.Name })),
      },
      null,
      2
    )
  );
  return chosen.Id;
}

async function ensureServiceItem(input: {
  name: string;
  incomeAccountId: string;
  unitPrice?: number;
}): Promise<QboItem> {
  const existing = await qboFindItemByName(input.name);
  if (existing?.Id) {
    console.log(
      JSON.stringify(
        {
          action: 'exists',
          name: existing.Name,
          id: existing.Id,
          type: existing.Type,
          incomeAccountId: existing.IncomeAccountRef?.value ?? null,
        },
        null,
        2
      )
    );
    return existing;
  }

  const created = await qboCreateServiceItem({
    name: input.name,
    incomeAccountRefValue: input.incomeAccountId,
    description: input.name,
    unitPrice: input.unitPrice,
  });
  console.log(
    JSON.stringify(
      {
        action: 'created',
        name: created.Name,
        id: created.Id,
        type: created.Type,
        incomeAccountId: created.IncomeAccountRef?.value ?? null,
      },
      null,
      2
    )
  );
  return created;
}

async function main() {
  const env = getQuickbooksEnvironment();
  const cfg = getQuickbooksAppConfig();
  const connection = await loadQuickbooksConnection();

  console.log(
    JSON.stringify(
      {
        environment: env,
        configured: Boolean(cfg),
        connected: Boolean(connection),
        realmId: connection?.realmId ?? null,
        source: connection?.source ?? null,
        apiBaseUrl: cfg?.apiBaseUrl ?? null,
      },
      null,
      2
    )
  );

  if (env !== 'sandbox') {
    throw new Error(
      `Refusing to seed: QUICKBOOKS_ENVIRONMENT is "${env}". Set sandbox before running.`
    );
  }
  if (!cfg || !connection) {
    throw new Error('QuickBooks app/connection missing. Connect from /admin/quickbooks first.');
  }

  const incomeAccountId = await findIncomeAccountId();

  const source = await ensureServiceItem({
    name: QBO_SOURCE_ITEM_NAME,
    incomeAccountId,
    unitPrice: 2500,
  });
  const target = await ensureServiceItem({
    name: QBO_TARGET_ITEM_NAME,
    incomeAccountId,
    unitPrice: 2500,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceItem: { id: source.Id, name: source.Name },
        targetItem: { id: target.Id, name: target.Name },
        note: 'Sandbox only — production Sage Outdoor Commercial was not modified.',
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
