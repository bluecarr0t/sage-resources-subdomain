import { dedupeCohortRows, dedupeKey, type DedupedCohortRow } from '@/lib/market-report/dedupe';
import type { CohortPropertyRow } from '@/lib/market-report/types';

function makeRow(overrides: Partial<CohortPropertyRow> = {}): CohortPropertyRow {
  return {
    source: 'all_glamping_properties',
    sourceId: '1',
    geo_lat: 42.5,
    geo_lng: -88.4,
    property_name: 'Test Resort',
    city: 'Lake Geneva',
    state: 'WI',
    property_type: 'Glamping',
    unit_type: 'Safari Tent',
    property_total_sites: 30,
    quantity_of_units: 10,
    distance_miles: 5,
    rate_avg: 400,
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
    ...overrides,
  };
}

describe('dedupeCohortRows', () => {
  it('returns input unchanged when no duplicates exist', () => {
    const rows = [
      makeRow({ property_name: 'A', unit_type: 'Safari Tent' }),
      makeRow({ property_name: 'B', unit_type: 'Dome' }),
    ];
    const { rows: out, stats } = dedupeCohortRows(rows);
    expect(out).toHaveLength(2);
    expect(stats.rawRowCount).toBe(2);
    expect(stats.collapsedRowCount).toBe(2);
    expect(out.every((r) => (r as DedupedCohortRow).rateTierRows === 1)).toBe(true);
  });

  it('collapses Camp-Fimfo-style rate-tier rows into one canonical row', () => {
    const fimfoTinyHomes = [
      makeRow({ property_name: 'Camp Fimfo', unit_type: 'Tiny Home', rate_avg: 162.6, quantity_of_units: 1, property_total_sites: 40 }),
      makeRow({ property_name: 'Camp Fimfo', unit_type: 'Tiny Home', rate_avg: 186.33, quantity_of_units: 1, property_total_sites: 40 }),
      makeRow({ property_name: 'Camp Fimfo', unit_type: 'Tiny Home', rate_avg: 284.5, quantity_of_units: 3, property_total_sites: 40 }),
      makeRow({ property_name: 'Camp Fimfo', unit_type: 'Tiny Home', rate_avg: 297.0, quantity_of_units: 25, property_total_sites: 40 }),
      makeRow({ property_name: 'Camp Fimfo', unit_type: 'Tiny Home', rate_avg: 398.25, quantity_of_units: 1, property_total_sites: 40 }),
      makeRow({ property_name: 'Camp Fimfo', unit_type: 'Tiny Home', rate_avg: 417.83, quantity_of_units: 1, property_total_sites: 40 }),
      makeRow({ property_name: 'Camp Fimfo', unit_type: 'Tiny Home', rate_avg: 499.5, quantity_of_units: 1, property_total_sites: 40 }),
    ];
    const { rows, stats } = dedupeCohortRows(fimfoTinyHomes);
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.rate_avg).toBe(297);
    expect(r.rateLow).toBe(162.6);
    expect(r.rateHigh).toBe(499.5);
    expect(r.quantity_of_units).toBe(25);
    expect(r.property_total_sites).toBe(40);
    expect(r.rateTierRows).toBe(7);
    expect(stats.collapsedRowCount).toBe(1);
  });

  it('handles 43-vs-44 dirty-duplicate property_total_sites by taking max', () => {
    const cedarFalls = [
      makeRow({ property_name: 'The Inn & Spa at Cedar Falls', unit_type: 'Cabin', rate_avg: 388.5, property_total_sites: 43, quantity_of_units: 6 }),
      makeRow({ property_name: 'The Inn & Spa at Cedar Falls', unit_type: 'Cabin', rate_avg: 388.5, property_total_sites: 44, quantity_of_units: 6 }),
    ];
    const { rows } = dedupeCohortRows(cedarFalls);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.property_total_sites).toBe(44);
    expect(rows[0]!.rate_avg).toBe(388.5);
    expect(rows[0]!.rateTierRows).toBe(2);
  });

  it('keeps unit_type=null rows as their own "Unspecified" bucket', () => {
    const rows = [
      makeRow({ property_name: 'Zion Ponderosa Ranch Resort', unit_type: 'Cabin', rate_avg: 207 }),
      makeRow({ property_name: 'Zion Ponderosa Ranch Resort', unit_type: null, rate_avg: 539 }),
      makeRow({ property_name: 'Zion Ponderosa Ranch Resort', unit_type: null, rate_avg: 719 }),
      makeRow({ property_name: 'Zion Ponderosa Ranch Resort', unit_type: null, rate_avg: 799 }),
    ];
    const { rows: out } = dedupeCohortRows(rows);
    expect(out).toHaveLength(2);
    const unspec = out.find((r) => r.unit_type === 'Unspecified')!;
    expect(unspec.rate_avg).toBe(719);
    expect(unspec.rateLow).toBe(539);
    expect(unspec.rateHigh).toBe(799);
    expect(unspec.rateTierRows).toBe(3);
  });

  it('does not merge rows from different sources', () => {
    const rows = [
      makeRow({ source: 'all_glamping_properties', property_name: 'Yogi Bear', unit_type: 'Cabin' }),
      makeRow({ source: 'campspot', property_name: 'Yogi Bear', unit_type: 'Cabin' }),
    ];
    const { rows: out, stats } = dedupeCohortRows(rows);
    expect(out).toHaveLength(2);
    expect(stats.bySource['all_glamping_properties']!.collapsed).toBe(1);
    expect(stats.bySource['campspot']!.collapsed).toBe(1);
  });

  it('takes median for seasonal rates and occupancy', () => {
    const rows = [
      makeRow({ property_name: 'X', winter_weekend: 200, occupancy: 0.4 }),
      makeRow({ property_name: 'X', winter_weekend: 300, occupancy: 0.6 }),
      makeRow({ property_name: 'X', winter_weekend: 400, occupancy: 0.8 }),
    ];
    const { rows: out } = dedupeCohortRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0]!.winter_weekend).toBe(300);
    expect(out[0]!.occupancy).toBe(0.6);
  });

  it('case-insensitive name/state grouping via dedupeKey', () => {
    expect(
      dedupeKey(makeRow({ property_name: '  Camp Fimfo  ', state: 'tx', unit_type: 'Tiny Home' }))
    ).toBe(
      dedupeKey(makeRow({ property_name: 'CAMP FIMFO', state: 'TX', unit_type: 'tiny home' }))
    );
  });

  it('uses lat/lng from the closest row in the group', () => {
    const rows = [
      makeRow({ property_name: 'X', distance_miles: 12, geo_lat: 42.0, geo_lng: -88.0 }),
      makeRow({ property_name: 'X', distance_miles: 5, geo_lat: 42.5, geo_lng: -88.5 }),
      makeRow({ property_name: 'X', distance_miles: 9, geo_lat: 42.3, geo_lng: -88.3 }),
    ];
    const { rows: out } = dedupeCohortRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0]!.distance_miles).toBe(5);
    expect(out[0]!.geo_lat).toBe(42.5);
    expect(out[0]!.geo_lng).toBe(-88.5);
  });
});
