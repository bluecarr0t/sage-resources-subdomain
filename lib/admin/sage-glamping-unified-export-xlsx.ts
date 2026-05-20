import { PassThrough } from 'stream';
import { finished } from 'stream/promises';
import ExcelJS from 'exceljs';

/** Excel / SheetJS hard limit per cell (inclusive). */
export const XLSX_MAX_CELL_TEXT = 32767;

export type ExportCell = string | number | boolean;

export function cellValue(value: unknown): ExportCell {
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

export function cellValueForXlsx(value: unknown): ExportCell {
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
  dataRows: Iterable<ExportCell[]>
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const pass = new PassThrough();
  pass.on('data', (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: pass,
    useStyles: false,
    useSharedStrings: false,
  });
  const sheet = workbook.addWorksheet('Combined');
  sheet.addRow(headerRow).commit();

  for (const row of dataRows) {
    sheet.addRow(row).commit();
  }

  await sheet.commit();
  await workbook.commit();
  await finished(pass);

  return Buffer.concat(chunks);
}
