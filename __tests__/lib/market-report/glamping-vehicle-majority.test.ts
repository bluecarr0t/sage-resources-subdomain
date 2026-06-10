import {
  filterGlampingMajorityVehicleInventoryRows,
  filterHipcampMajorityTentSiteProperties,
} from '@/lib/market-report/load-cohort';
import type { CohortPropertyRow } from '@/lib/market-report/types';

function hipRow(partial: Partial<CohortPropertyRow> & Pick<CohortPropertyRow, 'unit_type' | 'quantity_of_units'>): CohortPropertyRow {
  return {
    source: 'hipcamp',
    sourceId: partial.sourceId ?? 'x',
    geo_lat: partial.geo_lat ?? 44,
    geo_lng: partial.geo_lng ?? -121,
    property_name: partial.property_name ?? 'Camp',
    city: partial.city ?? 'Bend',
    state: partial.state ?? 'OR',
    property_type: partial.property_type ?? 'Glamping',
    unit_type: partial.unit_type,
    property_total_sites: partial.property_total_sites ?? null,
    quantity_of_units: partial.quantity_of_units,
    distance_miles: partial.distance_miles ?? 5,
    rate_avg: partial.rate_avg ?? 100,
    winter_weekday: null,
    winter_weekend: null,
    spring_weekday: null,
    spring_weekend: null,
    summer_weekday: null,
    summer_weekend: null,
    fall_weekday: null,
    fall_weekend: null,
    occupancy: null,
    operating_season_months: null,
    url: null,
    raw: null,
  };
}

describe('filterGlampingMajorityVehicleInventoryRows', () => {
  it('drops Hipcamp property that is 100% Vehicles rows (Festival Fun style)', () => {
    const rows = [
      hipRow({
        sourceId: '1',
        property_name: 'Festival Fun',
        city: 'Redmond',
        state: 'OR',
        unit_type: 'Vehicles',
        quantity_of_units: 42,
      }),
    ];
    const out = filterGlampingMajorityVehicleInventoryRows(rows);
    expect(out).toHaveLength(0);
  });

  it('drops when vehicle / RV pad share is ≥50%', () => {
    const rows = [
      hipRow({ sourceId: '1', unit_type: 'Vehicles', quantity_of_units: 10 }),
      hipRow({ sourceId: '2', unit_type: 'Yurt', quantity_of_units: 10 }),
    ];
    const out = filterGlampingMajorityVehicleInventoryRows(rows);
    expect(out).toHaveLength(0);
  });

  it('keeps when vehicle share is below 50%', () => {
    const rows = [
      hipRow({ sourceId: '1', unit_type: 'RV Site', quantity_of_units: 4 }),
      hipRow({ sourceId: '2', unit_type: 'Bell Tent', quantity_of_units: 10 }),
    ];
    const out = filterGlampingMajorityVehicleInventoryRows(rows);
    expect(out).toHaveLength(2);
  });

  it('applies the same majority logic to Sage glamping rows', () => {
    const sage: CohortPropertyRow = {
      source: 'all_sage_data',
      sourceId: '9',
      geo_lat: 44,
      geo_lng: -121,
      property_name: 'Sage Vehicle Park',
      city: 'Bend',
      state: 'OR',
      property_type: null,
      unit_type: 'Vehicles',
      property_total_sites: 42,
      quantity_of_units: 42,
      distance_miles: 1,
      rate_avg: 50,
      winter_weekday: null,
      winter_weekend: null,
      spring_weekday: null,
      spring_weekend: null,
      summer_weekday: null,
      summer_weekend: null,
      fall_weekday: null,
      fall_weekend: null,
      occupancy: null,
      operating_season_months: null,
      url: null,
      raw: null,
    };
    const out = filterGlampingMajorityVehicleInventoryRows([sage]);
    expect(out).toHaveLength(0);
  });

  it('passes through non-glamping vehicle-majority sources unchanged', () => {
    const rover: CohortPropertyRow = {
      source: 'all_roverpass_data_new',
      sourceId: 'r1',
      geo_lat: 44,
      geo_lng: -121,
      property_name: 'RV Park',
      city: 'Bend',
      state: 'OR',
      property_type: null,
      unit_type: 'RV Site',
      property_total_sites: 100,
      quantity_of_units: null,
      distance_miles: 2,
      rate_avg: 80,
      winter_weekday: null,
      winter_weekend: null,
      spring_weekday: null,
      spring_weekend: null,
      summer_weekday: null,
      summer_weekend: null,
      fall_weekday: null,
      fall_weekend: null,
      occupancy: null,
      operating_season_months: null,
      url: null,
      raw: null,
    };
    const out = filterGlampingMajorityVehicleInventoryRows([rover]);
    expect(out).toEqual([rover]);
  });

  it('chains with tent-majority filter without errors', () => {
    const rows = [
      hipRow({ sourceId: '1', unit_type: 'Vehicles', quantity_of_units: 20 }),
      hipRow({ sourceId: '2', unit_type: 'Bell Tent', quantity_of_units: 20 }),
    ];
    const tentFirst = filterHipcampMajorityTentSiteProperties(rows);
    const out = filterGlampingMajorityVehicleInventoryRows(tentFirst);
    expect(out).toHaveLength(0);
  });
});
