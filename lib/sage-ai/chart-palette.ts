/**
 * Series colors for Sage AI charts — distinct hues so grouped bars/lines are easy
 * to tell apart (not several greens). Same array is injected into Pyodide matplotlib.
 */
export const SAGE_AI_CHART_COLORS = [
  '#4A6FA5', // steel blue
  '#C17A4D', // terracotta
  '#6E5A8C', // violet
  '#2A7D8F', // teal
  '#B38B59', // golden oak
  '#8B4D5C', // rose
  '#3D5A80', // prussian blue
  '#9A6A3A', // caramel
] as const;

/**
 * Human-friendly legend / tooltip series names: `total_sites` → "Total Sites".
 * Only used when the model does not pass an explicit `series[].label`.
 */
export function formatChartSeriesLegendLabel(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Semantic layer colors for `visualize_on_map` (muted, on-brand). */
export const SAGE_AI_MAP_MARKER_HEX = {
  sage: '#5f7a65',
  blue: '#5f7d8a',
  orange: '#b8805c',
  red: '#a85d4f',
  purple: '#8b6d7a',
  gray: '#6f6a5f',
} as const;

/** Grid lines in dashboard charts (warm neutral, pairs with off-white / sage UI). */
export const SAGE_AI_CHART_GRID_STROKE = '#e0dbd2';
