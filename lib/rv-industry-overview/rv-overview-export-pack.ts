import JSZip from 'jszip';
import type { RvOverviewDownloadChartKey } from '@/lib/rv-industry-overview/rv-overview-download-all';

export type RvOverviewExportPackFile = {
  key: RvOverviewDownloadChartKey;
  fileName: string;
  blob: Blob;
};

export type RvOverviewExportPackOnePager = {
  title: string;
  generatedAtIso: string;
  unitFilterLabel: string;
  sourceFilterLabel: string;
  yearEmphasisLabel: string;
  rateMetricLabel: string;
  rowsScannedLine: string;
  yoyRulesSummary: string;
};

export async function buildRvOverviewExportPackZip(
  files: RvOverviewExportPackFile[],
  onePager: RvOverviewExportPackOnePager
): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    'README-one-pager.txt',
    [
      onePager.title,
      `Generated: ${onePager.generatedAtIso}`,
      `Unit cohort: ${onePager.unitFilterLabel}`,
      `Data sources: ${onePager.sourceFilterLabel}`,
      `Year emphasis: ${onePager.yearEmphasisLabel}`,
      `Rate columns: ${onePager.rateMetricLabel}`,
      '',
      onePager.rowsScannedLine,
      '',
      'YoY / RoverPass',
      onePager.yoyRulesSummary,
      '',
      'Files: numbered PNGs (or PNG map fallbacks) match chart titles on the admin page.',
      'Source transparency panels are not included (admin-only).',
    ].join('\n')
  );

  const sorted = [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));
  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i];
    const prefix = String(i + 1).padStart(2, '0');
    zip.file(`${prefix}-${f.fileName}`, f.blob);
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
