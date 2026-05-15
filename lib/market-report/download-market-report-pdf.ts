/**
 * Rasterize a DOM subtree to a multi-page PDF (client-side).
 * Used by the admin Market Report "Download PDF" action.
 */

import { collectPdfKeepRegionsCanvas, nextPdfSliceEnd } from '@/lib/market-report/pdf-slice-boundaries';

export type DownloadMarketReportPdfOptions = {
  /** Root element to capture (typically `#market-report-print-root`). */
  element: HTMLElement;
  /** Suggested download filename including `.pdf`. */
  filename: string;
};

/**
 * Captures `element` with html2canvas and builds an A4 PDF with jsPDF.
 * Caller should apply layout classes (e.g. `market-report-pdf-capture`) and
 * presenter styling on the live tree before invoking, then remove them in `finally`.
 */
export async function downloadMarketReportPdfFromElement({
  element,
  filename,
}: DownloadMarketReportPdfOptions): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Market report snapshot was empty');
  }

  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgWidth = usableWidth;
  const scale = imgWidth / canvas.width;
  const sliceSourcePx = usableHeight / scale;

  const keepRegions = collectPdfKeepRegionsCanvas(element, canvas.height);

  let yPx = 0;
  let first = true;
  while (yPx < canvas.height) {
    if (!first) pdf.addPage();
    first = false;
    const sliceEnd = nextPdfSliceEnd(yPx, sliceSourcePx, canvas.height, keepRegions);
    const sliceH = sliceEnd - yPx;
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.ceil(sliceH);
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(canvas, 0, yPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    const sliceHpt = sliceH * scale;
    pdf.addImage(slice, 'PNG', margin, margin, imgWidth, sliceHpt);
    yPx += sliceH;
    if (sliceH < 1) {
      break;
    }
  }

  pdf.save(filename);
}
