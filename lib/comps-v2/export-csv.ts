import { expandCandidatesForSiteExport } from '@/lib/comps-v2/export-expand';
import {
  SITES_TEMPLATE_HEADERS,
  compsV2ExportRowToSitesTemplate,
} from '@/lib/comps-v2/sites-template-export';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  if (/[",\n\r]/.test(s)) return `"${s}"`;
  return s;
}

function exportRows(rows: CompsV2Candidate[], exportDate: Date): { headers: string[]; lines: string[][] } {
  const expanded = expandCandidatesForSiteExport(rows);
  const headers = [...SITES_TEMPLATE_HEADERS];
  const lines = expanded.map((r) =>
    compsV2ExportRowToSitesTemplate(r, { exportDate }).map((cell) => csvCell(cell))
  );
  return { headers, lines };
}

/**
 * Comps v2 export using the same column layout as Sage “sites” CSVs (e.g. multi-site Campspot exports).
 */
export function compsV2CandidatesToCsv(rows: CompsV2Candidate[], exportDate = new Date()): string {
  const { headers, lines } = exportRows(rows, exportDate);
  const headerLine = headers.map((h) => csvCell(h)).join(',');
  const body = lines.map((cells) => cells.join(','));
  return [headerLine, ...body].join('\r\n');
}

/** Same columns and row shape as CSV; uses dynamic import of `xlsx` for client bundles. */
export async function writeCompsV2CandidatesXlsx(
  rows: CompsV2Candidate[],
  filename = `comps-v2-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
  exportDate = new Date()
): Promise<void> {
  const { default: XLSX } = await import('xlsx');
  const expanded = expandCandidatesForSiteExport(rows);
  const aoa: unknown[][] = [
    [...SITES_TEMPLATE_HEADERS],
    ...expanded.map((r) => compsV2ExportRowToSitesTemplate(r, { exportDate })),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Properties');
  XLSX.writeFile(wb, filename);
}
