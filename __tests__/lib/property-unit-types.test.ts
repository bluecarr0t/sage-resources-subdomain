import {
  collectDistinctUnitTypes,
  formatUnitTypesDisplay,
} from '@/lib/property-unit-types';

describe('collectDistinctUnitTypes', () => {
  it('returns sorted unique non-empty unit types', () => {
    expect(
      collectDistinctUnitTypes([
        { unit_type: 'Tiny Home' },
        { unit_type: 'Tiny Home' },
        { unit_type: 'Airstream' },
      ])
    ).toEqual(['Airstream', 'Tiny Home']);
  });

  it('omits null and blank values', () => {
    expect(
      collectDistinctUnitTypes([
        { unit_type: 'Cabin' },
        { unit_type: null },
        { unit_type: '  ' },
      ])
    ).toEqual(['Cabin']);
  });
});

describe('formatUnitTypesDisplay', () => {
  it('formats two types with "and"', () => {
    expect(formatUnitTypesDisplay(['Airstream', 'Tiny Home'])).toBe(
      'Airstream and Tiny Home'
    );
  });

  it('returns null for empty input', () => {
    expect(formatUnitTypesDisplay([])).toBeNull();
  });
});
