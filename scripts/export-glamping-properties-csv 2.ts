/**
 * Export all_glamping_properties rows for a fixed property list to CSV and/or XLSX.
 * Usage:
 *   npx tsx scripts/export-glamping-properties-csv.ts [output-path]
 *   npx tsx scripts/export-glamping-properties-csv.ts --xlsx [output-path]
 *   npx tsx scripts/export-glamping-properties-csv.ts --csv [output-path]
 *
 * Default (no flags): writes both .csv and .xlsx next to each other in docs/data/exports/.
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const PROPERTY_NAMES = [
  'The Ranch at Rock Creek',
  'Backland',
  'Cave Lakes Canyon',
  'Collective Retreats Governors Island',
  'Open Sky',
];

const DEFAULT_BASE = path.join(
  process.cwd(),
  'docs/data/exports/all_glamping_properties_reference_cohort'
);

/** SheetJS / Excel cell text limit */
const XLSX_MAX_CELL_TEXT = 32767;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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

function writeCsv(
  outPath: string,
  columns: string[],
  data: Record<string, unknown>[]
): void {
  const header = columns.map(escapeCsv).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => escapeCsv((row as Record<string, unknown>)[col]))
      .join(',')
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, [header, ...rows].join('\n') + '\n', 'utf8');
}

function writeXlsx(
  outPath: string,
  columns: string[],
  data: Record<string, unknown>[]
): void {
  const aoa = [
    columns,
    ...data.map((row) => columns.map((col) => cellValue(row[col]))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'all_glamping_properties');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSyncXlsx(outPath, wb);
}

function writeFileSyncXlsx(outPath: string, wb: XLSX.WorkBook): void {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  fs.writeFileSync(outPath, buf);
}

function parseArgs(argv: string[]): {
  writeCsv: boolean;
  writeXlsx: boolean;
  outPath?: string;
} {
  const flags = argv.filter((a) => a.startsWith('--'));
  const paths = argv.filter((a) => !a.startsWith('--'));
  const csvOnly = flags.includes('--csv');
  const xlsxOnly = flags.includes('--xlsx');
  const writeCsv = csvOnly || (!csvOnly && !xlsxOnly);
  const writeXlsx = xlsxOnly || (!csvOnly && !xlsxOnly);
  return { writeCsv, writeXlsx, outPath: paths[0] };
}

function resolvePaths(
  outPath: string | undefined,
  writeCsv: boolean,
  writeXlsx: boolean
): { csv?: string; xlsx?: string } {
  if (!outPath) {
    return {
      csv: writeCsv ? `${DEFAULT_BASE}.csv` : undefined,
      xlsx: writeXlsx ? `${DEFAULT_BASE}.xlsx` : undefined,
    };
  }
  const ext = path.extname(outPath).toLowerCase();
  const base =
    ext === '.csv' || ext === '.xlsx'
      ? outPath.slice(0, -ext.length)
      : outPath;
  return {
    csv: writeCsv ? (ext === '.csv' ? outPath : `${base}.csv`) : undefined,
    xlsx: writeXlsx ? (ext === '.xlsx' ? outPath : `${base}.xlsx`) : undefined,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  const { writeCsv: doCsv, writeXlsx: doXlsx, outPath } = parseArgs(
    process.argv.slice(2)
  );
  const paths = resolvePaths(outPath, doCsv, doXlsx);

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('all_glamping_properties')
    .select('*')
    .in('property_name', PROPERTY_NAMES)
    .order('property_name', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!data?.length) {
    console.error('No rows returned');
    process.exit(1);
  }

  const columns = Object.keys(data[0] as Record<string, unknown>);
  const rows = data as Record<string, unknown>[];

  if (paths.csv) {
    writeCsv(paths.csv, columns, rows);
    console.log(
      `Wrote ${rows.length} rows, ${columns.length} columns → ${paths.csv}`
    );
  }
  if (paths.xlsx) {
    writeXlsx(paths.xlsx, columns, rows);
    console.log(
      `Wrote ${rows.length} rows, ${columns.length} columns → ${paths.xlsx}`
    );
  }
}

main();
