import { UNIT_TYPE_DOT_COLORS, getUnitTypeDotColor } from '@/lib/unit-type-dot-color';

describe('getUnitTypeDotColor', () => {
  it('returns colors for canonical labels', () => {
    expect(getUnitTypeDotColor('Safari Tent')).toBe(UNIT_TYPE_DOT_COLORS['Safari Tent']);
    expect(getUnitTypeDotColor('Yurt')).toBe(UNIT_TYPE_DOT_COLORS.Yurt);
    expect(getUnitTypeDotColor('Dome')).toBe(UNIT_TYPE_DOT_COLORS.Dome);
  });

  it('uses the first segment of compound unit_type strings', () => {
    expect(getUnitTypeDotColor('Safari Tent, Yurt')).toBe(UNIT_TYPE_DOT_COLORS['Safari Tent']);
  });

  it('normalizes legacy aliases before lookup', () => {
    expect(getUnitTypeDotColor('safari tents')).toBe(UNIT_TYPE_DOT_COLORS['Safari Tent']);
    expect(getUnitTypeDotColor('geodesic dome')).toBe(UNIT_TYPE_DOT_COLORS.Dome);
  });

  it('falls back via keywords for unrecognized labels', () => {
    expect(getUnitTypeDotColor('Custom Treehouse Suite')).toBe(UNIT_TYPE_DOT_COLORS.Treehouse);
  });

  it('returns neutral for empty or unknown', () => {
    expect(getUnitTypeDotColor('')).toBe('#a8a29e');
    expect(getUnitTypeDotColor('2 unit types')).toBe('#a8a29e');
  });
});
