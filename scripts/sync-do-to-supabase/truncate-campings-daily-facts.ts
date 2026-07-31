#!/usr/bin/env npx tsx
/**
 * Truncate leftover partial campings daily fact tables on Supabase.
 *
 * Approach A: DO keeps daily sites/propertys; Supabase keeps dimensions +
 * matview snapshots (latest_sites, site_monthly_analytics, site_yearly_analytics).
 *
 * Usage:
 *   CONFIRM_CAMPINGS_DAILY_TRUNCATE=1 npm run sync:do:truncate-daily-facts -- --truncate-daily-facts
 *
 * Requires both the CLI flag and CONFIRM_CAMPINGS_DAILY_TRUNCATE=1.
 * Refuses if matview snapshot tables are missing or empty.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, appendFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import type { PoolClient } from 'pg';
import { closeSupabaseDirectPool, getSupabaseDirectPool } from '../../lib/supabase-direct-db';

config({ path: resolve(process.cwd(), '.env.local') });

const DAILY_FACT_TABLES = [
  'hipcamp.sites',
  'hipcamp.propertys',
  'campspot.sites',
  'campspot.propertys',
] as const;

const REQUIRED_SNAPSHOTS = [
  'hipcamp.latest_sites',
  'hipcamp.site_monthly_analytics',
  'campspot.latest_sites',
  'campspot.site_monthly_analytics',
] as const;

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

function logLine(logPath: string, line: string): void {
  console.log(line);
  appendFileSync(logPath, `${line}\n`);
}

async function countExact(client: PoolClient, schema: string, table: string): Promise<number> {
  const res = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM ${quoteIdent(schema)}.${quoteIdent(table)}`
  );
  return Number(res.rows[0]?.n ?? 0);
}

async function tableExists(client: PoolClient, schema: string, table: string): Promise<boolean> {
  const res = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schema, table]
  );
  return Boolean(res.rows[0]?.exists);
}

async function relationSizePretty(
  client: PoolClient,
  schema: string,
  table: string
): Promise<string> {
  const res = await client.query<{ size: string }>(
    `SELECT pg_size_pretty(pg_total_relation_size(format('%I.%I', $1::text, $2::text)::regclass)) AS size`,
    [schema, table]
  );
  return res.rows[0]?.size ?? '?';
}

async function assertSnapshotsHealthy(client: PoolClient, logPath: string): Promise<void> {
  for (const qualified of REQUIRED_SNAPSHOTS) {
    const [schema, table] = qualified.split('.') as [string, string];
    if (!(await tableExists(client, schema, table))) {
      throw new Error(`Refuse truncate: missing ${qualified} (run npm run sync:do:matviews)`);
    }
    const n = await countExact(client, schema, table);
    logLine(logPath, `  snapshot ${qualified}: ${n.toLocaleString()} rows`);
    if (n < 1) {
      throw new Error(`Refuse truncate: ${qualified} is empty (run npm run sync:do:matviews)`);
    }
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const truncate = argv.includes('--truncate-daily-facts');
  if (!truncate) {
    console.error(
      'Usage: CONFIRM_CAMPINGS_DAILY_TRUNCATE=1 npm run sync:do:truncate-daily-facts -- --truncate-daily-facts'
    );
    process.exit(1);
  }
  if (process.env.CONFIRM_CAMPINGS_DAILY_TRUNCATE !== '1') {
    throw new Error(
      'Refusing truncate: set CONFIRM_CAMPINGS_DAILY_TRUNCATE=1 together with --truncate-daily-facts'
    );
  }

  const logDir = resolve(homedir(), 'Library/Logs/sage-do-sync');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = resolve(logDir, `truncate-campings-daily-${ts}.log`);

  logLine(logPath, `=== Truncate campings daily facts (${ts}) ===`);
  logLine(logPath, `Log: ${logPath}`);

  const pool = getSupabaseDirectPool();
  const client = await pool.connect();
  try {
    await client.query('SET statement_timeout TO 0');
    await client.query('SET idle_in_transaction_session_timeout TO 0');

    logLine(logPath, '\nPre-check matview snapshots…');
    await assertSnapshotsHealthy(client, logPath);

    const before = await client.query<{ db_size: string }>(
      `SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`
    );
    logLine(logPath, `\nDB before: ${before.rows[0]?.db_size}`);

    for (const qualified of DAILY_FACT_TABLES) {
      const [schema, table] = qualified.split('.') as [string, string];
      if (!(await tableExists(client, schema, table))) {
        logLine(logPath, `  skip ${qualified} (table missing)`);
        continue;
      }
      const beforeCount = await countExact(client, schema, table);
      const beforeSize = await relationSizePretty(client, schema, table);
      logLine(
        logPath,
        `  TRUNCATE ${qualified} (${beforeCount.toLocaleString()} rows, ${beforeSize})…`
      );
      await client.query(`TRUNCATE TABLE ${quoteIdent(schema)}.${quoteIdent(table)}`);
      logLine(logPath, `  ✓ ${qualified} truncated`);
    }

    const after = await client.query<{ db_size: string }>(
      `SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`
    );
    logLine(logPath, `\nDB after truncate (may lag until VACUUM): ${after.rows[0]?.db_size}`);
    logLine(logPath, 'Matview snapshots and dimension tables were not modified.');
    logLine(logPath, `\n=== finished ${new Date().toISOString()} ===`);
  } finally {
    client.release();
    await closeSupabaseDirectPool();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
