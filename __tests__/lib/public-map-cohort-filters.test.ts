import {
  isExcludedPropertyTypeForPublicMap,
  PUBLIC_MAP_EXCLUDED_PROPERTY_TYPES,
} from '@/lib/public-map-cohort-filters';

describe('public-map-cohort-filters', () => {
  it('excludes Campground and RV Resort only', () => {
    expect(PUBLIC_MAP_EXCLUDED_PROPERTY_TYPES).toEqual(['Campground', 'RV Resort']);
    expect(isExcludedPropertyTypeForPublicMap('Campground')).toBe(true);
    expect(isExcludedPropertyTypeForPublicMap('RV Resort')).toBe(true);
    expect(isExcludedPropertyTypeForPublicMap('Glamping')).toBe(false);
    expect(isExcludedPropertyTypeForPublicMap('Outdoor Boutique Hotel')).toBe(false);
    expect(isExcludedPropertyTypeForPublicMap(null)).toBe(false);
    expect(isExcludedPropertyTypeForPublicMap('')).toBe(false);
    expect(isExcludedPropertyTypeForPublicMap('  Campground  ')).toBe(true);
  });
});
