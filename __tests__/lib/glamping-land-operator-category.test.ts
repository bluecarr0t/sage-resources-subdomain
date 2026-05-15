import {
  isExcludedLandOperatorForPublicMap,
  isValidLandOperatorCategory,
  PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR,
} from '@/lib/glamping-land-operator-category';

describe('glamping-land-operator-category', () => {
  it('defines a stable PostgREST OR for private commercial cohort', () => {
    expect(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR).toBe(
      'land_operator_category.is.null,land_operator_category.eq.private_commercial',
    );
  });

  it('validates known categories', () => {
    expect(isValidLandOperatorCategory('private_commercial')).toBe(true);
    expect(isValidLandOperatorCategory('state_park')).toBe(true);
    expect(isValidLandOperatorCategory('federal_public')).toBe(true);
    expect(isValidLandOperatorCategory('other_public')).toBe(true);
    expect(isValidLandOperatorCategory('State Park')).toBe(false);
    expect(isValidLandOperatorCategory('')).toBe(false);
  });

  it('excludes only public-land categories from map/comps', () => {
    expect(isExcludedLandOperatorForPublicMap(null)).toBe(false);
    expect(isExcludedLandOperatorForPublicMap(undefined)).toBe(false);
    expect(isExcludedLandOperatorForPublicMap('')).toBe(false);
    expect(isExcludedLandOperatorForPublicMap('private_commercial')).toBe(false);
    expect(isExcludedLandOperatorForPublicMap('state_park')).toBe(true);
    expect(isExcludedLandOperatorForPublicMap('federal_public')).toBe(true);
    expect(isExcludedLandOperatorForPublicMap('other_public')).toBe(true);
  });
});
