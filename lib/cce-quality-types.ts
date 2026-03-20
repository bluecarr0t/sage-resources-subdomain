/**
 * Quality type normalization for CCE Cost Explorer.
 * Maps raw PDF values to canonical display options and supports filter expansion.
 */

/** Canonical quality tiers (primary dropdown options) in display order, high to low */
export const QUALITY_TIER_CANONICAL = [
  'Excellent',
  'Very Good',
  'Good',
  'Average',
  'Fair',
  'Low cost',
] as const;

/** Maps raw DB values to canonical form (case-insensitive, handles variants) */
const VARIANT_TO_CANONICAL: Record<string, string> = {
  // Excellent
  excellent: 'Excellent',

  // Very Good
  'very good': 'Very Good',
  verygood: 'Very Good',

  // Good
  good: 'Good',
  'good storage/ mechanical': 'Good',
  'good storage/mechanical': 'Good',

  // Average
  average: 'Average',
  'average storage': 'Average',

  // Fair
  fair: 'Fair',

  // Low cost
  'low cost': 'Low cost',
  'low-cost': 'Low cost',
  'low cost storage': 'Low cost',
  'low-cost storage': 'Low cost',

  // Cheap / Low → consolidate to Low cost for cleaner dropdown
  cheap: 'Low cost',
  low: 'Low cost',

  // Finish types → map to closest tier
  finished: 'Good',
  'finished, high-value': 'Excellent',
  'finished, high-value ': 'Excellent',
  'game room, finished': 'Good',
  'semi-finished': 'Average',
  unfinished: 'Fair',
  'unfinished storage': 'Fair',
  'unfin/util': 'Fair',

  // Functional types → map to tier
  display: 'Good',
  office: 'Good',
  parking: 'Fair',
  'residential units': 'Good',
};

/** Roman numerals (construction classes) → map to Average tier */
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * Normalize a raw quality type to its canonical form.
 */
export function toCanonicalQualityType(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (VARIANT_TO_CANONICAL[key]) return VARIANT_TO_CANONICAL[key];
  if (ROMAN_NUMERALS.includes(raw.trim())) return 'Average';
  // Unknown: return as-is (will appear in "Other" or we use it directly)
  return raw.trim();
}

/**
 * Get canonical quality types that exist in the given raw list.
 * Returns a deduplicated, sorted list for the dropdown.
 * Only returns known canonical tiers (filters out unmapped/unknown values).
 */
export function getCanonicalQualityTypes(rawValues: string[]): string[] {
  const canonicalSet = new Set(QUALITY_TIER_CANONICAL);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of rawValues) {
    const canonical = toCanonicalQualityType(raw);
    if (canonical && !seen.has(canonical) && canonicalSet.has(canonical as (typeof QUALITY_TIER_CANONICAL)[number])) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  // Sort by QUALITY_TIER_CANONICAL order
  return result.sort((a, b) => {
    const ai = QUALITY_TIER_CANONICAL.indexOf(a as (typeof QUALITY_TIER_CANONICAL)[number]);
    const bi = QUALITY_TIER_CANONICAL.indexOf(b as (typeof QUALITY_TIER_CANONICAL)[number]);
    return ai - bi;
  });
}

/** Reverse map: canonical → raw DB values (for filter expansion). Includes common case variants. */
const CANONICAL_TO_VARIANTS: Record<string, string[]> = {
  Excellent: ['Excellent', 'excellent', 'Finished, high-value', 'Finished, high-value ', 'finished, high-value'],
  'Very Good': ['Very Good', 'Very good', 'very good', 'VERY GOOD'],
  Good: [
    'Good',
    'good',
    'Finished',
    'finished',
    'Game room, finished',
    'Display',
    'display',
    'Office',
    'office',
    'Residential Units',
    'residential units',
    'Good storage/ mechanical',
    'Good storage/mechanical',
    'good storage/ mechanical',
  ],
  Average: [
    'Average',
    'average',
    'Average storage',
    'average storage',
    'Semi-finished',
    'semi-finished',
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
  ],
  Fair: [
    'Fair',
    'fair',
    'Unfinished',
    'unfinished',
    'Unfinished storage',
    'unfinished storage',
    'Unfin/Util',
    'unfin/util',
    'Parking',
    'parking',
  ],
  'Low cost': [
    'Low cost',
    'Low-cost',
    'Low-cost storage',
    'Low cost storage',
    'low cost',
    'low-cost',
    'low-cost storage',
    'Cheap',
    'cheap',
    'Low',
    'low',
  ],
};

/**
 * Expand a canonical quality type to all DB values that map to it.
 * Use when filtering so "Very Good" matches both "Very Good" and "Very good".
 */
export function expandQualityTypeForFilter(canonical: string): string[] {
  const variants = CANONICAL_TO_VARIANTS[canonical];
  return variants && variants.length > 0 ? variants : [canonical];
}

/** Site Builder display tiers (Budget → Ultra Luxury) mapped to CCE canonical for cost lookup */
const SITE_BUILDER_TO_CCE: Record<string, string> = {
  Budget: 'Low cost',
  Economy: 'Fair',
  'Mid-Range': 'Average',
  Premium: 'Good',
  Luxury: 'Very Good',
  'Ultra Luxury': 'Excellent',
};

/**
 * Map Site Builder quality tier (Budget → Ultra Luxury) to CCE canonical for cost lookup.
 * Falls back to input if unknown.
 */
export function mapSiteBuilderQualityToCce(displayTier: string): string {
  return SITE_BUILDER_TO_CCE[displayTier] ?? displayTier;
}
