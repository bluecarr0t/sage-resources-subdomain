import {
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
});
