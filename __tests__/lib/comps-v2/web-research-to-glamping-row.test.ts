import {
  compsV2WebCandidateToGlampingRow,
  webPipelineSourceForCandidate,
} from '@/lib/comps-v2/web-research-to-glamping-row';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function baseCandidate(over: Partial<CompsV2Candidate> = {}): CompsV2Candidate {
  return {
    stable_id: 'st_1',
    property_name: 'Test Glamp',
    city: 'Austin',
    state: 'TX',
    unit_type: 'Safari tent',
    property_total_sites: 12,
    quantity_of_units: 10,
    avg_retail_daily_rate: 199,
    high_rate: null,
    low_rate: null,
    seasonal_rates: {
      winter_weekday: 100,
      winter_weekend: 120,
      spring_weekday: 130,
      spring_weekend: 150,
      summer_weekday: 180,
      summer_weekend: 220,
      fall_weekday: 140,
      fall_weekend: 160,
    },
    operating_season_months: 'Year-round',
    url: 'https://example.com/p',
    description: 'Nice place',
    distance_miles: 5,
    source_table: 'tavily_gap_fill',
    ...over,
  };
}

describe('web-research-to-glamping-row', () => {
  it('maps geo, rates, and pipeline source', () => {
    const c = baseCandidate({ geo_lat: 30.25, geo_lng: -97.75 });
    const row = compsV2WebCandidateToGlampingRow(c);
    expect(row.lat).toBe(30.25);
    expect(row.lon).toBe(-97.75);
    expect(row.rate_avg_retail_daily_rate).toBe(199);
    expect(row.rate_summer_weekend).toBe(220);
    expect(row.city).toBe('Austin');
    expect(row.state).toBe('TX');
    expect(row.url).toBe('https://example.com/p');
    expect(row.is_glamping_property).toBe('Yes');
    expect(webPipelineSourceForCandidate(c)).toBe('tavily_gap_fill');
  });

  it('uses null geo when coordinates missing', () => {
    const c = baseCandidate({ geo_lat: undefined, geo_lng: null });
    const row = compsV2WebCandidateToGlampingRow(c);
    expect(row.lat).toBeNull();
    expect(row.lon).toBeNull();
  });

  it('merges description and location_detail', () => {
    const c = baseCandidate({
      description: 'A',
      location_detail: 'Near river',
    });
    const row = compsV2WebCandidateToGlampingRow(c);
    expect(row.description).toBe('A\n\nNear river');
  });

  it('resolves firecrawl pipeline source', () => {
    const c = baseCandidate({ source_table: 'firecrawl_gap_fill' });
    expect(webPipelineSourceForCandidate(c)).toBe('firecrawl_gap_fill');
  });

  it('returns null pipeline source for non-web tables', () => {
    const c = baseCandidate({ source_table: 'hipcamp' });
    expect(webPipelineSourceForCandidate(c)).toBeNull();
  });
});
