import {
  createGlampingAmenityPropertiesFoldState,
  finalizeGlampingAmenityPropertiesFoldState,
  foldGlampingAmenityPropertyRows,
  rowPassesGlampingAmenityCohort,
} from '@/lib/glamping-industry-overview/glamping-amenity-properties-chart-data';

describe('rowPassesGlampingAmenityCohort', () => {
  it('allows Sage rows with ARDR but no occupancy', () => {
    expect(
      rowPassesGlampingAmenityCohort({
        property_name: 'A',
        city: 'X',
        state: 'OR',
        occupancy_rate_2025: null,
        avg_retail_daily_rate_2025: '200',
        unit_hot_tub: 'Yes',
        property_hot_tub: null,
        unit_sauna: null,
        property_sauna: null,
        pool: null,
        hot_tub_sauna: null,
      })
    ).toBe(true);
  });
});

describe('foldGlampingAmenityPropertyRows', () => {
  it('tracks unit vs property hot tub and sauna separately', () => {
    const byProp = createGlampingAmenityPropertiesFoldState();
    foldGlampingAmenityPropertyRows(byProp, [
      {
        property_name: 'Alpine Retreat',
        city: 'Bend',
        state: 'OR',
        occupancy_rate_2025: null,
        avg_retail_daily_rate_2025: '250',
        unit_hot_tub: 'Yes',
        property_hot_tub: 'No',
        unit_sauna: 'No',
        property_sauna: 'Yes',
        pool: 'No',
        hot_tub_sauna: null,
      },
      {
        property_name: 'Alpine Retreat',
        city: 'Bend',
        state: 'OR',
        occupancy_rate_2025: null,
        avg_retail_daily_rate_2025: '275',
        unit_hot_tub: 'No',
        property_hot_tub: 'Yes',
        unit_sauna: 'Yes',
        property_sauna: 'No',
        pool: 'Yes',
        hot_tub_sauna: null,
      },
    ]);

    const rows = finalizeGlampingAmenityPropertiesFoldState(byProp);
    const pct = (key: string) => rows.find((r) => r.amenityKey === key)?.pct;

    expect(byProp.size).toBe(1);
    expect(pct('unit_hot_tub')).toBe(100);
    expect(pct('property_hot_tub')).toBe(100);
    expect(pct('unit_sauna')).toBe(100);
    expect(pct('property_sauna')).toBe(100);
    expect(pct('pool')).toBe(100);
    expect(pct('hot_tub_sauna')).toBe(0);
  });

  it('uses Hipcamp combined hot_tub_sauna only on that key', () => {
    const byProp = createGlampingAmenityPropertiesFoldState();
    foldGlampingAmenityPropertyRows(byProp, [
      {
        property_name: 'Hipcamp Camp',
        city: 'Austin',
        state: 'TX',
        occupancy_rate_2025: '55',
        avg_retail_daily_rate_2025: '180',
        unit_hot_tub: null,
        property_hot_tub: null,
        unit_sauna: null,
        property_sauna: null,
        pool: 'No',
        hot_tub_sauna: 'Yes',
      },
    ]);

    const rows = finalizeGlampingAmenityPropertiesFoldState(byProp);
    expect(rows.find((r) => r.amenityKey === 'hot_tub_sauna')?.pct).toBe(100);
    expect(rows.find((r) => r.amenityKey === 'unit_hot_tub')?.pct).toBe(0);
  });
});
