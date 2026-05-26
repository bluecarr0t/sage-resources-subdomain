#!/usr/bin/env npx tsx
/**
 * Phase 3: rebuild public.hipcamp / public.campspot from normalized mirror + matview snapshots.
 * Replaces manual UI CSV upload (Option B in DO_SUPABASE_SYNC_DECISIONS.md).
 *
 * Usage:
 *   npm run transform:flat-sites
 *   npm run transform:flat-sites -- --only=campspot
 *   npm run transform:flat-sites -- --skip-matviews
 *   npm run transform:flat-sites -- --skip-downstream
 *   npm run transform:flat-sites -- --dry-run
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { PoolClient } from 'pg';
import { closeSupabaseDirectPool, getSupabaseDirectPool } from '../../lib/supabase-direct-db';
import { executeDownstreamRefresh } from '../downstream-refresh/execute-downstream-refresh';
import { syncCampingsMatviewSnapshots } from '../sync-do-to-supabase/matview-snapshot';
import { runFlatTransformPreflight, type FlatOta } from './preflight';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATIONS_DIR = resolve(process.cwd(), 'scripts/migrations/flat-sites-transform');

interface CliOptions {
  otas: FlatOta[];
  skipMatviews: boolean;
  skipDownstream: boolean;
  dryRun: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only='));
  let otas: FlatOta[] = ['campspot', 'hipcamp'];
  if (onlyArg) {
    const raw = onlyArg.slice(7).split(',').map((s) => s.trim().toLowerCase());
    otas = raw.filter((o): o is FlatOta => o === 'campspot' || o === 'hipcamp');
    if (otas.length === 0) {
      throw new Error('--only must be campspot and/or hipcamp');
    }
  }
  return {
    otas,
    skipMatviews: args.includes('--skip-matviews'),
    skipDownstream: args.includes('--skip-downstream'),
    dryRun: args.includes('--dry-run'),
  };
}

function readSqlFile(name: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, name), 'utf8');
}

async function ensureAuditTable(client: PoolClient): Promise<void> {
  await client.query(readSqlFile('03-flat-transform-audit.sql'));
}

async function startAuditRun(
  client: PoolClient,
  ota: FlatOta,
  rowsBefore: number,
  options: CliOptions
): Promise<number> {
  const res = await client.query<{ id: string }>(
    `
    INSERT INTO public.flat_transform_runs (ota, rows_before, status, options)
    VALUES ($1, $2, 'running', $3::jsonb)
    RETURNING id
  `,
    [ota, rowsBefore, JSON.stringify(options)]
  );
  return parseInt(res.rows[0]!.id, 10);
}

async function finishAuditRun(
  client: PoolClient,
  runId: number,
  status: 'success' | 'failed',
  rowsInserted: number,
  errorMessage?: string
): Promise<void> {
  await client.query(
    `
    UPDATE public.flat_transform_runs
    SET finished_at = now(), status = $2, rows_inserted = $3, error_message = $4
    WHERE id = $1
  `,
    [runId, status, rowsInserted, errorMessage ?? null]
  );
}

const OTA_SQL: Record<FlatOta, string> = {
  campspot: '01-rebuild-campspot-flat.sql',
  hipcamp: '02-rebuild-hipcamp-flat.sql',
};

async function rebuildFlatTable(
  client: PoolClient,
  ota: FlatOta,
  options: CliOptions
): Promise<number> {
  const countBefore = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.${ota}`
  );
  const rowsBefore = parseInt(countBefore.rows[0]?.count ?? '0', 10);
  const runId = await startAuditRun(client, ota, rowsBefore, options);

  try {
    if (options.dryRun) {
      console.log(`  [dry-run] would execute ${OTA_SQL[ota]} (current rows: ${rowsBefore})`);
      await finishAuditRun(client, runId, 'success', 0);
      return rowsBefore;
    }

    const sql = readSqlFile(OTA_SQL[ota]);
    await client.query(sql);

    const countAfter = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.${ota}`
    );
    const rowsInserted = parseInt(countAfter.rows[0]?.count ?? '0', 10);
    await finishAuditRun(client, runId, 'success', rowsInserted);
    return rowsInserted;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishAuditRun(client, runId, 'failed', 0, message);
    throw err;
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  console.log('Phase 3 flat sites transform');
  console.log(`  OTAs: ${options.otas.join(', ')}`);
  console.log(`  dry-run: ${options.dryRun}`);
  console.log(`  sync matviews: ${!options.skipMatviews}`);
  console.log(`  downstream refresh: ${!options.skipDownstream && !options.dryRun}\n`);

  const pool = getSupabaseDirectPool();
  const client = await pool.connect();

  try {
    const preflight = await runFlatTransformPreflight(client, options.otas, {
      requireMatviewSnapshots: options.skipMatviews,
    });
    console.log('Preflight mirror table counts:');
    for (const [table, count] of Object.entries(preflight.counts)) {
      console.log(`  ${table}: ${count.toLocaleString()}`);
    }

    if (!preflight.ok) {
      console.error('\nPreflight failed:');
      for (const m of preflight.missing) console.error(`  - ${m}`);
      process.exit(1);
    }

    if (!options.skipMatviews && !options.dryRun) {
      await syncCampingsMatviewSnapshots({ supabaseClient: client, dryRun: false });
    } else if (!options.skipMatviews && options.dryRun) {
      console.log('\n[dry-run] Skipping matview pull from DO (run sync:do:matviews before a real transform).');
    }

    console.log('\nApplying helper functions and audit table...');
    if (!options.dryRun) {
      await client.query(readSqlFile('00-helper-functions.sql'));
    }
    await ensureAuditTable(client);

    for (const ota of options.otas) {
      console.log(`\nRebuilding public.${ota}...`);
      const rows = await rebuildFlatTable(client, ota, options);
      console.log(`  public.${ota}: ${rows.toLocaleString()} rows`);
    }

    if (!options.skipDownstream && !options.dryRun) {
      const downstream = await executeDownstreamRefresh({
        pgClient: client,
        triggerSource: 'transform:flat-sites',
      });
      if (downstream.status === 'failed') {
        process.exit(1);
      }
    } else if (!options.skipDownstream && options.dryRun) {
      console.log('\n[dry-run] Would run Phase 4 downstream refresh after transform.');
      await executeDownstreamRefresh({
        dryRun: true,
        triggerSource: 'transform:flat-sites',
      });
    }

    console.log('\nDone.');
  } finally {
    client.release();
    await closeSupabaseDirectPool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
