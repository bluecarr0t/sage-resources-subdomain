/**
 * Prepares rows for Recharts `ScatterChart`: coerces Y to numbers and infers
 * whether the X dimension is numeric or categorical. String X values (e.g. unit
 * type) with `type="number"` on XAxis yield null coordinates and no visible
 * points — this module fixes that mismatch.
 */

export type ScatterChartRow = Record<string, string | number | null>;

function xValueLooksNumeric(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return true;
    return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t);
  }
  return false;
}

/**
 * If any non-empty X value is not a plain numeric literal, use a category scale.
 */
export function inferScatterXAxisType(
  rows: ScatterChartRow[],
  xKey: string
): 'number' | 'category' {
  let sawValue = false;
  for (const row of rows) {
    const v = row[xKey];
    if (v == null || (typeof v === 'string' && v.trim() === '')) continue;
    sawValue = true;
    if (!xValueLooksNumeric(v)) return 'category';
  }
  return sawValue ? 'number' : 'category';
}

function coerceFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Drops rows without a finite Y; coerces Y from numeric strings. X is left as-is
 * so category labels (strings) still flow to the category axis.
 */
export function buildScatterChartData(
  rows: ScatterChartRow[],
  xKey: string,
  yKey: string
): { rows: ScatterChartRow[]; xType: 'number' | 'category' } {
  const out: ScatterChartRow[] = [];
  for (const row of rows) {
    const y = coerceFiniteNumber(row[yKey]);
    if (y == null) continue;
    out.push({ ...row, [yKey]: y });
  }
  return {
    rows: out,
    xType: inferScatterXAxisType(out, xKey),
  };
}
