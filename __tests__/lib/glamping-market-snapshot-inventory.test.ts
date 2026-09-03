import { sumGlampingMarketSnapshotInventoryUnits } from '@/lib/glamping-market-snapshot-inventory';

describe('sumGlampingMarketSnapshotInventoryUnits', () => {
  it('sums quantity_of_units across included rows (same as market overview)', () => {
    expect(
      sumGlampingMarketSnapshotInventoryUnits([
        {
          property_type: 'Glamping',
          unit_type: 'Safari Tent',
          is_open: 'Yes',
          quantity_of_units: 10,
        },
        {
          property_type: 'Glamping',
          unit_type: 'Cabin',
          is_open: 'Under Construction',
          quantity_of_units: 4,
        },
      ])
    ).toBe(14);
  });

  it('counts proposed inventory and skips cancelled', () => {
    expect(
      sumGlampingMarketSnapshotInventoryUnits([
        {
          property_type: 'Glamping',
          unit_type: 'Yurt',
          is_open: 'Proposed Development',
          quantity_of_units: 6,
        },
        {
          property_type: 'Glamping',
          unit_type: 'Yurt',
          is_open: 'Cancelled',
          quantity_of_units: 20,
        },
      ])
    ).toBe(6);
  });

  it('omits excluded unit types and non-Glamping property types', () => {
    expect(
      sumGlampingMarketSnapshotInventoryUnits([
        {
          property_type: 'Glamping',
          unit_type: 'RV',
          is_open: 'Yes',
          quantity_of_units: 50,
        },
        {
          property_type: 'Campground',
          unit_type: 'Safari Tent',
          is_open: 'Yes',
          quantity_of_units: 8,
        },
        {
          property_type: 'Glamping',
          unit_type: 'Safari Tent',
          is_open: 'Yes',
          quantity_of_units: 3,
        },
      ])
    ).toBe(3);
  });

  it('falls back to property_total_sites when quantity is missing', () => {
    expect(
      sumGlampingMarketSnapshotInventoryUnits([
        {
          property_type: 'Glamping',
          unit_type: 'Tiny Home',
          is_open: 'Yes',
          property_total_sites: 12,
        },
      ])
    ).toBe(12);
  });
});
