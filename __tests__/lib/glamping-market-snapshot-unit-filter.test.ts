import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';

describe('isExcludedGlampingMarketSnapshotUnitType', () => {
  it('excludes RV and vehicle unit types', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('RV Site')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('rv sites')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Vehicles')).toBe(true);
  });

  it('excludes tent sites and plain tent inventory', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('Tent Site')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('tent sites')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Tent')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('tents')).toBe(true);
  });

  it('keeps structure and glamping tent product types', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('Safari Tent')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Bell Tent')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Glamping Tent')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Yurt')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Cabin')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Canvas Tent')).toBe(false);
  });

  it('returns false for blank unit type', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType(null)).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('')).toBe(false);
  });
});
