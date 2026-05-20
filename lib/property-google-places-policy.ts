/**
 * Properties where Google Places text search returns the wrong business (e.g. Hipcamp-only sites).
 * Use Sage-hosted images instead; do not fetch or show Google ratings/reviews.
 */
export const PROPERTY_SLUGS_WITHOUT_GOOGLE_PLACES = new Set(['collinswood-retreat']);

export function shouldSkipGooglePlacesForPropertySlug(slug: string): boolean {
  return PROPERTY_SLUGS_WITHOUT_GOOGLE_PLACES.has(slug.trim().toLowerCase());
}
