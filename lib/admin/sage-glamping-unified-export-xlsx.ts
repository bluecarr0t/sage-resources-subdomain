import { PassThrough } from 'stream';
import { finished } from 'stream/promises';
import ExcelJS from 'exceljs';

/** Excel / SheetJS hard limit per cell (inclusive). */
export const XLSX_MAX_CELL_TEXT = 32767;

/** Dollar ADR columns. Sage stores the seasonal ones as text. */
const CURRENCY_RATE_COLUMNS = new Set([
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
]);

/**
 * Numeric measures PostgREST returns as strings. Written as Excel numbers so
 * PivotTables can sum them. Blank cells stay empty instead of "".
 */
const NUMERIC_EXPORT_COLUMNS = new Set([
  ...CURRENCY_RATE_COLUMNS,
  'id',
  'lat',
  'lon',
  'property_total_sites',
  'quantity_of_units',
  'year_site_opened',
  'number_of_locations',
  'unit_sq_ft',
  'cancelled_year',
  'roverpass_occupancy_rate',
  'roverpass_occupancy_year',
]);

const CURRENCY_NUM_FMT = '$#,##0.00';
const OCCUPANCY_NUM_FMT = '0.00';
const DATE_ONLY_FMT = 'yyyy-mm-dd';
const DATETIME_FMT = 'yyyy-mm-dd hh:mm';
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
const DATE_ONLY_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar dates. PivotTables can group these by month. */
const DATE_ONLY_COLUMNS = new Set([
  'date_added',
  'date_updated',
  'planned_open_date',
]);

/** Timestamps. Stored as UTC so the calendar day matches the source string. */
const DATETIME_COLUMNS = new Set(['created_at', 'updated_at']);
/** Whole-cell placeholder. A longer note that mentions the phrase is kept. */
const NO_DATA_PLACEHOLDER = /^no[\s_-]+data\.?$/i;

export type ExportCell = string | number | boolean | Date | null;

function isNoDataPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ');
  return NO_DATA_PLACEHOLDER.test(normalized);
}

export function cellValue(value: unknown): ExportCell {
  if (value === null || value === undefined || isNoDataPlaceholder(value)) return '';
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

/**
 * CSV cell. A leading minus on a real number (longitude) stays a number.
 * Other cells that start with =, +, -, or @ are prefixed so a spreadsheet
 * does not treat them as formulas.
 */
export function csvCell(value: unknown): string {
  const raw = cellValue(value);
  let text = String(raw);
  const plainNumber = PLAIN_NUMBER.test(text);
  if (!plainNumber && /^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Excel number format for a column, or null when the cell should stay general. */
export function xlsxNumFmtForColumn(column: string): string | null {
  if (CURRENCY_RATE_COLUMNS.has(column)) return CURRENCY_NUM_FMT;
  if (column === 'roverpass_occupancy_rate') return OCCUPANCY_NUM_FMT;
  if (DATE_ONLY_COLUMNS.has(column)) return DATE_ONLY_FMT;
  if (DATETIME_COLUMNS.has(column)) return DATETIME_FMT;
  return null;
}

function utcDate(year: number, month: number, day: number): Date | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function coerceExportDate(value: unknown, kind: 'date' | 'datetime'): Date | null | undefined {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    if (kind === 'date') {
      return utcDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()) ?? null;
    }
    return value;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const dateOnly = DATE_ONLY_TEXT.exec(trimmed);
  if (dateOnly) {
    return utcDate(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (kind === 'date') {
    return utcDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }
  return parsed;
}

function coerceExportNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const cleaned = trimmed.replace(/[$,\s]/g, '');
  if (!PLAIN_NUMBER.test(cleaned)) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function cellValueForXlsx(value: unknown, column?: string): ExportCell {
  if (isNoDataPlaceholder(value)) return null;
  if (column && (DATE_ONLY_COLUMNS.has(column) || DATETIME_COLUMNS.has(column))) {
    const kind = DATE_ONLY_COLUMNS.has(column) ? 'date' : 'datetime';
    const date = coerceExportDate(value, kind);
    if (date !== undefined) return date;
  }
  if (column && NUMERIC_EXPORT_COLUMNS.has(column)) {
    const numeric = coerceExportNumber(value);
    if (numeric !== undefined) return numeric;
  }
  const v = cellValue(value);
  if (typeof v === 'string' && v.length > XLSX_MAX_CELL_TEXT) {
    return `${v.slice(0, XLSX_MAX_CELL_TEXT - 1)}\u2026`;
  }
  return v;
}

/**
 * Build unified Sage + RoverPass XLSX via ExcelJS streaming writer.
 * Avoids holding a full array-of-arrays in memory (SheetJS `aoa_to_sheet` OOMs on ~31k rows).
 */
export async function buildUnifiedExportXlsxBuffer(
  headerRow: ExportCell[],
  dataRows: Iterable<ExportCell[]>,
  columnNumFmts?: Array<string | null>
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const pass = new PassThrough();
  pass.on('data', (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  const useStyles = columnNumFmts?.some((fmt) => fmt != null) ?? false;
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: pass,
    useStyles,
    useSharedStrings: false,
  });
  const sheet = workbook.addWorksheet('Combined');
  sheet.addRow(headerRow).commit();

  for (const row of dataRows) {
    const excelRow = sheet.addRow(row);
    if (columnNumFmts) {
      columnNumFmts.forEach((fmt, index) => {
        if (!fmt) return;
        const cell = excelRow.getCell(index + 1);
        if (typeof cell.value === 'number' || cell.value instanceof Date) cell.numFmt = fmt;
      });
    }
    excelRow.commit();
  }

  await sheet.commit();
  await workbook.commit();
  await finished(pass);

  return Buffer.concat(chunks);
}
