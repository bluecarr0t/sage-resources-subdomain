/**
 * Client-side CSV/XLSX generation and download for Sage AI tool results.
 */

/**
 * Normalize a cell value to a string suitable for CSV/XLSX output.
 * Objects and arrays (e.g. JSONB columns) are JSON-serialized so they don't
 * collapse into "[object Object]".
 */
function normalizeCell(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function csvCell(value: unknown): string {
  const str = normalizeCell(value).replace(/"/g, '""');
  if (/[",\n\r]/.test(str)) return `"${str}"`;
  return str;
}

function collectAllKeys(data: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
  }
  return ordered;
}

/**
 * Convert an array of objects to CSV string.
 * Headers are derived from the union of keys across all rows.
 */
export function arrayToCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return '';

  const headers = collectAllKeys(data);
  const headerLine = headers.map((h) => csvCell(h)).join(',');

  const rows = data.map((row) =>
    headers.map((h) => csvCell(row[h])).join(',')
  );

  return [headerLine, ...rows].join('\r\n');
}

/**
 * Trigger a CSV download in the browser from an array of objects.
 */
export function downloadCsvFromData(
  data: Record<string, unknown>[],
  filename = 'sage-ai-export.csv'
): void {
  if (!data.length) {
    console.warn('No data to export');
    return;
  }

  const csv = arrayToCsv(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Trigger an XLSX download in the browser from an array of objects.
 * Uses dynamic import to keep bundle size small.
 */
export async function downloadXlsxFromData(
  data: Record<string, unknown>[],
  filename = 'sage-ai-export.xlsx'
): Promise<void> {
  if (!data.length) {
    console.warn('No data to export');
    return;
  }

  let XLSX: typeof import('xlsx');
  try {
    XLSX = await import('xlsx');
  } catch {
    throw new Error(
      'Failed to load the Excel export library. Please try CSV export instead.'
    );
  }

  const headers = collectAllKeys(data);
  const aoa: unknown[][] = [
    headers,
    ...data.map((row) =>
      headers.map((h) => {
        const v = row[h];
        if (v == null) return '';
        return typeof v === 'object' ? normalizeCell(v) : v;
      })
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Build CSV text from a row-major grid of string cells (e.g. parsed from an HTML
 * &lt;table&gt;). Used by markdown table exports; exposed for unit tests.
 */
export function tableRowsToCsvString(rows: string[][]): string {
  if (!rows.length) return '';
  return rows.map((row) => row.map((c) => csvCell(c)).join(',')).join('\r\n');
}

/**
 * Download a 2D string table (first row is usually the header).
 */
export function downloadCsvFromRows(
  rows: string[][],
  filename = 'sage-ai-table.csv'
): void {
  if (!rows.length) {
    console.warn('No data to export');
    return;
  }
  const csv = tableRowsToCsvString(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * XLSX download from a 2D string grid (uses sheet `Data`).
 */
export async function downloadXlsxFromRows(
  rows: string[][],
  filename = 'sage-ai-table.xlsx'
): Promise<void> {
  if (!rows.length) {
    console.warn('No data to export');
    return;
  }
  let XLSX: typeof import('xlsx');
  try {
    XLSX = await import('xlsx');
  } catch {
    throw new Error(
      'Failed to load the Excel export library. Please try CSV export instead.'
    );
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Generate a timestamped filename for exports (without extension).
 */
export function generateExportFilename(prefix = 'sage-ai-export'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}`;
}
