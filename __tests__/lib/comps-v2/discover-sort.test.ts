/**
 * @jest-environment node
 */

import { compareCompsV2Candidates } from '@/lib/comps-v2/discover';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

const EMPTY_SEASONAL = {
  winter_weekday: null as number | null,
  winter_weekend: null as number | null,
  spring_weekday: null as number | null,
  spring_weekend: null as number | null,
  summer_weekday: null as number | null,
  summer_weekend: null as number | null,
  fall_weekday: null as number | null,
  fall_weekend: null as number | null,
};

function baseRow(
  source_table: string,
  overrides: Partial<CompsV2Candidate> = {}
): CompsV2Candidate {
  return {
    stable_id: overrides.stable_id ?? `id-${source_table}`,
    property_name: overrides.property_name ?? 'Prop',
    city: overrides.city ?? 'Austin',
    state: overrides.state ?? 'TX',
    unit_type: null,
    property_total_sites: null,
    quantity_of_units: null,
    avg_retail_daily_rate: null,
    high_rate: null,
    low_rate: null,
    seasonal_rates: { ...EMPTY_SEASONAL },
    operating_season_months: null,
    url: null,
    description: null,
    distance_miles: overrides.distance_miles ?? null,
    source_table,
    ...overrides,
  };
}

describe('compareCompsV2Candidates merge order', () => {
  it('orders market data before past_reports before web gap-fill', () => {
    const hip = baseRow('hipcamp', { stable_id: 'h1' });
    const past = baseRow('past_reports', { stable_id: 'p1', quality_score: 7 });
    const web = baseRow('tavily_gap_fill', { stable_id: 'w1' });
    const sorted = [web, past, hip].sort(compareCompsV2Candidates);
    expect(sorted.map((c) => c.source_table)).toEqual(['hipcamp', 'past_reports', 'tavily_gap_fill']);
  });

  it('sorts past_reports by quality_score descending', () => {
    const low = baseRow('past_reports', { stable_id: 'p-low', quality_score: 2 });
    const high = baseRow('past_reports', { stable_id: 'p-high', quality_score: 9 });
    const sorted = [low, high].sort(compareCompsV2Candidates);
    expect(sorted[0].quality_score).toBe(9);
    expect(sorted[1].quality_score).toBe(2);
  });

  it('sorts non-past rows by distance_miles ascending (nulls last via 999)', () => {
    const far = baseRow('hipcamp', { stable_id: 'f', distance_miles: 40 });
    const near = baseRow('hipcamp', { stable_id: 'n', distance_miles: 5 });
    const unknown = baseRow('hipcamp', { stable_id: 'u', distance_miles: null });
    const sorted = [far, unknown, near].sort(compareCompsV2Candidates);
    expect(sorted.map((c) => c.distance_miles)).toEqual([5, 40, null]);
  });

  it('treats firecrawl_gap_fill same as tavily for source group (after market, with web)', () => {
    const glamp = baseRow('all_glamping_properties', { stable_id: 'g' });
    const fc = baseRow('firecrawl_gap_fill', { stable_id: 'fc' });
    expect(compareCompsV2Candidates(glamp, fc)).toBeLessThan(0);
  });
});
