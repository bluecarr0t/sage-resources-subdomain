/**
 * Column-level privacy for all_glamping_properties
 *
 * Only columns displayed on the Map (and its InfoWindow) are exposed via the public API.
 * Everything else is private. Add columns here only when the Map needs to display them.
 *
 * Map uses:
 * - List: id, property_name, lat, lon, state, country, unit_type, rate_category
 * - InfoWindow: + site_name, address, city, slug, google_rating, google_user_rating_total, google_photos
 */

export const PUBLIC_COLUMNS = new Set([
  // Map markers & InfoWindow
  'id',
  'property_name',
  'site_name',
  'address',
  'city',
  'state',
  'country',
  'lat',
  'lon',
  'unit_type',
  'rate_category',
  'slug',
  // Google Places (InfoWindow photos & ratings)
  'google_rating',
  'google_user_rating_total',
  'google_photos',
]);

/**
 * Check if a requested field is allowed for public access.
 */
export function isPublicColumn(column: string): boolean {
  return PUBLIC_COLUMNS.has(column);
}

/**
 * Filter requested fields to only those that are public.
 */
export function filterRequestedFieldsToPublic(fields: string[]): string[] {
  return fields.filter(isPublicColumn);
}

/**
 * Strip private columns from a property object.
 * Use when returning data from the public API.
 */
export function filterToPublicColumns<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PUBLIC_COLUMNS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered as Partial<T>;
}

/**
 * Strip private columns from an array of property objects.
 */
export function filterPropertiesToPublicColumns<T extends Record<string, unknown>>(
  items: T[]
): Partial<T>[] {
  return items.map(filterToPublicColumns);
}
