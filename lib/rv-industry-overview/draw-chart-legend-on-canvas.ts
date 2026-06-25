import {
  sortRvOverviewLegendItems,
  type RvOverviewLegendItem,
} from '@/lib/rv-industry-overview/chart-legend';

const EXPORT_SCALE = 2;
const LEGEND_FONT_PX = 12;
const LEGEND_ITEM_GAP_PX = 32;
const SWATCH_LABEL_GAP_PX = 8;
const LINE_SWATCH_W_PX = 20;
const BAR_SWATCH_PX = 10;
const LEGEND_BAND_PADDING_PX = 10;

export function parseRvOverviewLegendItems(root: HTMLElement): RvOverviewLegendItem[] {
  const nodes = root.querySelectorAll('[data-rv-legend-item]');
  return Array.from(nodes).flatMap((node) => {
    const el = node as HTMLElement;
    const label = el.dataset.rvLegendLabel?.trim() ?? '';
    if (!label) return [];
    const kind = el.dataset.rvLegendKind === 'bar' ? 'bar' : 'line';
    const color = el.dataset.rvLegendColor?.trim() || '#111827';
    const opacityRaw = el.dataset.rvLegendOpacity;
    const opacity =
      opacityRaw != null && opacityRaw !== '' ? Number.parseFloat(opacityRaw) : undefined;
    const item: RvOverviewLegendItem = {
      label,
      kind,
      color,
      ...(opacity != null && Number.isFinite(opacity) ? { opacity } : {}),
    };
    return [item];
  });
}

function drawBarSwatch(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  scale: number,
  opacity: number
): number {
  const size = BAR_SWATCH_PX * scale;
  const top = y - size / 2;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fillRect(x, top, size, size);
  ctx.restore();
  return size + SWATCH_LABEL_GAP_PX * scale;
}

function drawLineSwatch(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  scale: number,
  opacity: number
): number {
  const width = LINE_SWATCH_W_PX * scale;
  const lineH = 3 * scale;
  const dotR = 4 * scale;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineH;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + width / 2, y, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();

  return width + SWATCH_LABEL_GAP_PX * scale;
}

function legendBandHeight(scale: number): number {
  return (LEGEND_FONT_PX + LEGEND_BAND_PADDING_PX * 2) * scale;
}

/**
 * Overpaint the bottom legend band so JPEG export spacing matches the on-page legend.
 * html2canvas collapses table / flex gaps between legend labels.
 */
export function paintRvOverviewLegendOnCanvas(
  canvas: HTMLCanvasElement,
  items: RvOverviewLegendItem[],
  scale: number = EXPORT_SCALE
): void {
  if (items.length === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sorted = sortRvOverviewLegendItems(items);
  const fontSize = LEGEND_FONT_PX * scale;
  const itemGap = LEGEND_ITEM_GAP_PX * scale;
  const bandH = legendBandHeight(scale);
  const bandTop = canvas.height - bandH;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, bandTop, canvas.width, bandH);

  ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'middle';
  const textY = bandTop + bandH / 2;

  const layouts = sorted.map((item) => {
    const textWidth = ctx.measureText(item.label).width;
    const swatchWidth =
      (item.kind === 'line' ? LINE_SWATCH_W_PX : BAR_SWATCH_PX) * scale +
      SWATCH_LABEL_GAP_PX * scale;
    return { item, textWidth, swatchWidth, totalWidth: swatchWidth + textWidth };
  });

  const totalWidth =
    layouts.reduce((sum, row) => sum + row.totalWidth, 0) + itemGap * (layouts.length - 1);

  let x = (canvas.width - totalWidth) / 2;

  for (const { item, textWidth } of layouts) {
    const opacity = item.opacity ?? 1;
    const advance =
      item.kind === 'line'
        ? drawLineSwatch(ctx, item.color, x, textY, scale, opacity)
        : drawBarSwatch(ctx, item.color, x, textY, scale, opacity);
    x += advance;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#1f2937';
    ctx.fillText(item.label, x, textY);
    ctx.restore();
    x += textWidth + itemGap;
  }

  ctx.restore();
}
