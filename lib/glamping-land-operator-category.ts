/**
 * Land tenure / operator class for `all_sage_data.land_operator_category`.
 * Null = unset (treated like private commercial for public map + private comps cohorts).
 */

export const LAND_OPERATOR_CATEGORY_VALUES = [
  'private_commercial',
  'state_park',
  'federal_public',
  'other_public',
] as const;

export type LandOperatorCategory = (typeof LAND_OPERATOR_CATEGORY_VALUES)[number];

/** PostgREST `.or(...)` — rows included on the public map and in private commercial glamping comps. */
export const PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR =
  'land_operator_category.is.null,land_operator_category.eq.private_commercial';

export function isValidLandOperatorCategory(value: string): value is LandOperatorCategory {
  return (LAND_OPERATOR_CATEGORY_VALUES as readonly string[]).includes(value);
}

/** State / federal / other public — excluded from consumer map and private commercial comps. */
export function isExcludedLandOperatorForPublicMap(value: unknown): boolean {
  const v = typeof value === 'string' ? value.trim() : '';
  return v === 'state_park' || v === 'federal_public' || v === 'other_public';
}
