import { dedupeCohortRows } from '@/lib/market-report/dedupe';
import type { CohortPropertyRow } from '@/lib/market-report/types';
import { mergeAndDedupeRv } from '@/lib/market-report/load-cohort';

function hipcampRow(partial: Partial<CohortPropertyRow>): CohortPropertyRow {
  return {
    source: 'hipcamp',
    sourceId: '1',
    geo_lat: 44.06,
    geo_lng: -121.32,
    property_name: 'Test Glamp',
    city: 'Bend',
    state: 'OR',
    property_type: 'Glamping',
    unit_type: 'Cabin',
    property_total_sites: null,
    quantity_of_units: 2,
    distance_miles: 5,
    rate_avg: 200,
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
    raw: {},
    ...partial,
  };
}

describe('Hipcamp multi-unit rows vs RV geo merge', () => {
  it('mergeAndDedupeRv keeps one row per name+city+state+coords (RV-style dedupe)', () => {
    const a = hipcampRow({ unit_type: 'Cabin', quantity_of_units: 3, distance_miles: 4 });
    const b = hipcampRow({ unit_type: 'Safari Tent', quantity_of_units: 5, distance_miles: 6 });
    expect(mergeAndDedupeRv([a, b])).toHaveLength(1);
  });

  it('dedupeCohortRows keeps separate rows per unit type (local glamping path)', () => {
    const a = hipcampRow({ unit_type: 'Cabin', quantity_of_units: 3 });
    const b = hipcampRow({ unit_type: 'Safari Tent', quantity_of_units: 5 });
    const { rows } = dedupeCohortRows([a, b]);
    expect(rows).toHaveLength(2);
  });
});
