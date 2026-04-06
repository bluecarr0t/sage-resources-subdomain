/**
 * Shared parsing for campspot TEXT numeric columns.
 */

export function parseCampspotNumber(val: unknown): number | null {
  if (val == null || val === '') return null;
  let s = String(val).trim();
  if (!s || s.toLowerCase() === 'no data') return null;
  // US-formatted exports: $1,234.56 and thousands separators break parseFloat("1,234") → 1
  s = s.replace(/\$/g, '').replace(/,/g, '').replace(/\s+/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Normalize occupancy to 0–100 for averaging (fraction or percent). */
export function parseCampspotOccupancyPercent(raw: unknown): number | null {
  const n = parseCampspotNumber(raw);
  if (n == null || n < 0) return null;
  if (n <= 1) return n * 100;
  return n;
}

export function meanRounded(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = nums.reduce((a, b) => a + b, 0);
  return Math.round((s / nums.length) * 100) / 100;
}
