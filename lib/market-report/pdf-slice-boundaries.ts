/**
 * Helpers for client-side market report PDFs (html2canvas + jsPDF).
 * jsPDF slices a tall canvas at fixed heights; these utilities shift slice
 * edges so they do not bisect DOM regions marked `.market-report-pdf-keep`.
 */

export type PdfKeepRegionCanvas = { top: number; bottom: number };

/** Y-range of `el` relative to `root`'s content box (CSS px), using layout rects. */
export function getRelativeYRangeCss(el: HTMLElement, root: HTMLElement): { top: number; bottom: number } {
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const top = elRect.top - rootRect.top + root.scrollTop;
  const bottom = top + elRect.height;
  return { top: Math.max(0, top), bottom: Math.max(top, bottom) };
}

export function collectPdfKeepRegionsCanvas(
  root: HTMLElement,
  canvasHeight: number,
  selector = '.market-report-pdf-keep',
): PdfKeepRegionCanvas[] {
  const layoutH = Math.max(1, root.scrollHeight);
  const scale = canvasHeight / layoutH;
  const regions: PdfKeepRegionCanvas[] = [];
  for (const node of root.querySelectorAll(selector)) {
    if (!(node instanceof HTMLElement)) continue;
    const { top, bottom } = getRelativeYRangeCss(node, root);
    if (bottom <= top + 0.5) continue;
    regions.push({ top: top * scale, bottom: bottom * scale });
  }
  regions.sort((a, b) => a.top - b.top);
  return regions;
}

/**
 * Chooses the end Y (canvas px, exclusive) of the slice starting at `y`,
 * not exceeding `y + maxSlice` or `canvasHeight`, and avoiding cuts through
 * keep regions when possible.
 */
export function nextPdfSliceEnd(
  y: number,
  maxSlice: number,
  canvasHeight: number,
  regions: PdfKeepRegionCanvas[],
): number {
  const hardEnd = Math.min(y + maxSlice, canvasHeight);
  let end = hardEnd;
  const MIN_SLICE = 40;

  for (let iter = 0; iter < 64; iter++) {
    let changed = false;
    for (const r of regions) {
      if (end <= y + 1e-6) break;
      if (r.bottom <= y || r.top >= end) continue;

      if (y <= r.top && end >= r.bottom) continue;

      if (y < r.top && end > r.top && end < r.bottom) {
        end = r.top;
        changed = true;
        break;
      }

      if (y >= r.top && y < r.bottom && end < r.bottom) {
        if (r.bottom - y <= maxSlice + 1e-6) {
          end = r.bottom;
        } else {
          end = hardEnd;
        }
        changed = true;
        break;
      }
    }
    if (!changed) break;
    if (end <= y + MIN_SLICE && end < hardEnd) {
      end = hardEnd;
      break;
    }
  }

  if (end <= y) {
    end = Math.min(y + maxSlice, canvasHeight);
  }
  return end;
}
