#!/usr/bin/env npx tsx
/**
 * Condense legacy daily scrape archives → one fullest scrape per calendar month.
 *
 * Builds hipcamp_public_monthly / campspot_public_monthly from *_public, verifies
 * row counts, and optionally drops daily big tables after explicit sign-off.
 *
 * Usage:
 *   npm run sync:do:legacy-monthly
 *   npm run sync:do:legacy-monthly -- --schema=hipcamp
 *   CONFIRM_LEGACY_MONTHLY_DROP=1 npm run sync:do:legacy-monthly -- --drop-daily-big
 *
 * Default = build + verify only (idempotent). Drop requires both --drop-daily-big
 * and CONFIRM_LEGACY_MONTHLY_DROP=1.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, appendFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import type { PoolClient } from 'pg';
import { closeSupabaseDirectPool, getSupabaseDirectPool } from '../../lib/supabase-direct-db';
import { pickBestScrapePerMonth, type ScrapeDayCounts } from './legacy-month-picks';

config({ path: resolve(process.cwd(), '.env.local') });

type LegacyBrand = 'hipcamp' | 'campspot';

const BIG_TABLES = ['sites', 'average', 'listings'] as const;
const SMALL_TABLES_BOTH = ['average_general'] as const;
const SMALL_TABLES_CAMPSPOT = ['year_prices'] as const;

type CliOpts = {
  schemas: LegacyBrand[];
  dropDailyBig: boolean;
};

function parseCli(argv: string[]): CliOpts {
  let schemaArg = 'both';
  let dropDailyBig = false;
  for (const arg of argv) {
    if (arg === '--drop-daily-big') dropDailyBig = true;
    else if (arg.startsWith('--schema=')) schemaArg = arg.slice('--schema='.length);
  }
  let schemas: LegacyBrand[];
  switch (schemaArg) {
    case 'hipcamp':
      schemas = ['hipcamp'];
      break;
    case 'campspot':
      schemas = ['campspot'];
      break;
    case 'both':
      schemas = ['hipcamp', 'campspot'];
      break;
    default:
      throw new Error(`Invalid --schema=${schemaArg}; use hipcamp|campspot|both`);
  }
  return { schemas, dropDailyBig };
}

function sourceSchema(brand: LegacyBrand): string {
  return brand === 'hipcamp' ? 'hipcamp_public' : 'campspot_public';
}

function monthlySchema(brand: LegacyBrand): string {
  return brand === 'hipcamp' ? 'hipcamp_public_monthly' : 'campspot_public_monthly';
}

function logLine(logPath: string, line: string): void {
  console.log(line);
  appendFileSync(logPath, `${line}\n`);
}

async function q<T extends Record<string, unknown>>(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await client.query<T>(sql, params);
  return res.rows;
}

async function exec(client: PoolClient, sql: string): Promise<void> {
  await client.query(sql);
}

async function tableExists(
  client: PoolClient,
  schema: string,
  table: string
): Promise<boolean> {
  const rows = await q<{ exists: boolean }>(
    client,
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schema, table]
  );
  return Boolean(rows[0]?.exists);
}

async function relationSizePretty(
  client: PoolClient,
  schema: string,
  table: string
): Promise<string> {
  const rows = await q<{ size: string }>(
    client,
    `SELECT pg_size_pretty(pg_total_relation_size(format('%I.%I', $1::text, $2::text)::regclass)) AS size`,
    [schema, table]
  );
  return rows[0]?.size ?? '?';
}

async function countExact(client: PoolClient, schema: string, table: string): Promise<number> {
  const rows = await q<{ n: string }>(
    client,
    `SELECT COUNT(*)::text AS n FROM ${quoteIdent(schema)}.${quoteIdent(table)}`
  );
  return Number(rows[0]?.n ?? 0);
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

async function loadScrapeDayCounts(
  client: PoolClient,
  source: string
): Promise<ScrapeDayCounts[]> {
  const rows = await q<{
    id: number;
    ym: string;
    scrape_date: Date;
    sites_n: string;
    average_n: string;
    listings_n: string;
  }>(
    client,
    `
    WITH parsed AS (
      SELECT
        d.id,
        to_date(d.date_of_updates, 'MM.DD.YYYY') AS scrape_date,
        to_char(to_date(d.date_of_updates, 'MM.DD.YYYY'), 'YYYY-MM') AS ym
      FROM ${quoteIdent(source)}.dates d
      WHERE d.date_of_updates ~ '^[0-9]{2}\\.[0-9]{2}\\.[0-9]{4}$'
    ),
    sites_c AS (
      SELECT date_update_id, COUNT(*)::bigint AS n
      FROM ${quoteIdent(source)}.sites
      GROUP BY date_update_id
    ),
    avg_c AS (
      SELECT date_update_id, COUNT(*)::bigint AS n
      FROM ${quoteIdent(source)}.average
      GROUP BY date_update_id
    ),
    list_c AS (
      SELECT date_update_id, COUNT(*)::bigint AS n
      FROM ${quoteIdent(source)}.listings
      GROUP BY date_update_id
    )
    SELECT
      p.id,
      p.ym,
      p.scrape_date,
      COALESCE(s.n, 0)::text AS sites_n,
      COALESCE(a.n, 0)::text AS average_n,
      COALESCE(l.n, 0)::text AS listings_n
    FROM parsed p
    LEFT JOIN sites_c s ON s.date_update_id = p.id
    LEFT JOIN avg_c a ON a.date_update_id = p.id
    LEFT JOIN list_c l ON l.date_update_id = p.id
    ORDER BY p.id
    `
  );

  return rows.map((r) => ({
    id: Number(r.id),
    ym: r.ym,
    scrapeDate: new Date(r.scrape_date),
    sitesN: Number(r.sites_n),
    averageN: Number(r.average_n),
    listingsN: Number(r.listings_n),
  }));
}

async function buildMonthPicks(
  client: PoolClient,
  brand: LegacyBrand,
  logPath: string
): Promise<ReturnType<typeof pickBestScrapePerMonth>> {
  const source = sourceSchema(brand);
  const monthly = monthlySchema(brand);
  logLine(logPath, `\n=== ${brand}: build month_picks (${source} → ${monthly}) ===`);

  await exec(client, `CREATE SCHEMA IF NOT EXISTS ${quoteIdent(monthly)}`);

  const days = await loadScrapeDayCounts(client, source);
  const picks = pickBestScrapePerMonth(days);
  logLine(logPath, `  scrape days: ${days.length}; months picked: ${picks.length}`);

  await exec(client, `DROP TABLE IF EXISTS ${quoteIdent(monthly)}.month_picks CASCADE`);
  await exec(
    client,
    `
    CREATE TABLE ${quoteIdent(monthly)}.month_picks (
      ym text PRIMARY KEY,
      date_update_id integer NOT NULL,
      scrape_date date NOT NULL,
      sites_n bigint NOT NULL,
      average_n bigint NOT NULL,
      listings_n bigint NOT NULL,
      score bigint NOT NULL
    )
    `
  );

  for (const p of picks) {
    await client.query(
      `INSERT INTO ${quoteIdent(monthly)}.month_picks
         (ym, date_update_id, scrape_date, sites_n, average_n, listings_n, score)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7)`,
      [
        p.ym,
        p.dateUpdateId,
        p.scrapeDate.toISOString().slice(0, 10),
        p.sitesN,
        p.averageN,
        p.listingsN,
        p.score,
      ]
    );
  }

  for (const p of picks) {
    logLine(
      logPath,
      `  ${p.ym} → date_update_id=${p.dateUpdateId} (${p.scrapeDate.toISOString().slice(0, 10)}) ` +
        `sites=${p.sitesN} avg=${p.averageN} listings=${p.listingsN}`
    );
  }

  return picks;
}

async function copyFilteredBigTable(
  client: PoolClient,
  brand: LegacyBrand,
  table: (typeof BIG_TABLES)[number],
  logPath: string
): Promise<void> {
  const source = sourceSchema(brand);
  const monthly = monthlySchema(brand);
  const started = Date.now();
  logLine(logPath, `  CTAS ${monthly}.${table} from ${source}.${table}…`);

  await exec(client, `DROP TABLE IF EXISTS ${quoteIdent(monthly)}.${quoteIdent(table)} CASCADE`);
  await exec(
    client,
    `
    CREATE TABLE ${quoteIdent(monthly)}.${quoteIdent(table)} AS
    SELECT s.*
    FROM ${quoteIdent(source)}.${quoteIdent(table)} s
    WHERE s.date_update_id IN (
      SELECT date_update_id FROM ${quoteIdent(monthly)}.month_picks
    )
    `
  );
  await exec(
    client,
    `CREATE INDEX IF NOT EXISTS ${quoteIdent(`${table}_date_update_id_idx`)}
     ON ${quoteIdent(monthly)}.${quoteIdent(table)} (date_update_id)`
  );
  if (table === 'sites' || table === 'average') {
    await exec(
      client,
      `CREATE INDEX IF NOT EXISTS ${quoteIdent(`${table}_url_idx`)}
       ON ${quoteIdent(monthly)}.${quoteIdent(table)} (url)`
    );
  }

  const n = await countExact(client, monthly, table);
  const size = await relationSizePretty(client, monthly, table);
  const sec = Math.round((Date.now() - started) / 1000);
  logLine(logPath, `  ✓ ${monthly}.${table}: ${n.toLocaleString()} rows, ${size} in ${sec}s`);
}

async function copyDates(
  client: PoolClient,
  brand: LegacyBrand,
  logPath: string
): Promise<void> {
  const source = sourceSchema(brand);
  const monthly = monthlySchema(brand);
  await exec(client, `DROP TABLE IF EXISTS ${quoteIdent(monthly)}.dates CASCADE`);
  await exec(
    client,
    `
    CREATE TABLE ${quoteIdent(monthly)}.dates AS
    SELECT d.*
    FROM ${quoteIdent(source)}.dates d
    WHERE d.id IN (SELECT date_update_id FROM ${quoteIdent(monthly)}.month_picks)
    `
  );
  const n = await countExact(client, monthly, 'dates');
  logLine(logPath, `  ✓ ${monthly}.dates: ${n} rows`);
}

async function copySmallTable(
  client: PoolClient,
  brand: LegacyBrand,
  table: string,
  logPath: string
): Promise<void> {
  const source = sourceSchema(brand);
  const monthly = monthlySchema(brand);
  if (!(await tableExists(client, source, table))) {
    logLine(logPath, `  skip ${table} (not in ${source})`);
    return;
  }
  await exec(client, `DROP TABLE IF EXISTS ${quoteIdent(monthly)}.${quoteIdent(table)} CASCADE`);
  await exec(
    client,
    `
    CREATE TABLE ${quoteIdent(monthly)}.${quoteIdent(table)} AS
    SELECT * FROM ${quoteIdent(source)}.${quoteIdent(table)}
    `
  );
  const n = await countExact(client, monthly, table);
  logLine(logPath, `  ✓ ${monthly}.${table}: ${n.toLocaleString()} rows (full copy)`);
}

async function enableRlsOnMonthlySchema(
  client: PoolClient,
  brand: LegacyBrand,
  logPath: string
): Promise<void> {
  const monthly = monthlySchema(brand);
  const tables = await q<{ table_name: string }>(
    client,
    `
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = $1
    ORDER BY c.relname
    `,
    [monthly]
  );
  for (const { table_name } of tables) {
    await exec(
      client,
      `ALTER TABLE ${quoteIdent(monthly)}.${quoteIdent(table_name)} ENABLE ROW LEVEL SECURITY`
    );
    await exec(
      client,
      `DROP POLICY IF EXISTS "Allow authenticated read" ON ${quoteIdent(monthly)}.${quoteIdent(table_name)}`
    );
    await exec(
      client,
      `CREATE POLICY "Allow authenticated read" ON ${quoteIdent(monthly)}.${quoteIdent(
        table_name
      )} FOR SELECT TO authenticated USING (true)`
    );
  }
  logLine(logPath, `  ✓ RLS enabled on ${monthly} (${tables.length} tables)`);
}

async function verifyBrand(
  client: PoolClient,
  brand: LegacyBrand,
  picks: ReturnType<typeof pickBestScrapePerMonth>,
  logPath: string
): Promise<void> {
  const source = sourceSchema(brand);
  const monthly = monthlySchema(brand);
  logLine(logPath, `\n=== ${brand}: verify ===`);

  const pickCount = await countExact(client, monthly, 'month_picks');
  if (pickCount !== picks.length) {
    throw new Error(`${monthly}.month_picks count ${pickCount} != expected ${picks.length}`);
  }
  if (pickCount < 1) {
    throw new Error(`${monthly}.month_picks is empty`);
  }
  logLine(logPath, `  month_picks: ${pickCount} months`);

  const datesCount = await countExact(client, monthly, 'dates');
  if (datesCount !== pickCount) {
    throw new Error(`${monthly}.dates count ${datesCount} != month_picks ${pickCount}`);
  }

  const missingDates = await q<{ date_update_id: number }>(
    client,
    `
    SELECT mp.date_update_id
    FROM ${quoteIdent(monthly)}.month_picks mp
    LEFT JOIN ${quoteIdent(monthly)}.dates d ON d.id = mp.date_update_id
    WHERE d.id IS NULL
    `
  );
  if (missingDates.length > 0) {
    throw new Error(
      `${monthly}: month_picks ids missing from dates: ${missingDates
        .map((r) => r.date_update_id)
        .join(',')}`
    );
  }

  for (const table of BIG_TABLES) {
    const expected = picks.reduce((sum, p) => {
      if (table === 'sites') return sum + p.sitesN;
      if (table === 'average') return sum + p.averageN;
      return sum + p.listingsN;
    }, 0);
    const actual = await countExact(client, monthly, table);
    if (actual !== expected) {
      throw new Error(
        `${monthly}.${table}: count ${actual} != expected ${expected} (sum of picked scrapes)`
      );
    }
    const srcSize = await relationSizePretty(client, source, table);
    const dstSize = await relationSizePretty(client, monthly, table);
    logLine(
      logPath,
      `  ✓ ${table}: ${actual.toLocaleString()} rows (source size ${srcSize} → monthly ${dstSize})`
    );
  }

  logLine(logPath, `  ✓ ${brand} verification passed`);
}

async function dropDailyBigTables(
  client: PoolClient,
  brands: LegacyBrand[],
  logPath: string
): Promise<void> {
  if (process.env.CONFIRM_LEGACY_MONTHLY_DROP !== '1') {
    throw new Error(
      'Refusing drop: set CONFIRM_LEGACY_MONTHLY_DROP=1 together with --drop-daily-big'
    );
  }

  logLine(logPath, `\n=== DROP daily big tables (confirmed) ===`);
  for (const brand of brands) {
    const source = sourceSchema(brand);
    // Verify monthly exists and has rows before dropping daily.
    const monthly = monthlySchema(brand);
    const sitesN = await countExact(client, monthly, 'sites');
    if (sitesN < 1) {
      throw new Error(`Refuse drop: ${monthly}.sites is empty`);
    }
    logLine(logPath, `  DROP ${source}.sites, average, listings…`);
    await exec(
      client,
      `DROP TABLE IF EXISTS
         ${quoteIdent(source)}.sites,
         ${quoteIdent(source)}.average,
         ${quoteIdent(source)}.listings`
    );
    logLine(logPath, `  ✓ dropped big tables in ${source}`);
  }
  logLine(
    logPath,
    '  Note: run VACUUM (or wait for autovacuum) so Supabase disk usage reflects reclaim.'
  );
}

async function condenseBrand(
  client: PoolClient,
  brand: LegacyBrand,
  logPath: string
): Promise<void> {
  const source = sourceSchema(brand);
  for (const table of BIG_TABLES) {
    if (!(await tableExists(client, source, table))) {
      throw new Error(`Missing required table ${source}.${table}`);
    }
  }

  const picks = await buildMonthPicks(client, brand, logPath);

  logLine(logPath, `\n=== ${brand}: create monthly tables ===`);
  await copyDates(client, brand, logPath);
  for (const table of BIG_TABLES) {
    await copyFilteredBigTable(client, brand, table, logPath);
  }
  for (const table of SMALL_TABLES_BOTH) {
    await copySmallTable(client, brand, table, logPath);
  }
  if (brand === 'campspot') {
    for (const table of SMALL_TABLES_CAMPSPOT) {
      await copySmallTable(client, brand, table, logPath);
    }
  }

  await enableRlsOnMonthlySchema(client, brand, logPath);
  await verifyBrand(client, brand, picks, logPath);
}

async function main(): Promise<void> {
  const opts = parseCli(process.argv.slice(2));
  const logDir = resolve(homedir(), 'Library/Logs/sage-do-sync');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = resolve(logDir, `legacy-monthly-${ts}.log`);

  logLine(logPath, `=== Legacy monthly condense (${ts}) ===`);
  logLine(logPath, `Schemas: ${opts.schemas.join(', ')}`);
  logLine(logPath, `Drop daily big: ${opts.dropDailyBig}`);
  logLine(logPath, `Log: ${logPath}`);

  const pool = getSupabaseDirectPool();
  const client = await pool.connect();
  try {
    await exec(client, 'SET statement_timeout TO 0');
    await exec(client, 'SET idle_in_transaction_session_timeout TO 0');

    for (const brand of opts.schemas) {
      await condenseBrand(client, brand, logPath);
    }

    if (opts.dropDailyBig) {
      await dropDailyBigTables(client, opts.schemas, logPath);
    } else {
      logLine(
        logPath,
        `\nDaily big tables retained. To drop after sign-off:\n` +
          `  CONFIRM_LEGACY_MONTHLY_DROP=1 npm run sync:do:legacy-monthly -- --drop-daily-big`
      );
    }

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
