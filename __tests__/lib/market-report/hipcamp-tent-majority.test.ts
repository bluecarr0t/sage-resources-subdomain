import {
  filterHipcampMajorityTentSiteProperties,
  isHipcampTentSiteUnitTypeForMajority,
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

describe('isHipcampTentSiteUnitTypeForMajority', () => {
  it('counts basic tent and tent site inventory', () => {
    expect(isHipcampTentSiteUnitTypeForMajority('Tent')).toBe(true);
    expect(isHipcampTentSiteUnitTypeForMajority('Tent Site')).toBe(true);
    expect(isHipcampTentSiteUnitTypeForMajority('Walk-in Tent')).toBe(true);
  });

  it('does not count safari / bell / yurt style as tent sites', () => {
    expect(isHipcampTentSiteUnitTypeForMajority('Safari Tent')).toBe(false);
    expect(isHipcampTentSiteUnitTypeForMajority('Bell Tent')).toBe(false);
    expect(isHipcampTentSiteUnitTypeForMajority('Yurt')).toBe(false);
  });
});

describe('filterHipcampMajorityTentSiteProperties', () => {
  it('drops hipcamp rows when tent inventory is ≥50%', () => {
    const rows = [
      hipRow({ sourceId: '1', unit_type: 'Tent', quantity_of_units: 10 }),
      hipRow({ sourceId: '2', unit_type: 'Cabin', quantity_of_units: 5 }),
    ];
    const out = filterHipcampMajorityTentSiteProperties(rows);
    expect(out).toHaveLength(0);
  });

  it('keeps hipcamp when tent share is below 50%', () => {
    const rows = [
      hipRow({ sourceId: '1', unit_type: 'Tent', quantity_of_units: 4 }),
      hipRow({ sourceId: '2', unit_type: 'Cabin', quantity_of_units: 10 }),
    ];
    const out = filterHipcampMajorityTentSiteProperties(rows);
    expect(out).toHaveLength(2);
  });

  it('passes through non-hipcamp rows unchanged', () => {
    const sage: CohortPropertyRow = {
      source: 'all_sage_data',
      sourceId: '9',
      geo_lat: 44,
      geo_lng: -121,
      property_name: 'Sage Camp',
      city: 'Bend',
      state: 'OR',
      property_type: null,
      unit_type: 'Tent',
      property_total_sites: 100,
      quantity_of_units: 100,
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
    const out = filterHipcampMajorityTentSiteProperties([sage]);
    expect(out).toEqual([sage]);
  });
});
