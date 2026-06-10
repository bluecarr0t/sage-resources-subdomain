import {
  glampingMarketSnapshotUnitsForRow,
  parseGlampingMarketSnapshotPositiveNumber,
} from '@/lib/glamping-market-snapshot/site-units-for-row';

describe('glampingMarketSnapshotUnitsForRow', () => {
  it('prefers quantity_of_units over property_total_sites', () => {
    expect(
      glampingMarketSnapshotUnitsForRow({
        quantity_of_units: 4,
        property_total_sites: 10,
      })
    ).toBe(4);
  });

  it('falls back to property_total_sites when quantity is missing', () => {
    expect(
      glampingMarketSnapshotUnitsForRow({
        quantity_of_units: null,
        property_total_sites: '12',
      })
    ).toBe(12);
  });

  it('returns 0 when both counts are missing', () => {
    expect(glampingMarketSnapshotUnitsForRow({})).toBe(0);
  });

  it('parses currency-formatted strings', () => {
    expect(parseGlampingMarketSnapshotPositiveNumber('$1,250')).toBe(1250);
  });
});
