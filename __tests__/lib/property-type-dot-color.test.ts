import {
  PROPERTY_TYPE_DOT_COLORS,
  getPropertyTypeDotColor,
} from '@/lib/property-type-dot-color';

describe('getPropertyTypeDotColor', () => {
  it('returns canonical colors for form values', () => {
    expect(getPropertyTypeDotColor('Glamping')).toBe(PROPERTY_TYPE_DOT_COLORS.Glamping);
    expect(getPropertyTypeDotColor('RV Resort')).toBe(PROPERTY_TYPE_DOT_COLORS['RV Resort']);
    expect(getPropertyTypeDotColor('RV Park')).toBe(PROPERTY_TYPE_DOT_COLORS['RV Park']);
    expect(getPropertyTypeDotColor('Marina')).toBe(PROPERTY_TYPE_DOT_COLORS.Marina);
  });

  it('maps legacy labels via keyword fallback', () => {
    expect(getPropertyTypeDotColor('Glamping Resort')).toBe(PROPERTY_TYPE_DOT_COLORS.Glamping);
    expect(getPropertyTypeDotColor('Luxury Campground')).toBe(PROPERTY_TYPE_DOT_COLORS.Campground);
    expect(getPropertyTypeDotColor('Desert RV Park')).toBe(PROPERTY_TYPE_DOT_COLORS['RV Park']);
  });

  it('returns neutral for empty or unknown', () => {
    expect(getPropertyTypeDotColor('')).toBe(PROPERTY_TYPE_DOT_COLORS.Unknown);
    expect(getPropertyTypeDotColor('Treehouse Resort')).toBe(PROPERTY_TYPE_DOT_COLORS.Unknown);
  });
});
