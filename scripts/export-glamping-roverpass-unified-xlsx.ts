#!/usr/bin/env npx tsx
/**
 * Export a single .xlsx: all_glamping_properties rows + all_roverpass_data_new rows,
 * same column layout as scripts/export-glamping-roverpass-unified-csv.ts (glamping physical column order, minus omit list).
 *
 * Requires: SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (.env.local)
 *
 * Usage: npx tsx scripts/export-glamping-roverpass-unified-xlsx.ts [output-path]
 * Default output: csv/glamping-and-roverpass-unified.xlsx
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

config({ path: resolve(process.cwd(), '.env.local') });

const DEFAULT_OUT = resolve(process.cwd(), 'csv/glamping-and-roverpass-unified.xlsx');
const PAGE_SIZE = 1000;
/** SheetJS / Excel limit; longer strings throw in `aoa_to_sheet`. */
const XLSX_MAX_CELL_TEXT = 32767;

const EXCLUDED_FROM_UNIFIED_EXPORT = new Set([
  'quality_score',
  'amenities_raw',
  'activities_raw',
  'lifestyle_raw',
]);

function cellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'bigint') return truncateCellText(value.toString());
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value;
  let text: string;
  if (typeof value === 'object') {
    try {
      text = JSON.stringify(value);
    } catch {
      return '';
    }
  } else {
    text = String(value);
  }
  return truncateCellText(text);
}

function truncateCellText(text: string): string {
  if (text.length <= XLSX_MAX_CELL_TEXT) return text;
  return `${text.slice(0, XLSX_MAX_CELL_TEXT - 1)}\u2026`;
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

function rowsToAoa(
  cols: string[],
  rows: Record<string, unknown>[]
): (string | number | boolean)[][] {
  return rows.map((row) => cols.map((c) => cellValue(row[c])));
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
    `XLSX columns: ${glampingCols.length} (all_glamping_properties minus ${EXCLUDED_FROM_UNIFIED_EXPORT.size} excluded)`
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

  const header = glampingCols.map((c) => c) as (string | number | boolean)[];
  const aoa: (string | number | boolean)[][] = [
    header,
    ...rowsToAoa(glampingCols, glampingRows),
    ...rowsToAoa(glampingCols, roverRows),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Combined');

  mkdirSync(resolve(outPath, '..'), { recursive: true });
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
  writeFileSync(outPath, buf);

  console.log(
    `Wrote ${glampingRows.length + roverRows.length} total rows → ${outPath}`
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
