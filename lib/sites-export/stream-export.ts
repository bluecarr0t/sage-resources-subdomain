import { PassThrough } from 'stream';
import { finished } from 'stream/promises';
import ExcelJS from 'exceljs';
import { SITES_TEMPLATE_HEADERS } from '@/lib/comps-v2/sites-template-export';
import type { SitesExportFormat } from '@/lib/sites-export/types';

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  if (/[",\n\r]/.test(s)) return `"${s}"`;
  return s;
}

function csvLine(row: unknown[]): string {
  return row.map((c) => csvCell(c)).join(',');
}

/**
 * Stream CSV: header + one row per chunk (UTF-8).
 */
export function sitesExportToCsvReadableStream(
  rows: AsyncIterable<unknown[]>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const headerLine = csvLine([...SITES_TEMPLATE_HEADERS]);

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`${headerLine}\r\n`));
        for await (const row of rows) {
          controller.enqueue(encoder.encode(`${csvLine(row)}\r\n`));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Build XLSX in a streaming writer; collects stream chunks into a single buffer (avoids giant in-memory AOA).
 */
export async function sitesExportToXlsxBuffer(rows: AsyncIterable<unknown[]>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const pass = new PassThrough();
  pass.on('data', (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: pass,
    useStyles: false,
    useSharedStrings: false,
  });
  const sheet = workbook.addWorksheet('Sites');
  sheet.addRow([...SITES_TEMPLATE_HEADERS]).commit();

  for await (const row of rows) {
    sheet.addRow(row.map((c) => (c == null ? '' : c))).commit();
  }

  await sheet.commit();
  await workbook.commit();
  await finished(pass);

  return Buffer.concat(chunks);
}

export async function streamSitesExportBody(
  rows: AsyncIterable<unknown[]>,
  format: SitesExportFormat
): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string; ext: string }> {
  if (format === 'csv') {
    return {
      body: sitesExportToCsvReadableStream(rows),
      contentType: 'text/csv; charset=utf-8',
      ext: 'csv',
    };
  }

  const buf = await sitesExportToXlsxBuffer(rows);
  return {
    body: buf,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
  };
}
