/**
 * How a published `rate_avg_retail_daily_rate` should be interpreted in aggregates.
 * Keep the quoted number on the row; use this field to decide comparable market ARDR.
 */

export const GLAMPING_RATE_BASIS_VALUES = [
  'room_only',
  'breakfast',
  'half_board',
  'full_board',
  'all_inclusive',
  'unknown',
] as const;

export type GlampingRateBasis = (typeof GLAMPING_RATE_BASIS_VALUES)[number];

const RATE_BASIS_SET = new Set<string>(GLAMPING_RATE_BASIS_VALUES);

export function normalizeGlampingRateBasis(
  value: string | null | undefined
): GlampingRateBasis {
  const raw = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, '_and_')
    .replace(/[\s-]+/g, '_');
  if (!raw) return 'unknown';
  if (RATE_BASIS_SET.has(raw)) return raw as GlampingRateBasis;
  if (raw === 'bb' || raw === 'b_and_b' || raw === 'bed_and_breakfast') return 'breakfast';
  if (raw === 'package' || raw === 'all_in' || raw === 'inclusive') return 'all_inclusive';
  return 'unknown';
}

/**
 * Default market ARDR (overview mean/median, Unit Type by Rate, proximity,
 * amenity impact): exclude package / all-inclusive rates so they do not dominate
 * unit-weighted means. Unknown and meal-board rates remain included until coverage
 * is strong enough to tighten further.
 */
export function isComparableMarketArdrRateBasis(
  value: string | null | undefined
): boolean {
  return normalizeGlampingRateBasis(value) !== 'all_inclusive';
}
