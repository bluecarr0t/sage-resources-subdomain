import {
  GLAMPING_EXCLUDED_UNIT_TYPES,
  HIPCAMP_GLAMPING_EXCLUDED_PROPERTY_TYPES,
  isExcludedGlampingUnitType,
  isHipcampRvDominantPropertyType,
} from '@/lib/market-report/load-cohort';

describe('isHipcampRvDominantPropertyType', () => {
  it('matches the canonical excluded property types', () => {
    expect(isHipcampRvDominantPropertyType('Vehicles')).toBe(true);
    expect(isHipcampRvDominantPropertyType('Rv Tent')).toBe(true);
    expect(isHipcampRvDominantPropertyType('Mixed Unit RV Resort')).toBe(true);
    expect(isHipcampRvDominantPropertyType('Rv Or Trailer')).toBe(true);
    expect(isHipcampRvDominantPropertyType('Airstream')).toBe(true);
    expect(isHipcampRvDominantPropertyType('Vintage Trailer')).toBe(true);
    expect(isHipcampRvDominantPropertyType('Van Bus')).toBe(true);
  });

  it('is case-insensitive and tolerates extra whitespace', () => {
    expect(isHipcampRvDominantPropertyType('vehicles')).toBe(true);
    expect(isHipcampRvDominantPropertyType('VEHICLES')).toBe(true);
    expect(isHipcampRvDominantPropertyType('  mixed   unit  RV  resort  ')).toBe(true);
    expect(isHipcampRvDominantPropertyType('RV Or Trailer')).toBe(true);
  });

  it('does NOT exclude glamping-friendly property types', () => {
    expect(isHipcampRvDominantPropertyType('Safari Tent')).toBe(false);
    expect(isHipcampRvDominantPropertyType('Cabin')).toBe(false);
    expect(isHipcampRvDominantPropertyType('Yurt')).toBe(false);
    expect(isHipcampRvDominantPropertyType('Mixed Unit Glamping Resort')).toBe(false);
    expect(isHipcampRvDominantPropertyType('Treehouse')).toBe(false);
    expect(isHipcampRvDominantPropertyType('Glamping Pod')).toBe(false);
    expect(isHipcampRvDominantPropertyType('Tents')).toBe(false);
    expect(isHipcampRvDominantPropertyType('Canvas Tent')).toBe(false);
  });

  it('returns false for empty / null / undefined / whitespace input', () => {
    expect(isHipcampRvDominantPropertyType(null)).toBe(false);
    expect(isHipcampRvDominantPropertyType(undefined)).toBe(false);
    expect(isHipcampRvDominantPropertyType('')).toBe(false);
    expect(isHipcampRvDominantPropertyType('   ')).toBe(false);
  });

  it('returns false for "Unknown" so we keep ambiguous rows in the cohort', () => {
    // "Unknown" is the most common Hipcamp property_type (~17k rows). Excluding
    // these would drop a huge slice of legitimate glamping inventory; we'd
    // rather keep them and let the unit_type breakdown surface any oddities.
    expect(isHipcampRvDominantPropertyType('Unknown')).toBe(false);
  });

  it('exports a normalized set with the expected size', () => {
    expect(HIPCAMP_GLAMPING_EXCLUDED_PROPERTY_TYPES.size).toBe(7);
  });
});

describe('isExcludedGlampingUnitType', () => {
  it('excludes RV / vehicle unit types from glamping rollups', () => {
    expect(isExcludedGlampingUnitType('Vehicles')).toBe(true);
    expect(isExcludedGlampingUnitType('Vehicle')).toBe(true);
    expect(isExcludedGlampingUnitType('RV Site')).toBe(true);
    expect(isExcludedGlampingUnitType('RV Sites')).toBe(true);
  });

  it('is case-insensitive and tolerates extra whitespace', () => {
    expect(isExcludedGlampingUnitType('vehicles')).toBe(true);
    expect(isExcludedGlampingUnitType('vehicle')).toBe(true);
    expect(isExcludedGlampingUnitType('  rv   site  ')).toBe(true);
  });

  it('does not exclude typical glamping unit types', () => {
    expect(isExcludedGlampingUnitType('Cabin')).toBe(false);
    expect(isExcludedGlampingUnitType('Yurt')).toBe(false);
    expect(isExcludedGlampingUnitType('Safari Tent')).toBe(false);
  });

  it('exports a normalized set with the expected size', () => {
    expect(GLAMPING_EXCLUDED_UNIT_TYPES.size).toBe(4);
  });
});
