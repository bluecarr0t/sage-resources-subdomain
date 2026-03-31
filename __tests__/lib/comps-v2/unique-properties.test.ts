/**
 * @jest-environment node
 */

import { dedupeUniqueProperties, filterGlampingMajorityProperties } from '@/lib/comps-v2/unique-properties';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function base(p: Partial<CompsV2Candidate>): CompsV2Candidate {
  return {
    stable_id: p.stable_id ?? 'a',
    property_name: p.property_name ?? 'Same',
    city: 'Austin',
    state: 'TX',
    unit_type: p.unit_type ?? 'Yurt',
    property_total_sites: p.property_total_sites ?? null,
    quantity_of_units: p.quantity_of_units ?? 2,
    avg_retail_daily_rate: p.avg_retail_daily_rate ?? 200,
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
    distance_miles: p.distance_miles ?? 5,
    source_table: p.source_table ?? 'hipcamp',
    source_row_id: null,
    property_type: null,
    ...p,
  };
}

describe('dedupeUniqueProperties', () => {
  it('collapses same property name/city/state', () => {
    const a = base({ stable_id: '1', unit_type: 'Yurt', avg_retail_daily_rate: 100 });
    const b = base({ stable_id: '2', unit_type: 'Safari Tent', avg_retail_daily_rate: 300 });
    const out = dedupeUniqueProperties([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].unit_type).toBe('Glamping — multiple unit types');
    expect(out[0].stable_id).not.toBe('1');
  });

  it('sets web_research_supplement when merging market row with gap-fill web row', () => {
    const market = base({
      stable_id: 'm',
      source_table: 'all_glamping_properties',
      property_name: 'Oak Glamp',
      geo_lat: 30.1,
      geo_lng: -97.9,
    });
    const web = base({
      stable_id: 'w',
      source_table: 'firecrawl_gap_fill',
      property_name: 'Oak Glamp',
      avg_retail_daily_rate: 175,
      geo_lat: null,
      geo_lng: null,
    });
    const out = dedupeUniqueProperties([market, web]);
    expect(out).toHaveLength(1);
    expect(out[0].source_table).toBe('all_glamping_properties');
    expect(out[0].web_research_supplement).toBe(true);
    expect(out[0].geo_lat).toBe(30.1);
  });
});

describe('filterGlampingMajorityProperties', () => {
  it('drops property when RV weights exceed glamping', () => {
    const glamp = base({
      stable_id: 'g',
      unit_type: 'Yurt',
      quantity_of_units: 2,
      property_name: 'Mixed Camp',
    });
    const rv = base({
      stable_id: 'r',
      unit_type: 'RV Site',
      quantity_of_units: 10,
      property_name: 'Mixed Camp',
    });
    const filtered = filterGlampingMajorityProperties([glamp, rv]);
    expect(filtered).toHaveLength(0);
  });
});
