#!/usr/bin/env npx tsx
/**
 * Bulk stream COPY from DigitalOcean legacy DBs → Supabase hipcamp_public / campspot_public.
 *
 * Usage:
 *   npx tsx scripts/sync-do-to-supabase/legacy-bulk-copy.ts hipcamp sites
 *   npx tsx scripts/sync-do-to-supabase/legacy-bulk-copy.ts campspot all
 *   npm run sync:do:legacy-bulk -- hipcamp all
 *
 * Prerequisites: run `npm run sync:do:legacy-schema` first (creates empty tables).
 * Must run from a DO Trusted Sources allowlisted IP.
 * SUPABASE_DB_URL must be the direct Postgres URL (port 5432), not the pooler.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, appendFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { shouldSkipLegacyTable } from './table-sync-config';

config({ path: resolve(process.cwd(), '.env.local') });

const XLARGE_ORDER = ['listings', 'average', 'sites'] as const;

type LegacyDb = 'hipcamp' | 'campspot';

function targetSchema(db: LegacyDb): string {
  return db === 'hipcamp' ? 'hipcamp_public' : 'campspot_public';
}

function doConnUri(database: LegacyDb): string {
  const host =
    process.env.DIGITALOCEAN_DB_HOST ||
    process.env.LEGACY_CAMPING_DB_HOST ||
    '146.190.212.63';
  const port = process.env.DIGITALOCEAN_DB_PORT || process.env.LEGACY_CAMPING_DB_PORT || '5432';
  const user = process.env.DIGITALOCEAN_DB_USER || process.env.LEGACY_CAMPING_DB_USER || 'rou';
  const password =
    process.env.DIGITALOCEAN_DB_PASSWORD || process.env.LEGACY_CAMPING_DB_PASSWORD || '';
  if (!password) throw new Error('DIGITALOCEAN_DB_PASSWORD is required');
  const enc = encodeURIComponent(password);
  return `postgresql://${user}:${enc}@${host}:${port}/${database}?sslmode=require`;
}

function supabaseUrl(): string {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL is required');
  if (/:6543\b/.test(url) || /pooler\.supabase/.test(url)) {
    console.warn(
      'WARNING: SUPABASE_DB_URL looks like the transaction pooler. Prefer direct :5432 for bulk COPY.'
    );
  }
  return url;
}

function logLine(logPath: string, line: string): void {
  console.log(line);
  appendFileSync(logPath, `${line}\n`);
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (buf) => {
      stderr += buf.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(0);
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

function pipeCopy(
  doUri: string,
  sbUrl: string,
  sourceTable: string,
  destQualified: string,
  env: NodeJS.ProcessEnv
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const src = spawn(
      'psql',
      [doUri, '-v', 'ON_ERROR_STOP=1', '-c', `\\COPY public.${sourceTable} TO STDOUT`],
      { env, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    // Dest: disable timeouts in-session. Do NOT run SET on the source — psql prints
    // "SET" to stdout and that would corrupt COPY TO STDOUT.
    const dest = spawn(
      'psql',
      [
        sbUrl,
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        'SET statement_timeout TO 0',
        '-c',
        'SET idle_in_transaction_session_timeout TO 0',
        '-c',
        `\\COPY ${destQualified} FROM STDIN`,
      ],
      { env, stdio: ['pipe', 'ignore', 'pipe'] }
    );

    let srcErr = '';
    let destErr = '';
    src.stderr.on('data', (b) => {
      srcErr += b.toString();
    });
    dest.stderr.on('data', (b) => {
      destErr += b.toString();
    });

    src.stdout.pipe(dest.stdin);

    src.on('error', reject);
    dest.on('error', reject);

    let srcCode: number | null = null;
    let destCode: number | null = null;

    const maybeDone = () => {
      if (srcCode === null || destCode === null) return;
      if (srcCode === 0 && destCode === 0) {
        resolvePromise();
        return;
      }
      reject(
        new Error(
          `COPY failed src=${srcCode} dest=${destCode}\nsrc: ${srcErr.slice(-1500)}\ndest: ${destErr.slice(-1500)}`
        )
      );
    };

    src.on('close', (code) => {
      srcCode = code ?? 1;
      if (srcCode !== 0) {
        try {
          dest.stdin.end();
        } catch {
          /* ignore */
        }
        dest.kill();
      }
      maybeDone();
    });
    dest.on('close', (code) => {
      destCode = code ?? 1;
      maybeDone();
    });
  });
}

async function countRows(sbUrl: string, qualified: string, env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      'psql',
      [
        sbUrl,
        '-At',
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        'SET statement_timeout TO 0',
        '-c',
        `SELECT COUNT(*)::text FROM ${qualified};`,
      ],
      { env, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (b) => {
      out += b.toString();
    });
    child.stderr.on('data', (b) => {
      err += b.toString();
    });
    child.on('close', (code) => {
      // Multiple -c: SET prints "SET\n" then the count — take the last non-empty line.
      const lines = out
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && l !== 'SET');
      if (code === 0 && lines.length > 0) resolvePromise(lines[lines.length - 1]!);
      else reject(new Error(`count failed: ${err || out}`));
    });
  });
}

async function copyTable(
  database: LegacyDb,
  table: string,
  logPath: string,
  env: NodeJS.ProcessEnv
): Promise<void> {
  const schema = targetSchema(database);
  const dest = `${schema}.${table}`;
  const doUri = doConnUri(database);
  const sbUrl = supabaseUrl();
  const started = Date.now();

  logLine(logPath, `\n--- COPY public.${table} → ${dest} ---`);

  await run(
    'psql',
    [
      sbUrl,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      'SET statement_timeout TO 0',
      '-c',
      `TRUNCATE TABLE ${dest};`,
    ],
    env
  );
  await pipeCopy(doUri, sbUrl, table, dest, env);

  // Prefer exact COUNT (timeout disabled). On failure, log MIN/MAX(id) so a
  // successful COPY is never reported as failed due to a slow count.
  let summary: string;
  try {
    summary = `${await countRows(sbUrl, dest, env)} rows`;
  } catch (err) {
    const range = await new Promise<string>((resolvePromise, reject) => {
      const child = spawn(
        'psql',
        [
          sbUrl,
          '-At',
          '-c',
          'SET statement_timeout TO 0',
          '-c',
          `SELECT COALESCE(MIN(id)::text, '?') || '..' || COALESCE(MAX(id)::text, '?') FROM ${dest};`,
        ],
        { env, stdio: ['ignore', 'pipe', 'pipe'] }
      );
      let out = '';
      let e = '';
      child.stdout.on('data', (b) => {
        out += b.toString();
      });
      child.stderr.on('data', (b) => {
        e += b.toString();
      });
      child.on('close', (code) => {
        const lines = out
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && l !== 'SET');
        if (code === 0 && lines.length > 0) resolvePromise(lines[lines.length - 1]!);
        else reject(new Error(e || out));
      });
    });
    summary = `copied (id range ${range}; count timed out: ${
      err instanceof Error ? err.message : String(err)
    })`;
  }

  const sec = Math.round((Date.now() - started) / 1000);
  logLine(logPath, `✓ ${dest}: ${summary} in ${sec}s`);
}

async function main(): Promise<void> {
  const database = process.argv[2] as LegacyDb | undefined;
  const tableArg = process.argv[3];

  if (!database || !tableArg || !['hipcamp', 'campspot'].includes(database)) {
    console.error('Usage: legacy-bulk-copy.ts <hipcamp|campspot> <table|all>');
    process.exit(1);
  }

  const tables =
    tableArg === 'all' ? [...XLARGE_ORDER] : tableArg.split(',').map((t) => t.trim());

  const logDir = resolve(homedir(), 'Library/Logs/sage-do-sync');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = resolve(logDir, `legacy-bulk-${database}-${ts}.log`);

  const env = { ...process.env, PGSSLMODE: process.env.PGSSLMODE || 'require' };

  logLine(logPath, `=== Legacy bulk COPY ${database} → ${targetSchema(database)} (${ts}) ===`);
  logLine(logPath, `Log: ${logPath}`);

  for (const table of tables) {
    if (shouldSkipLegacyTable(table)) {
      logLine(logPath, `skip ${table} (exclude list)`);
      continue;
    }
    await copyTable(database, table, logPath, env);
  }

  logLine(logPath, `\n=== finished ${new Date().toISOString()} ===`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
