import {
  PROPERTY_SLUGS_WITHOUT_GOOGLE_PLACES,
  shouldSkipGooglePlacesForPropertySlug,
} from '@/lib/property-google-places-policy';

describe('property-google-places-policy', () => {
  it('skips Google Places for Collinswood Retreat', () => {
    expect(shouldSkipGooglePlacesForPropertySlug('collinswood-retreat')).toBe(true);
    expect(PROPERTY_SLUGS_WITHOUT_GOOGLE_PLACES.has('collinswood-retreat')).toBe(true);
  });

  it('allows Google Places for other slugs', () => {
    expect(shouldSkipGooglePlacesForPropertySlug('some-other-camp')).toBe(false);
  });
});
