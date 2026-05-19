import {
  normalizeGlampingUnitTypeForDisplay,
  normalizeGlampingUnitTypeForStorage,
  primaryGlampingUnitTypeSegment,
} from '@/lib/glamping-unit-type-normalize';

describe('primaryGlampingUnitTypeSegment', () => {
  it('takes the first comma-separated label', () => {
    expect(primaryGlampingUnitTypeSegment('Safari Tent, Cabin')).toBe('Safari Tent');
  });

  it('takes the first slash-separated label', () => {
    expect(primaryGlampingUnitTypeSegment('Yurt / Dome')).toBe('Yurt');
  });

  it('takes the first "and"-separated label', () => {
    expect(primaryGlampingUnitTypeSegment('Safari Tent and Treehouse')).toBe('Safari Tent');
  });
});

describe('normalizeGlampingUnitTypeForStorage', () => {
  it('returns null for empty input', () => {
    expect(normalizeGlampingUnitTypeForStorage(null)).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('')).toBeNull();
    expect(normalizeGlampingUnitTypeForStorage('   ')).toBeNull();
  });

  it('uses known phrase map (plural to singular)', () => {
    expect(normalizeGlampingUnitTypeForStorage('safari tents')).toBe('Safari Tent');
    expect(normalizeGlampingUnitTypeForStorage('yurts')).toBe('Yurt');
  });

  it('keeps only the first segment then normalizes', () => {
    expect(normalizeGlampingUnitTypeForStorage('Luxury Tent, Cabin')).toBe('Luxury Tent');
    expect(normalizeGlampingUnitTypeForStorage('Safari Tents, Yurts')).toBe('Safari Tent');
  });

  it('title-cases unknown two-word plurals', () => {
    expect(normalizeGlampingUnitTypeForStorage('Beach Cabins')).toBe('Beach Cabin');
  });

  it('formats A-Frame and RV Site', () => {
    expect(normalizeGlampingUnitTypeForStorage('a-frames')).toBe('A-Frame');
    expect(normalizeGlampingUnitTypeForStorage('rv sites')).toBe('RV Site');
  });

  it('maps wagon aliases to Covered Wagon (not generic Wagon)', () => {
    expect(normalizeGlampingUnitTypeForStorage('Wagon')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('wagons')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('covered wagon')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('Conestoga Wagons')).toBe('Covered Wagon');
    expect(normalizeGlampingUnitTypeForStorage('wagonette')).toBe('Wagonette');
  });

  it('maps geodesic dome and geodome aliases to Dome', () => {
    expect(normalizeGlampingUnitTypeForStorage('geodesic dome')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForStorage('Geodesic Domes')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForStorage('geodome')).toBe('Dome');
  });
});

describe('normalizeGlampingUnitTypeForDisplay', () => {
  it('canonicalizes merged Sage matview unit text', () => {
    expect(normalizeGlampingUnitTypeForDisplay('Geodesic Dome Glamping Resort')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForDisplay('geodesic dome glamping')).toBe('Dome');
    expect(normalizeGlampingUnitTypeForDisplay('Safari Tent Glamping Resort')).toBe('Safari Tent');
  });

  it('extracts multiple main unit types from compound strings', () => {
    expect(normalizeGlampingUnitTypeForDisplay('Tiny Home Casita Cabins')).toBe('Tiny Home, Cabin');
    expect(normalizeGlampingUnitTypeForDisplay('Safari Tent, Yurt')).toBe('Safari Tent, Yurt');
    expect(normalizeGlampingUnitTypeForDisplay('Cabin and Treehouse')).toBe('Cabin, Treehouse');
  });

  it('falls back to storage normalization for simple labels', () => {
    expect(normalizeGlampingUnitTypeForDisplay('yurts')).toBe('Yurt');
    expect(normalizeGlampingUnitTypeForDisplay('2 unit types')).toBe('2 Unit Types');
    expect(normalizeGlampingUnitTypeForDisplay('Bell Tent')).toBe('Bell Tent');
  });
});
