#!/usr/bin/env tsx
/**
 * One-shot / dry-run remapper for INV- invoices with "Appraisal Review" lines.
 *
 * Usage:
 *   npx tsx scripts/quickbooks-remap-invoices.ts --dry-run
 *   npx tsx scripts/quickbooks-remap-invoices.ts --live
 *   npx tsx scripts/quickbooks-remap-invoices.ts --live --updated-since-hours=2
 *
 * Requires QUICKBOOKS_CLIENT_ID/SECRET and a stored connection
 * (admin OAuth or QUICKBOOKS_REFRESH_TOKEN + QUICKBOOKS_REALM_ID).
 */

import {
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  remapMatchingInvoices,
} from '../lib/quickbooks';

function parseArgs(argv: string[]) {
  const dryRun = !argv.includes('--live');
  const hoursArg = argv.find((arg) => arg.startsWith('--updated-since-hours='));
  const hours = hoursArg ? Number(hoursArg.split('=')[1]) : null;
  return {
    dryRun,
    updatedSinceHours: Number.isFinite(hours) && hours !== null && hours > 0 ? hours : null,
  };
}

async function main() {
  const { dryRun, updatedSinceHours } = parseArgs(process.argv.slice(2));

  if (!isQuickbooksAppConfigured()) {
    throw new Error('Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET');
  }

  const connection = await loadQuickbooksConnection();
  if (!connection) {
    throw new Error(
      'QuickBooks is not connected. Use /admin/quickbooks Connect, or set QUICKBOOKS_REFRESH_TOKEN and QUICKBOOKS_REALM_ID.'
    );
  }

  const updatedSince =
    updatedSinceHours !== null
      ? new Date(Date.now() - updatedSinceHours * 60 * 60 * 1000)
      : undefined;

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'live',
        realmId: connection.realmId,
        updatedSince: updatedSince?.toISOString() ?? null,
      },
      null,
      2
    )
  );

  const summary = await remapMatchingInvoices({
    dryRun,
    source: 'script',
    updatedSince,
  });

  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
