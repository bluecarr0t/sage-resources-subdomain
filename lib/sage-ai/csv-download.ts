/**
 * Client-side CSV/XLSX generation and download for Sage AI tool results.
 */

function csvCell(value: unknown): string {
  if (value == null) return '';
  const str = String(value).replace(/"/g, '""');
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
    ...data.map((row) => headers.map((h) => row[h] ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
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
