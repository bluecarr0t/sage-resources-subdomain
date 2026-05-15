import {
  cohortListingIdentityKey,
  countDistinctListings,
  countDistinctListingsInSourceSlice,
  countDistinctListingsWhere,
  normalizeListingToken,
} from '@/lib/market-report/listing-identity';
import type { CohortPropertyRow } from '@/lib/market-report/types';

function baseRow(over: Partial<CohortPropertyRow>): CohortPropertyRow {
  return {
    source: 'all_glamping_properties',
    sourceId: '1',
    geo_lat: 35.5,
    geo_lng: -97.3,
    property_name: 'Lodge',
    city: 'Austin',
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

describe('listing-identity', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeListingToken('  Foo   Bar  ')).toBe('foo bar');
  });

  it('treats same listing on different sources as distinct keys', () => {
    const a = baseRow({ source: 'all_glamping_properties', property_name: 'Ridge Camp' });
    const b = baseRow({ source: 'hipcamp', property_name: 'Ridge Camp' });
    expect(cohortListingIdentityKey(a)).not.toBe(cohortListingIdentityKey(b));
    expect(countDistinctListings([a, b])).toBe(2);
  });

  it('counts one distinct listing for two inventory rows at same source', () => {
    const a = baseRow({ unit_type: 'Yurt' });
    const b = baseRow({ unit_type: 'Cabin' });
    expect(countDistinctListings([a, b])).toBe(1);
    expect(countDistinctListingsInSourceSlice([a, b])).toBe(1);
  });

  it('countDistinctListingsWhere counts listings with a matching row', () => {
    const a = baseRow({ property_name: 'A', unit_type: 'Yurt', rate_avg: 100 });
    const b = baseRow({ property_name: 'B', unit_type: 'Cabin', rate_avg: 400 });
    expect(countDistinctListingsWhere([a, b], (r) => (r.rate_avg ?? 0) >= 300)).toBe(1);
  });
});
