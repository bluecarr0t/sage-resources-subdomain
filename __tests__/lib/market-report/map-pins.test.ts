import type { CohortPropertyRow } from '@/lib/market-report/types';
import { MARKET_REPORT_MAP_PINS_CAP, buildMapPinsFromRows } from '@/lib/market-report/map-pins';

function baseRow(over: Partial<CohortPropertyRow> & Pick<CohortPropertyRow, 'property_name' | 'sourceId'>): CohortPropertyRow {
  return {
    source: 'all_glamping_properties',
    geo_lat: 35.5,
    geo_lng: -97.3,
    city: 'A',
    state: 'TX',
    property_type: 'Resort',
    unit_type: 'Yurt',
    property_total_sites: 10,
    quantity_of_units: null,
    distance_miles: 5,
    rate_avg: 100,
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
    ...over,
  };
}

describe('buildMapPinsFromRows', () => {
  it('uses cohort row index in keys (matches property sample for first rows)', () => {
    const rows = [
      baseRow({ property_name: 'First', sourceId: '1', distance_miles: 1, geo_lat: 36, geo_lng: -98 }),
      baseRow({ property_name: 'Second', sourceId: '2', distance_miles: 2, geo_lat: 36.1, geo_lng: -98.1 }),
    ];
    const { pins, mapPinsTotal, mapPinsTruncated } = buildMapPinsFromRows(rows);
    expect(mapPinsTotal).toBe(2);
    expect(mapPinsTruncated).toBe(false);
    expect(pins[0]!.key).toContain(':0:');
    expect(pins[1]!.key).toContain(':1:');
  });

  it('skips invalid coordinates for pins but not for total count of valid coords', () => {
    const rows = [
      baseRow({ property_name: 'Bad', sourceId: '0', geo_lat: NaN, geo_lng: 0 }),
      baseRow({ property_name: 'Good', sourceId: '1', geo_lat: 35, geo_lng: -97 }),
    ];
    const { pins, mapPinsTotal } = buildMapPinsFromRows(rows);
    expect(mapPinsTotal).toBe(1);
    expect(pins).toHaveLength(1);
    expect(pins[0]!.property_name).toBe('Good');
  });

  it('truncates when above cap', () => {
    const rows: CohortPropertyRow[] = [];
    for (let i = 0; i < MARKET_REPORT_MAP_PINS_CAP + 50; i++) {
      rows.push(
        baseRow({
          property_name: `P${i}`,
          sourceId: String(i),
          distance_miles: i,
          geo_lat: 30 + i * 0.0001,
          geo_lng: -90 - i * 0.0001,
        })
      );
    }
    const { pins, mapPinsTruncated, mapPinsTotal } = buildMapPinsFromRows(rows);
    expect(mapPinsTotal).toBe(MARKET_REPORT_MAP_PINS_CAP + 50);
    expect(mapPinsTruncated).toBe(true);
    expect(pins).toHaveLength(MARKET_REPORT_MAP_PINS_CAP);
  });
});
