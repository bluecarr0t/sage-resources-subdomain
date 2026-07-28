#!/usr/bin/env npx tsx
/**
 * Phase 2: incremental upsert (read-only on DigitalOcean) → Supabase normalized schemas.
 *
 * NEVER writes to DigitalOcean.
 *
 * Usage:
 *   npm run sync:do                              # weekly: campings dims only (skips sites/propertys)
 *   npm run sync:do -- --include-large           # also sync large fact tables (emergency)
 *   npm run sync:do -- --full                    # ignore watermarks (full scan + upsert)
 *   npm run sync:do -- --replace-snapshots       # truncate+reload old_data_table
 *   npm run sync:do -- --no-large                # explicit skip (default already)
 *   npm run sync:do -- --tables=propertydetails
 *   npm run sync:do -- --dry-run
 *   npm run sync:do -- --continue-on-error
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { closeDigitalOceanPools } from '../../lib/digitalocean-readonly-db';
import { closeSupabaseDirectPool, getSupabaseDirectPool } from '../../lib/supabase-direct-db';
import {
  DATABASE_SYNC_CONFIGS,
  qualifiedTable,
  resolveTargetSchema,
} from './config';
import { parseSyncCliArgs, type SyncCliOptions } from './cli-args';
import { fetchTableMetaFromDigitalOcean, listTablesInSchema, ensureTableInSupabase } from './schema-utils';
import { syncTableFromDigitalOcean, type SyncTableResult } from './sync-table';
import {
  getTableSyncMode,
  shouldSkipLargeTable,
  shouldSkipLegacyTable,
  sortTablesForSchema,
} from './table-sync-config';

config({ path: resolve(process.cwd(), '.env.local') });

type CliOptions = SyncCliOptions;

interface TableRunResult extends SyncTableResult {
  sourceKey: string;
  status: 'success' | 'skipped' | 'failed';
  error?: string;
}

function parseArgs(): CliOptions {
  return parseSyncCliArgs();
}

function tableMatchesFilter(
  filter: Set<string> | null,
  sourceSchema: string,
  table: string,
  targetSchema: string
): boolean {
  if (!filter) return true;
  return (
    filter.has(table) ||
    filter.has(`${sourceSchema}.${table}`) ||
    filter.has(`${targetSchema}.${table}`)
  );
}

async function ensureAuditTables(): Promise<void> {
  const pool = getSupabaseDirectPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.do_sync_watermarks (
      source_key TEXT PRIMARY KEY,
      last_synced_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01'::timestamptz
    );

    CREATE TABLE IF NOT EXISTS public.do_sync_runs (
      id BIGSERIAL PRIMARY KEY,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'running',
      options JSONB,
      results JSONB,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS do_sync_runs_started_at_idx
      ON public.do_sync_runs (started_at DESC);
  `);
}

async function getWatermark(sourceKey: string): Promise<Date | null> {
  const pool = getSupabaseDirectPool();
  const { rows } = await pool.query<{ last_synced_at: Date }>(
    `SELECT last_synced_at FROM public.do_sync_watermarks WHERE source_key = $1`,
    [sourceKey]
  );
  return rows[0]?.last_synced_at ?? null;
}

async function setWatermark(sourceKey: string, when: Date): Promise<void> {
  const pool = getSupabaseDirectPool();
  await pool.query(
    `
    INSERT INTO public.do_sync_watermarks (source_key, last_synced_at)
    VALUES ($1, $2)
    ON CONFLICT (source_key) DO UPDATE SET last_synced_at = EXCLUDED.last_synced_at
  `,
    [sourceKey, when.toISOString()]
  );
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const runStartedAt = new Date();

  console.log('=== DO → Supabase sync (Phase 2 incremental upsert) ===\n');
  if (opts.dryRun) console.log('DRY RUN — no Supabase writes\n');
  if (opts.includeLarge) console.log('Including large tables (sites, propertys)\n');
  else console.log('Skipping large tables (condensed default — pass --include-large to override)\n');
  if (opts.full) console.log('Full scan mode (ignoring watermarks)\n');

  await ensureAuditTables();

  const pool = getSupabaseDirectPool();
  const client = await pool.connect();

  const configs = DATABASE_SYNC_CONFIGS.filter((c) => opts.databases.has(c.database));
  console.log(`Databases: ${[...opts.databases].join(', ')}\n`);
  if (opts.schemaOnly) console.log('Schema-only — create tables, no row copy\n');

  let runId: number | null = null;
  if (!opts.dryRun) {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO public.do_sync_runs (status, options) VALUES ('running', $1::jsonb) RETURNING id`,
      [
        JSON.stringify({
          ...opts,
          phase: 2,
        }),
      ]
    );
    runId = rows[0]?.id ?? null;
  }

  const results: TableRunResult[] = [];
  let fatalError: Error | null = null;

  try {
    for (const dbConfig of configs) {
      console.log(`\n--- ${dbConfig.label} (${dbConfig.database}) ---`);

      for (const sourceSchema of dbConfig.sourceSchemas) {
        const targetSchema = resolveTargetSchema(dbConfig, sourceSchema);
        const tables = sortTablesForSchema(
          sourceSchema,
          await listTablesInSchema(dbConfig.database, sourceSchema)
        );

        for (const table of tables) {
          if (!tableMatchesFilter(opts.tables, sourceSchema, table, targetSchema)) {
            continue;
          }

          const sourceKey = `${dbConfig.database}.${sourceSchema}.${table}`;
          const targetKey = qualifiedTable(targetSchema, table);

          if (dbConfig.database !== 'campings' && shouldSkipLegacyTable(table)) {
            console.log(`  skip ${targetKey} (legacy exclude list)`);
            results.push({
              sourceKey,
              table: targetKey,
              mode: 'incremental',
              exported: 0,
              upserted: 0,
              durationMs: 0,
              status: 'skipped',
            });
            continue;
          }

          if (shouldSkipLargeTable(targetKey, opts.includeLarge, dbConfig.database)) {
            console.log(`  skip ${targetKey} (large; use --include-large or default)`);
            results.push({
              sourceKey,
              table: targetKey,
              mode: 'incremental',
              exported: 0,
              upserted: 0,
              durationMs: 0,
              status: 'skipped',
            });
            continue;
          }

          const meta = await fetchTableMetaFromDigitalOcean(
            dbConfig.database,
            sourceSchema,
            table
          );

          if (opts.schemaOnly) {
            console.log(`  schema ${sourceKey} → ${targetKey}`);
            try {
              if (!opts.dryRun) {
                await ensureTableInSupabase(client, targetSchema, meta);
              }
              results.push({
                sourceKey,
                table: targetKey,
                mode: 'full_upsert',
                exported: 0,
                upserted: 0,
                durationMs: 0,
                status: 'success',
              });
              console.log(`  ✓ ${targetKey}: schema ensured`);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`  ✗ ${targetKey}: ${message}`);
              results.push({
                sourceKey,
                table: targetKey,
                mode: 'full_upsert',
                exported: 0,
                upserted: 0,
                durationMs: 0,
                status: 'failed',
                error: message,
              });
              if (!opts.continueOnError) {
                fatalError = err instanceof Error ? err : new Error(message);
                break;
              }
            }
            continue;
          }

          const hasUpdatedAt = meta.columns.some((c) => c.column_name === 'updated_at');
          const syncMode = getTableSyncMode(targetKey, hasUpdatedAt, {
            full: opts.full,
            replaceSnapshots: opts.replaceSnapshots,
          });

          if (syncMode === 'skip_snapshot') {
            console.log(
              `  skip ${targetKey} (snapshot table; weekly skips — use --replace-snapshots monthly)`
            );
            results.push({
              sourceKey,
              table: targetKey,
              mode: 'full_replace',
              exported: 0,
              upserted: 0,
              durationMs: 0,
              status: 'skipped',
            });
            continue;
          }

          const since = opts.full ? null : await getWatermark(sourceKey);
          const sinceLabel =
            syncMode === 'incremental' && since
              ? ` since ${since.toISOString()} (-${5}m overlap)`
              : syncMode === 'full_replace'
                ? ' (truncate + reload)'
                : ' (full scan)';

          console.log(`  sync ${sourceKey} → ${targetKey} [${syncMode}]${sinceLabel}`);

          try {
            const result = await syncTableFromDigitalOcean({
              database: dbConfig.database,
              sourceSchema,
              targetSchema,
              table,
              supabaseClient: client,
              mode: syncMode,
              since,
              dryRun: opts.dryRun,
            });

            if (!opts.dryRun) {
              await setWatermark(sourceKey, runStartedAt);
            }

            results.push({ sourceKey, ...result, status: 'success' });
            console.log(
              `  ✓ ${targetKey}: ${result.exported} read, ${result.upserted} upserted (${result.durationMs}ms)`
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`  ✗ ${targetKey}: ${message}`);
            results.push({
              sourceKey,
              table: targetKey,
              mode: syncMode,
              exported: 0,
              upserted: 0,
              durationMs: 0,
              status: 'failed',
              error: message,
            });
            if (!opts.continueOnError) {
              fatalError = err instanceof Error ? err : new Error(message);
              break;
            }
          }
        }
        if (fatalError) break;
      }
      if (fatalError) break;
    }

    const failed = results.filter((r) => r.status === 'failed');
    const status = fatalError || failed.length > 0 ? 'failed' : 'success';

    if (runId) {
      await pool.query(
        `UPDATE public.do_sync_runs SET finished_at = now(), status = $2, results = $3::jsonb, error_message = $4 WHERE id = $1`,
        [
          runId,
          status,
          JSON.stringify(results),
          fatalError?.message ?? (failed.length ? `${failed.length} table(s) failed` : null),
        ]
      );
    }

    if (fatalError) throw fatalError;

    console.log('\n=== Sync complete ===');
    console.log(
      `Tables: ${results.filter((r) => r.status === 'success').length} ok, ` +
        `${results.filter((r) => r.status === 'skipped').length} skipped, ` +
        `${failed.length} failed`
    );
  } catch (err) {
    if (runId && !fatalError) {
      const message = err instanceof Error ? err.message : String(err);
      await pool.query(
        `UPDATE public.do_sync_runs SET finished_at = now(), status = 'failed', error_message = $2 WHERE id = $1`,
        [runId, message]
      );
    }
    throw err;
  } finally {
    client.release();
    await closeSupabaseDirectPool();
    await closeDigitalOceanPools();
  }
}

main().catch((err) => {
  console.error('\nSync failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
