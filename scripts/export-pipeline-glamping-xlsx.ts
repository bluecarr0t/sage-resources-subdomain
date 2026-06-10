#!/usr/bin/env npx tsx
/**
 * Export all_sage_data rows where is_open is Under Construction or Proposed Development.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (.env.local)
 *
 * Usage: npx tsx scripts/export-pipeline-glamping-xlsx.ts [output-path]
 * Default: docs/data/exports/pipeline-glamping-under-construction-proposed-development.xlsx
 */

import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { GLAMPING_IS_OPEN_VALUES } from '../lib/glamping-is-open';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const PIPELINE_IS_OPEN = [
  'Under Construction',
  'Proposed Development',
] as const satisfies readonly (typeof GLAMPING_IS_OPEN_VALUES)[number][];

const DEFAULT_OUT = resolve(
  process.cwd(),
  'docs/data/exports/pipeline-glamping-under-construction-proposed-development.xlsx'
);

const PAGE_SIZE = 1000;
const XLSX_MAX_CELL_TEXT = 32767;

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

async function fetchPipelineRows(
  supabase: ReturnType<typeof createClient>
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select('*')
      .in('is_open', [...PIPELINE_IS_OPEN])
      .order('state', { ascending: true })
      .order('property_name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`all_sage_data fetch: ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error(
      'Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (.env.local)'
    );
    process.exit(1);
  }

  const outPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_OUT;

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    `Fetching pipeline rows (is_open in ${PIPELINE_IS_OPEN.map((v) => `"${v}"`).join(', ')})...`
  );
  const rows = await fetchPipelineRows(supabase);

  if (rows.length === 0) {
    console.error('No rows returned');
    process.exit(1);
  }

  const columns = Object.keys(rows[0]);
  const aoa: (string | number | boolean)[][] = [
    columns,
    ...rows.map((row) => columns.map((c) => cellValue(row[c]))),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'pipeline_glamping');

  mkdirSync(resolve(outPath, '..'), { recursive: true });
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
  writeFileSync(outPath, buf);

  const byStatus = PIPELINE_IS_OPEN.map((status) => ({
    status,
    count: rows.filter((r) => r.is_open === status).length,
  }));

  console.log(`Wrote ${rows.length} rows, ${columns.length} columns → ${outPath}`);
  for (const { status, count } of byStatus) {
    console.log(`  ${status}: ${count}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
