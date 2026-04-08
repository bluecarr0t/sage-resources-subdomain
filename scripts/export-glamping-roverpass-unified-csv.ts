#!/usr/bin/env npx tsx
/**
 * Export a single CSV: all_glamping_properties rows + all_roverpass_data_new rows,
 * with columns matching public.all_glamping_properties (pg_attribute order), minus a small omit list below.
 *
 * Supabase MCP is not required; uses the same DB as Studio (SUPABASE_DB_URL + Supabase JS).
 *
 * Usage: npx tsx scripts/export-glamping-roverpass-unified-csv.ts [output-path]
 * Default output: csv/glamping-and-roverpass-unified.csv
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createWriteStream, mkdirSync } from 'fs';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const DEFAULT_OUT = resolve(process.cwd(), 'csv/glamping-and-roverpass-unified.csv');
const PAGE_SIZE = 1000;

/** Dropped from unified CSV/XLSX (still exist on the DB table). */
const EXCLUDED_FROM_UNIFIED_EXPORT = new Set([
  'quality_score',
  'amenities_raw',
  'activities_raw',
  'lifestyle_raw',
]);

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const s = JSON.stringify(value);
    return escapeCsvCell(s);
  }
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeRow(
  stream: ReturnType<typeof createWriteStream>,
  cols: string[],
  row: Record<string, unknown>
) {
  const line = cols.map((c) => escapeCsvCell(row[c])).join(',');
  stream.write(`${line}\n`);
}

async function fetchAllRows(
  supabase: ReturnType<typeof createClient>,
  table: string,
  columns: string
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`${table} fetch: ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!dbUrl || !supabaseUrl || !secretKey) {
    console.error(
      'Missing env: SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (.env.local)'
    );
    process.exit(1);
  }

  const outPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_OUT;

  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();

  /** Physical column order (pg_attribute.attnum) — identical to public.all_glamping_properties in Postgres. */
  const listPhysicalCols = async (relname: string) => {
    const { rows } = await pg.query<{ column_name: string }>(
      `SELECT a.attname AS column_name
       FROM pg_catalog.pg_attribute a
       JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = $1
         AND a.attnum > 0
         AND NOT a.attisdropped
       ORDER BY a.attnum`,
      [relname]
    );
    return rows.map((r) => r.column_name);
  };

  const glampingCols = (await listPhysicalCols('all_glamping_properties')).filter(
    (c) => !EXCLUDED_FROM_UNIFIED_EXPORT.has(c)
  );
  const roverCols = new Set(await listPhysicalCols('all_roverpass_data_new'));
  await pg.end();

  if (glampingCols.length === 0) {
    console.error('No columns found for all_glamping_properties');
    process.exit(1);
  }

  const roverSelectCols = glampingCols.filter((c) => roverCols.has(c));
  const onlyGlamping = glampingCols.filter((c) => !roverCols.has(c));
  if (onlyGlamping.length > 0) {
    console.log(
      `RoverPass rows will have empty cells for ${onlyGlamping.length} glamping-only column(s).`
    );
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const glampingSelect = glampingCols.join(',');

  console.log(
    `CSV columns: ${glampingCols.length} (all_glamping_properties minus ${EXCLUDED_FROM_UNIFIED_EXPORT.size} excluded)`
  );
  console.log('Fetching all_glamping_properties...');
  const glampingRows = await fetchAllRows(supabase, 'all_glamping_properties', glampingSelect);
  console.log(`  ${glampingRows.length} rows`);

  console.log('Fetching all_roverpass_data_new...');
  const roverRaw = await fetchAllRows(
    supabase,
    'all_roverpass_data_new',
    roverSelectCols.join(',')
  );
  const roverRows: Record<string, unknown>[] = roverRaw.map((r) => {
    const full: Record<string, unknown> = {};
    for (const c of glampingCols) {
      full[c] = r[c] ?? null;
    }
    return full;
  });
  console.log(`  ${roverRows.length} rows`);

  mkdirSync(resolve(outPath, '..'), { recursive: true });
  const stream = createWriteStream(outPath, { encoding: 'utf-8' });
  stream.write(`${glampingCols.map(escapeCsvCell).join(',')}\n`);

  for (const row of glampingRows) {
    writeRow(stream, glampingCols, row);
  }
  for (const row of roverRows) {
    writeRow(stream, glampingCols, row);
  }

  stream.end();
  await new Promise<void>((res, rej) => {
    stream.on('finish', res);
    stream.on('error', rej);
  });

  console.log(`Wrote ${glampingRows.length + roverRows.length} total rows → ${outPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
