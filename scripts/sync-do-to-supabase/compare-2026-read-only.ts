#!/usr/bin/env npx tsx
/**
 * Read-only: compare DigitalOcean campings (2026 focus) vs Supabase.
 * Fast path for large tables: freshness lag + rows newer than SB max.
 *
 * Usage: npx tsx scripts/sync-do-to-supabase/compare-2026-read-only.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import {
  queryDigitalOceanReadOnly,
  closeDigitalOceanPools,
} from '../../lib/digitalocean-readonly-db';
import {
  getSupabaseDirectPool,
  closeSupabaseDirectPool,
} from '../../lib/supabase-direct-db';
import type { PoolClient } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const YEAR_START = '2026-01-01';
const SCHEMAS = ['hipcamp', 'campspot', 'bookoutdoors'] as const;
/** Full scans of these are too slow; use freshness + lag counts instead. */
const LARGE = new Set(['sites', 'propertys']);
const OUT = resolve(
  process.cwd(),
  'scripts/sync-do-to-supabase/discovery/compare-2026-do-vs-supabase.json'
);

type M = Record<string, unknown>;

async function main() {
  const pool = getSupabaseDirectPool();
  const client: PoolClient = await pool.connect();

  try {
    await client.query('SET statement_timeout = 0');
    await client.query('SET idle_in_transaction_session_timeout = 0');

    let watermarks: M[] = [];
    try {
      const { rows } = await client.query(`SELECT * FROM public.do_sync_watermarks`);
      watermarks = rows;
      console.error(`watermarks: ${rows.length}`);
    } catch (e) {
      console.error('watermarks query failed', e);
    }

    const { rows: recentRuns } = await client.query(
      `SELECT id, started_at, finished_at, status, options, error_message
       FROM public.do_sync_runs
       ORDER BY started_at DESC
       LIMIT 8`
    );

    const results: M[] = [];

    for (const schema of SCHEMAS) {
      const { rows: doTables } = await queryDigitalOceanReadOnly<{
        table_name: string;
      }>(
        'campings',
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema=$1 AND table_type='BASE TABLE'
         ORDER BY table_name`,
        [schema]
      );
      const { rows: sbTablesRows } = await client.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema=$1 AND table_type='BASE TABLE'`,
        [schema]
      );
      const sbTables = new Set(sbTablesRows.map((r) => r.table_name));

      for (const { table_name: table } of doTables) {
        const { rows: doColRows } = await queryDigitalOceanReadOnly<{
          column_name: string;
        }>(
          'campings',
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema=$1 AND table_name=$2`,
          [schema, table]
        );
        const doCols = new Set(doColRows.map((r) => r.column_name));
        const hasCreated = doCols.has('created_at');
        const hasUpdated = doCols.has('updated_at');
        const inSb = sbTables.has(table);
        const isLarge = LARGE.has(table);
        const m: M = { schema, table, inSb, hasCreated, hasUpdated, isLarge };

        const { rows: doApprox } = await queryDigitalOceanReadOnly<{
          approx: string;
        }>(
          'campings',
          `SELECT c.reltuples::bigint::text AS approx
           FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind='r'`,
          [schema, table]
        );
        m.doApprox = Number(doApprox[0]?.approx ?? 0);

        if (!isLarge) {
          const { rows } = await queryDigitalOceanReadOnly<{ c: string }>(
            'campings',
            `SELECT count(*)::text AS c FROM ${schema}.${table}`
          );
          m.doTotal = Number(rows[0].c);
          m.doTotalExact = true;
        } else {
          // Prefer exact DO count from known recent audit when available via estimate
          m.doTotal = m.doApprox;
          m.doTotalExact = false;
        }

        if (inSb) {
          const { rows: sbApprox } = await client.query<{ approx: string }>(
            `SELECT c.reltuples::bigint::text AS approx
             FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind='r'`,
            [schema, table]
          );
          m.sbApprox = Number(sbApprox[0]?.approx ?? 0);

          if (!isLarge) {
            const { rows } = await client.query<{ c: string }>(
              `SELECT count(*)::text AS c FROM ${schema}.${table}`
            );
            m.sbTotal = Number(rows[0].c);
            m.sbTotalExact = true;
          } else {
            // Known capped mirrors — exact count is fine on smaller SB side
            try {
              const { rows } = await client.query<{ c: string }>(
                `SELECT count(*)::text AS c FROM ${schema}.${table}`
              );
              m.sbTotal = Number(rows[0].c);
              m.sbTotalExact = true;
            } catch (e) {
              m.sbTotal = m.sbApprox;
              m.sbTotalExact = false;
              m.sbTotalError = e instanceof Error ? e.message : String(e);
            }
          }
          m.totalGap = (m.doTotal as number) - (m.sbTotal as number);
        } else {
          m.sbTotal = null;
          m.totalGap = m.doTotal;
        }

        if (hasUpdated) {
          const { rows: doMx } = await queryDigitalOceanReadOnly<{
            mn: string | null;
            mx: string | null;
          }>(
            'campings',
            `SELECT min(updated_at)::text AS mn, max(updated_at)::text AS mx
             FROM ${schema}.${table}`
          );
          m.doMinUpdated = doMx[0]?.mn ?? null;
          m.doMaxUpdated = doMx[0]?.mx ?? null;

          if (inSb) {
            const { rows: sbMx } = await client.query<{
              mn: string | null;
              mx: string | null;
            }>(
              `SELECT min(updated_at)::text AS mn, max(updated_at)::text AS mx
               FROM ${schema}.${table}`
            );
            m.sbMinUpdated = sbMx[0]?.mn ?? null;
            m.sbMaxUpdated = sbMx[0]?.mx ?? null;

            // Rows in DO newer than what Supabase has — definite missing/stale set
            if (m.sbMaxUpdated) {
              const { rows: lag } = await queryDigitalOceanReadOnly<{ c: string }>(
                'campings',
                `SELECT count(*)::text AS c FROM ${schema}.${table}
                 WHERE updated_at > $1::timestamptz`,
                [m.sbMaxUpdated]
              );
              m.doRowsNewerThanSbMax = Number(lag[0].c);
            } else {
              m.doRowsNewerThanSbMax = m.doTotal;
            }
          } else {
            m.doRowsNewerThanSbMax = m.doTotal;
          }

          if (!isLarge) {
            const { rows: doU } = await queryDigitalOceanReadOnly<{ c: string }>(
              'campings',
              `SELECT count(*)::text AS c FROM ${schema}.${table}
               WHERE updated_at >= $1`,
              [YEAR_START]
            );
            m.doUpdated2026 = Number(doU[0].c);
            if (inSb) {
              const { rows: sbU } = await client.query<{ c: string }>(
                `SELECT count(*)::text AS c FROM ${schema}.${table}
                 WHERE updated_at >= $1`,
                [YEAR_START]
              );
              m.sbUpdated2026 = Number(sbU[0].c);
              m.updatedGap =
                (m.doUpdated2026 as number) - (m.sbUpdated2026 as number);
            } else {
              m.sbUpdated2026 = 0;
              m.updatedGap = m.doUpdated2026;
            }
          } else {
            // Large: 2026 volume via index-friendly count on DO only + SB if small enough
            console.error(`  counting 2026 updated_at for ${schema}.${table} (DO)…`);
            const { rows: doU } = await queryDigitalOceanReadOnly<{ c: string }>(
              'campings',
              `SELECT count(*)::text AS c FROM ${schema}.${table}
               WHERE updated_at >= $1`,
              [YEAR_START]
            );
            m.doUpdated2026 = Number(doU[0].c);
            console.error(`  DO 2026 updated=${m.doUpdated2026}`);

            if (inSb) {
              console.error(`  counting 2026 updated_at for ${schema}.${table} (SB)…`);
              const { rows: sbU } = await client.query<{ c: string }>(
                `SELECT count(*)::text AS c FROM ${schema}.${table}
                 WHERE updated_at >= $1`,
                [YEAR_START]
              );
              m.sbUpdated2026 = Number(sbU[0].c);
              m.updatedGap =
                (m.doUpdated2026 as number) - (m.sbUpdated2026 as number);
              console.error(`  SB 2026 updated=${m.sbUpdated2026}`);
            } else {
              m.sbUpdated2026 = 0;
              m.updatedGap = m.doUpdated2026;
            }
          }
        }

        if (hasCreated && !isLarge) {
          const { rows: doC } = await queryDigitalOceanReadOnly<{
            c: string;
            mx: string | null;
          }>(
            'campings',
            `SELECT count(*)::text AS c, max(created_at)::text AS mx
             FROM ${schema}.${table} WHERE created_at >= $1`,
            [YEAR_START]
          );
          m.doCreated2026 = Number(doC[0].c);
          m.doMaxCreated2026 = doC[0].mx;
          if (inSb) {
            const { rows: sbC } = await client.query<{
              c: string;
              mx: string | null;
            }>(
              `SELECT count(*)::text AS c, max(created_at)::text AS mx
               FROM ${schema}.${table} WHERE created_at >= $1`,
              [YEAR_START]
            );
            m.sbCreated2026 = Number(sbC[0].c);
            m.sbMaxCreated2026 = sbC[0].mx;
            m.createdGap =
              (m.doCreated2026 as number) - (m.sbCreated2026 as number);
          } else {
            m.sbCreated2026 = 0;
            m.createdGap = m.doCreated2026;
          }
        }

        // Status classification
        let status = 'in_sync';
        if (!inSb) status = 'missing_table';
        else if ((m.sbTotal as number) === 0 && (m.doTotal as number) > 0)
          status = 'empty_in_supabase';
        else if (
          (typeof m.updatedGap === 'number' && m.updatedGap > 0) ||
          (typeof m.totalGap === 'number' && m.totalGap > 100) ||
          (typeof m.doRowsNewerThanSbMax === 'number' &&
            m.doRowsNewerThanSbMax > 0)
        ) {
          status = 'behind';
        } else if (
          typeof m.totalGap === 'number' &&
          m.totalGap < -10
        ) {
          status = 'supabase_ahead';
        }
        m.status = status;

        results.push(m);
        console.error(
          `${schema}.${table} [${status}] do=${m.doTotal} sb=${m.sbTotal} u26do=${m.doUpdated2026 ?? '-'} u26sb=${m.sbUpdated2026 ?? '-'} newerThanSb=${m.doRowsNewerThanSbMax ?? '-'} gap=${m.updatedGap ?? m.totalGap}`
        );
      }
    }

    const { rows: legacySchemas } = await client.query<{ nspname: string }>(
      `SELECT nspname FROM pg_namespace
       WHERE nspname IN ('hipcamp_public','campspot_public')`
    );

    const payload = {
      generatedAt: new Date().toISOString(),
      yearStart: YEAR_START,
      host: '146.190.212.63',
      user: 'rou',
      sourceDatabase: 'campings',
      note: 'Read-only. Large tables use pg_class estimates for DO totals; 2026 updated_at counts and freshness lag are exact.',
      results,
      watermarks,
      recentRuns,
      legacySchemasInSupabase: legacySchemas.map((r) => r.nspname),
    };

    writeFileSync(OUT, JSON.stringify(payload, null, 2));
    console.error(`wrote ${OUT}`);
    console.log(JSON.stringify({ ok: true, tables: results.length, out: OUT }));
  } finally {
    client.release();
    await closeDigitalOceanPools();
    await closeSupabaseDirectPool();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
