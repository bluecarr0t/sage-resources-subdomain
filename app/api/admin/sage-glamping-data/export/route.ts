import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { ALL_GLAMPING_PROPERTY_COLUMNS } from '@/lib/sage-ai/all-glamping-properties-columns';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ExportFormat = 'csv' | 'xlsx';
type ExportTable = 'all_glamping_properties' | 'all_roverpass_data_new';
type ExportRow = Record<string, unknown>;
type ExportCell = string | number | boolean;

const PAGE_SIZE = 1000;
/** Excel / SheetJS hard limit per cell (inclusive). Longer text throws from `aoa_to_sheet`. */
const XLSX_MAX_CELL_TEXT = 32767;
const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const EXCLUDED_FROM_UNIFIED_EXPORT = new Set([
  'quality_score',
  'amenities_raw',
  'activities_raw',
  'lifestyle_raw',
]);

const EXPORT_COLUMNS = ALL_GLAMPING_PROPERTY_COLUMNS.filter(
  (column) => !EXCLUDED_FROM_UNIFIED_EXPORT.has(column)
);

/** File headers: `is_open` is emitted as `is_closed` (values inverted); DB is unchanged. */
const EXPORT_OUTPUT_COLUMN_NAMES = EXPORT_COLUMNS.map((column) =>
  column === 'is_open' ? 'is_closed' : column
);

/** Export-only: is_open Yes/No → is_closed No/Yes. Other values pass through. */
function invertOpenToClosedValue(value: unknown): ExportCell {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  const low = s.toLowerCase();
  if (low === 'yes') return 'No';
  if (low === 'no') return 'Yes';
  return cellValue(value);
}

function getExportSourceValue(row: ExportRow, sourceColumn: string): unknown {
  const raw = row[sourceColumn];
  if (sourceColumn === 'is_open') {
    return invertOpenToClosedValue(raw);
  }
  return raw;
}

function parseFormat(request: NextRequest): ExportFormat {
  return request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
}

function buildFilename(format: ExportFormat): string {
  const date = new Date().toISOString().slice(0, 10);
  return `glamping-and-roverpass-unified-${date}.${format}`;
}

function cellValue(value: unknown): ExportCell {
  if (value === null || value === undefined) return '';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

function cellValueForXlsx(value: unknown): ExportCell {
  const v = cellValue(value);
  if (typeof v === 'string' && v.length > XLSX_MAX_CELL_TEXT) {
    return `${v.slice(0, XLSX_MAX_CELL_TEXT - 1)}\u2026`;
  }
  return v;
}

function csvCell(value: unknown): string {
  const raw = cellValue(value);
  let text = String(raw);
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function fetchAllRows(
  supabase: SupabaseClient,
  table: ExportTable
): Promise<ExportRow[]> {
  const rows: ExportRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table} fetch failed: ${error.message}`);
    }
    if (!data?.length) break;

    rows.push(...(data as ExportRow[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

function normalizeRows(rows: ExportRow[]): ExportRow[] {
  return rows.map((row) => {
    const out: ExportRow = {};
    for (const column of EXPORT_COLUMNS) {
      out[column] = row[column] ?? null;
    }
    return out;
  });
}

function rowsToAoa(rows: ExportRow[]): ExportCell[][] {
  return rows.map((row) =>
    EXPORT_COLUMNS.map((column) =>
      cellValueForXlsx(getExportSourceValue(row, column))
    )
  );
}

function buildCsv(rows: ExportRow[]): string {
  return [
    EXPORT_OUTPUT_COLUMN_NAMES.map((name) => csvCell(name)).join(','),
    ...rows.map((row) =>
      EXPORT_COLUMNS.map((column) =>
        csvCell(getExportSourceValue(row, column))
      ).join(',')
    ),
  ].join('\r\n');
}

function buildXlsxBuffer(rows: ExportRow[]): Buffer {
  const aoa: ExportCell[][] = [
    [...EXPORT_OUTPUT_COLUMN_NAMES] as ExportCell[],
    ...rowsToAoa(rows),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Combined');
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  }) as Buffer;
}

export const GET = withAdminAuth(async (request) => {
  try {
    const format = parseFormat(request);
    const supabase = createServerClient();

    const [glampingRows, roverpassRows] = await Promise.all([
      fetchAllRows(supabase, 'all_glamping_properties'),
      fetchAllRows(supabase, 'all_roverpass_data_new'),
    ]);
    const rows = [...normalizeRows(glampingRows), ...normalizeRows(roverpassRows)];
    const filename = buildFilename(format);

    if (format === 'csv') {
      return new NextResponse(`\uFEFF${buildCsv(rows)}`, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const xlsxBuffer = buildXlsxBuffer(rows);
    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': XLSX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[admin/sage-data/export] GET error:', err);
    const message = err instanceof Error ? err.message : 'Failed to export Sage data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
});
