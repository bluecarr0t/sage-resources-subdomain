import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';

describe('isExcludedGlampingMarketSnapshotUnitType', () => {
  it('excludes RV and vehicle unit types', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('RV Site')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('rv sites')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Vehicles')).toBe(true);
  });

  it('excludes tent sites, plain tent inventory, and retired Canvas Tent', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('Tent Site')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('tent sites')).toBe(true);
    // Legacy bare Tent/Tents rows stay excluded; ambiguous labels normalize to null.
    expect(isExcludedGlampingMarketSnapshotUnitType('Tent')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('tents')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Canvas Tent')).toBe(true);
  });

  it('excludes campsite, bare RV, hotel room, and bare trailer inventory', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('Campsite')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Camping')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('camp site')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('RV')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('RVs')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Hotel Room')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('hotel rooms')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Trailer')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('trailers')).toBe(true);
  });

  it('excludes hotel-style suite and property buyout inventory', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('Suite')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Suites')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('Property buyout')).toBe(true);
    expect(isExcludedGlampingMarketSnapshotUnitType('property buy-outs')).toBe(true);
  });

  it('keeps structure and glamping tent product types', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType('Safari Tent')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Bell Tent')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Cabin Tent')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Yurt')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Cabin')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Vintage Trailer')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Airstream')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Teardrop trailer')).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('Eco-suite')).toBe(false);
  });

  it('returns false for blank unit type', () => {
    expect(isExcludedGlampingMarketSnapshotUnitType(null)).toBe(false);
    expect(isExcludedGlampingMarketSnapshotUnitType('')).toBe(false);
  });
});
