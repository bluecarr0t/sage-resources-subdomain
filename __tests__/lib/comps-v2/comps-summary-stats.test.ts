import {
  computeCompsV2SummaryStats,
  normalizeOccupancyToPercent,
  quantileSorted,
} from '@/lib/comps-v2/comps-summary-stats';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function baseCandidate(over: Partial<CompsV2Candidate>): CompsV2Candidate {
  return {
    stable_id: 'x',
    property_name: 'P',
    city: 'Austin',
    state: 'TX',
    unit_type: null,
    property_total_sites: null,
    quantity_of_units: null,
    avg_retail_daily_rate: 100,
    high_rate: null,
    low_rate: null,
    seasonal_rates: {
      winter_weekday: null,
      winter_weekend: null,
      spring_weekday: null,
      spring_weekend: null,
      summer_weekday: null,
      summer_weekend: null,
      fall_weekday: null,
      fall_weekend: null,
    },
    operating_season_months: null,
    url: null,
    description: null,
    distance_miles: 1,
    source_table: 'hipcamp',
    ...over,
  };
}

describe('normalizeOccupancyToPercent', () => {
  it('scales decimals in (0,1] to percent', () => {
    expect(normalizeOccupancyToPercent(0.75)).toBe(75);
    expect(normalizeOccupancyToPercent(1)).toBe(100);
  });

  it('leaves percent-scale values as-is', () => {
    expect(normalizeOccupancyToPercent(75)).toBe(75);
  });
});

describe('quantileSorted', () => {
  it('interpolates median and quartiles', () => {
    const s = [100, 200];
    expect(quantileSorted(s, 0.5)).toBe(150);
    expect(quantileSorted(s, 0.25)).toBe(125);
    expect(quantileSorted(s, 0.75)).toBe(175);
  });
});

describe('computeCompsV2SummaryStats', () => {
  it('returns empty aggregates for no candidates', () => {
    const s = computeCompsV2SummaryStats([]);
    expect(s.totalProperties).toBe(0);
    expect(s.totalSites).toBeNull();
    expect(s.avgAdr).toBeNull();
    expect(s.medianAdr).toBeNull();
    expect(s.meanDistanceMiles).toBeNull();
    expect(s.avgMarketOccupancyPercent).toBeNull();
    expect(s.marketOccupancyCount).toBe(0);
    expect(s.coverageAdrPct).toBeNull();
  });

  it('sums sites, ADR stats, distance, coverage, tiers, and averages market occupancy', () => {
    const s = computeCompsV2SummaryStats([
      baseCandidate({
        stable_id: 'a',
        avg_retail_daily_rate: 100,
        quantity_of_units: 2,
        distance_miles: 10,
        market_occupancy_rate: 0.8,
        adr_quality_tier: 'mid',
        geo_lat: 30,
        geo_lng: -97,
      }),
      baseCandidate({
        stable_id: 'b',
        avg_retail_daily_rate: 200,
        property_total_sites: 5,
        distance_miles: 30,
        market_occupancy_rate: 60,
        adr_quality_tier: 'luxury',
        geo_lat: 31,
        geo_lng: -98,
      }),
    ]);
    expect(s.totalProperties).toBe(2);
    expect(s.totalSites).toBe(7);
    expect(s.avgAdr).toBe(150);
    expect(s.medianAdr).toBe(150);
    expect(s.adrLow).toBe(100);
    expect(s.adrHigh).toBe(200);
    expect(s.meanDistanceMiles).toBe(20);
    expect(s.coverageAdrPct).toBe(100);
    expect(s.coverageUnitsPct).toBe(100);
    expect(s.coverageCoordsPct).toBe(100);
    expect(s.tierCounts.mid).toBe(1);
    expect(s.tierCounts.luxury).toBe(1);
    expect(s.tierUnclassified).toBe(0);
    expect(s.marketOccupancyCount).toBe(2);
    expect(s.avgMarketOccupancyPercent).toBeCloseTo(70, 5);
  });
});
