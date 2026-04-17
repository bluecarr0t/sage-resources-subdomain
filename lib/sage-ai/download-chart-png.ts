/**
 * Rasterize a DOM node (e.g. Recharts wrapper) to PNG via html2canvas.
 */
export async function downloadElementAsPng(
  node: HTMLElement,
  filename: string
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
    ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore'),
  });
  const link = document.createElement('a');
  const base = filename.replace(/\.png$/i, '');
  link.download = `${base}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function slugifyChartFilename(title: string, fallbackIndex: number): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || `chart-${fallbackIndex + 1}`;
}
