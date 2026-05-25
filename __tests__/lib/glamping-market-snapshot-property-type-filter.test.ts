import {
  GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE,
  isGlampingMarketSnapshotPropertyType,
} from '@/lib/glamping-market-snapshot-property-type-filter';

describe('glamping-market-snapshot-property-type-filter', () => {
  it('includes only canonical Glamping property_type', () => {
    expect(GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE).toBe('Glamping');
    expect(isGlampingMarketSnapshotPropertyType('Glamping')).toBe(true);
    expect(isGlampingMarketSnapshotPropertyType('  Glamping  ')).toBe(true);
    expect(isGlampingMarketSnapshotPropertyType('Outdoor Boutique Hotel')).toBe(false);
    expect(isGlampingMarketSnapshotPropertyType('RV Resort')).toBe(false);
    expect(isGlampingMarketSnapshotPropertyType('Unknown')).toBe(false);
    expect(isGlampingMarketSnapshotPropertyType('Landscape Hotel')).toBe(false);
    expect(isGlampingMarketSnapshotPropertyType('Campground')).toBe(false);
    expect(isGlampingMarketSnapshotPropertyType(null)).toBe(false);
    expect(isGlampingMarketSnapshotPropertyType('')).toBe(false);
  });
});
