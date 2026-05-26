import type { PoolClient } from 'pg';
import { withDigitalOceanReadOnlyClient } from '../../lib/digitalocean-readonly-db';
import type { DigitalOceanDatabase } from '../../lib/digitalocean-readonly-db';
import {
  buildSelectList,
  buildUpsertSql,
  ensureTableInSupabase,
  fetchTableMetaFromDigitalOcean,
  type TableMeta,
} from './schema-utils';
import { serializeRowValue } from './row-values';
import type { TableSyncMode } from './table-sync-config';
import { WATERMARK_OVERLAP_MS } from './table-sync-config';

const DEFAULT_BATCH_SIZE = 2000;
const MAX_PARAMS = 60000;

export interface SyncTableOptions {
  database: DigitalOceanDatabase;
  sourceSchema: string;
  targetSchema: string;
  table: string;
  supabaseClient: PoolClient;
  mode: TableSyncMode;
  since?: Date | null;
  dryRun?: boolean;
}

export interface SyncTableResult {
  table: string;
  mode: TableSyncMode;
  exported: number;
  upserted: number;
  durationMs: number;
}

function hasUpdatedAt(columns: { column_name: string }[]): boolean {
  return columns.some((c) => c.column_name === 'updated_at');
}

function effectiveBatchSize(meta: TableMeta): number {
  const colCount = Math.max(meta.columns.length, 1);
  return Math.min(DEFAULT_BATCH_SIZE, Math.floor(MAX_PARAMS / colCount));
}

function orderColumnsForPagination(meta: TableMeta, mode: TableSyncMode): string[] {
  if (mode === 'incremental') {
    const pk = meta.primaryKey.filter((c) => c !== 'updated_at');
    return ['updated_at', ...pk];
  }
  if (meta.primaryKey.length > 0) return meta.primaryKey;
  return meta.columns.slice(0, 1).map((c) => c.column_name);
}

function buildKeysetWhere(orderCols: string[], cursor: unknown[]): string {
  const tuple = orderCols.map((_, i) => `$${i + 1}`).join(', ');
  return `WHERE (${orderCols.join(', ')}) > (${tuple})`;
}

function rowCursorValues(row: Record<string, unknown>, orderCols: string[]): unknown[] {
  return orderCols.map((c) => row[c] ?? null);
}

async function upsertBatch(
  supabaseClient: PoolClient,
  targetSchema: string,
  meta: TableMeta,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (rows.length === 0) return;

  const flatValues: unknown[] = [];
  for (const row of rows) {
    for (const col of meta.columns) {
      flatValues.push(serializeRowValue(row[col.column_name], col));
    }
  }

  const { sql, columnCount } = buildUpsertSql(targetSchema, meta, rows.length);
  if (flatValues.length !== rows.length * columnCount) {
    throw new Error(`Value count mismatch for ${targetSchema}.${meta.table}`);
  }
  await supabaseClient.query(sql, flatValues);
}

async function fetchPage(
  database: DigitalOceanDatabase,
  sourceSchema: string,
  table: string,
  selectList: string,
  mode: TableSyncMode,
  orderCols: string[],
  batchSize: number,
  since: Date | null,
  cursor: unknown[] | null
): Promise<Record<string, unknown>[]> {
  return withDigitalOceanReadOnlyClient(database, async (doClient) => {
    const params: unknown[] = [];
    let where = '';

    if (mode === 'incremental' && since) {
      if (cursor) {
        where = buildKeysetWhere(orderCols, cursor);
        params.push(...cursor);
      } else {
        where = 'WHERE updated_at > $1';
        params.push(since.toISOString());
      }
    } else if (cursor && orderCols.length > 0 && orderCols[0] !== '1') {
      where = buildKeysetWhere(orderCols, cursor);
      params.push(...cursor);
    }

    const orderBy =
      orderCols[0] === '1' ? 'ORDER BY 1' : `ORDER BY ${orderCols.join(', ')}`;
    const sql = `
      SELECT ${selectList}
      FROM ${sourceSchema}.${table}
      ${where}
      ${orderBy}
      LIMIT ${batchSize}
    `;
    const result = await doClient.query<Record<string, unknown>>(sql, params);
    return result.rows;
  });
}

async function syncPaginated(
  options: SyncTableOptions,
  meta: TableMeta,
  mode: TableSyncMode
): Promise<{ exported: number; upserted: number }> {
  const { database, sourceSchema, targetSchema, table, supabaseClient, since, dryRun } = options;
  const batchSize = effectiveBatchSize(meta);
  const selectList = buildSelectList(meta);
  const orderCols = orderColumnsForPagination(meta, mode);

  const effectiveSince =
    mode === 'incremental' && since
      ? new Date(since.getTime() - WATERMARK_OVERLAP_MS)
      : null;

  let cursor: unknown[] | null = null;
  let exported = 0;
  let upserted = 0;

  while (true) {
    const rows = await fetchPage(
      database,
      sourceSchema,
      table,
      selectList,
      mode,
      orderCols,
      batchSize,
      effectiveSince,
      cursor
    );

    if (rows.length === 0) break;

    exported += rows.length;

    if (!dryRun) {
      await upsertBatch(supabaseClient, targetSchema, meta, rows);
      upserted += rows.length;
    }

    process.stdout.write(`\r  ${targetSchema}.${table}: ${exported} rows from DO (${mode})...`);

    const last = rows[rows.length - 1];
    cursor = rowCursorValues(last, orderCols);

    if (rows.length < batchSize) break;
  }

  if (exported > 0) process.stdout.write('\n');

  return { exported, upserted };
}

async function syncFullReplace(
  options: SyncTableOptions,
  meta: TableMeta
): Promise<{ exported: number; upserted: number }> {
  const { targetSchema, table, supabaseClient, dryRun } = options;
  const fullTable = `${targetSchema}.${table}`;

  if (!dryRun) {
    await supabaseClient.query(`TRUNCATE TABLE ${fullTable}`);
    console.log(`  ${fullTable}: truncated (full_replace).`);
  }

  return syncPaginated(options, meta, 'full_upsert');
}

export async function syncTableFromDigitalOcean(
  options: SyncTableOptions
): Promise<SyncTableResult> {
  const { database, sourceSchema, table, targetSchema, mode } = options;
  const started = Date.now();
  const qualified = `${sourceSchema}.${table}`;

  const meta = await fetchTableMetaFromDigitalOcean(database, sourceSchema, table);
  if (meta.columns.length === 0) {
    throw new Error(`No columns found for ${database}.${qualified}`);
  }

  if (meta.primaryKey.length === 0 && mode !== 'full_replace') {
    console.warn(
      `  warn ${targetSchema}.${table}: no primary key on DO — upserts may duplicate rows`
    );
  }

  if (!options.dryRun) {
    await ensureTableInSupabase(options.supabaseClient, targetSchema, meta);
  }

  let counts: { exported: number; upserted: number };

  if (mode === 'full_replace') {
    counts = await syncFullReplace(options, meta);
  } else {
    const paginateMode = mode === 'incremental' && hasUpdatedAt(meta.columns) ? 'incremental' : 'full_upsert';
    counts = await syncPaginated(options, meta, paginateMode);
  }

  return {
    table: `${targetSchema}.${table}`,
    mode,
    exported: counts.exported,
    upserted: options.dryRun ? 0 : counts.upserted,
    durationMs: Date.now() - started,
  };
}
