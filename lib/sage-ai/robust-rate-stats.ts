/**
 * Consistent "normal" rate statistics for Sage AI: unit-weighted mean and median
 * after optional IQR outlier removal (same rules as `aggregate_properties_v2`).
 */

const DEFAULT_MIN_RATED_FOR_IQR = 4;
const DEFAULT_IQR_MULTIPLIER = 1.5;

function percentileLinear(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

/**
 * IQR fences on a list of **positive** effective rates. Returns `null` when
 * outlier rules should be skipped: fewer than `minRatedForIqr` values, or
 * IQR = 0 (or non-finite quartiles).
 */
export function iqrFences(
  values: number[],
  options?: { minRatedForIqr?: number; k?: number }
): { low: number; high: number; q1: number; q3: number; iqr: number } | null {
  const minRated = options?.minRatedForIqr ?? DEFAULT_MIN_RATED_FOR_IQR;
  const k = options?.k ?? DEFAULT_IQR_MULTIPLIER;
  const xs = values.filter((v) => v > 0 && Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length < minRated) return null;
  const q1 = percentileLinear(xs, 0.25);
  const q3 = percentileLinear(xs, 0.75);
  if (!Number.isFinite(q1) || !Number.isFinite(q3)) return null;
  const iqr = q3 - q1;
  if (iqr <= 0) return null;
  return { low: q1 - k * iqr, high: q3 + k * iqr, q1, q3, iqr };
}

export interface RateRow {
  eff: number;
  w: number;
}

export interface RobustRateResult {
  avg: number | null;
  /** Median of per-row eff values in the set used for `avg` (same IQR window). */
  median: number | null;
  ratedCount: number;
  /** How many of `ratedCount` were used in mean/median after IQR. */
  usedInRobust: number;
  /** How many rated rows were excluded as outliers; 0 if IQR was not applied. */
  droppedAsOutliers: number;
  /** IQR not applied: small n, zero IQR, or no subset survived (reverted to all rated). */
  outlierFilterSkipped: boolean;
}

function finalize(
  kept: readonly RateRow[],
  ratedCount: number,
  dropped: number,
  outlierFilterSkipped: boolean
): RobustRateResult {
  if (kept.length === 0) {
    return {
      avg: null,
      median: null,
      ratedCount,
      usedInRobust: 0,
      droppedAsOutliers: dropped,
      outlierFilterSkipped,
    };
  }
  const sw = kept.reduce((s, r) => s + r.w, 0);
  const num = kept.reduce((s, r) => s + r.eff * r.w, 0);
  const effs = [...kept.map((r) => r.eff)].sort((a, b) => a - b);
  const mid = Math.floor(effs.length / 2);
  const med =
    effs.length % 2 === 1
      ? effs[mid]!
      : (effs[mid - 1]! + effs[mid]!) / 2;
  return {
    avg: sw > 0 ? num / sw : null,
    median: med,
    ratedCount,
    usedInRobust: kept.length,
    droppedAsOutliers: dropped,
    outlierFilterSkipped,
  };
}

/**
 * Count-unique (single-scope) and display copy share this: unit-weighted mean
 * and median of per-row `eff` after IQR, with fallback to all rated rows if
 * the fence would exclude every row.
 */
export function robustGlampingRateStats(
  rows: readonly RateRow[],
  options?: { minRatedForIqr?: number; k?: number }
): RobustRateResult {
  const minRated = options?.minRatedForIqr ?? DEFAULT_MIN_RATED_FOR_IQR;
  const k = options?.k ?? DEFAULT_IQR_MULTIPLIER;
  const rated: RateRow[] = [];
  for (const { eff, w } of rows) {
    if (!(eff > 0 && Number.isFinite(eff))) continue;
    const weight = w > 0 && Number.isFinite(w) ? w : 1;
    rated.push({ eff, w: weight });
  }
  const n = rated.length;
  if (n === 0) {
    return {
      avg: null,
      median: null,
      ratedCount: 0,
      usedInRobust: 0,
      droppedAsOutliers: 0,
      outlierFilterSkipped: true,
    };
  }

  const effs = rated.map((r) => r.eff);
  const fences = iqrFences(effs, { minRatedForIqr: minRated, k });
  if (fences == null) {
    return finalize(rated, n, 0, true);
  }

  let kept = rated.filter((r) => r.eff >= fences.low && r.eff <= fences.high);
  let outlierFilterSkipped = false;
  if (kept.length === 0) {
    kept = rated;
    outlierFilterSkipped = true;
  }
  const dropped = outlierFilterSkipped && kept.length === n ? 0 : n - kept.length;
  return finalize(kept, n, dropped, outlierFilterSkipped);
}
