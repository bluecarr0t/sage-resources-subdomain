/**
 * @jest-environment node
 */

import {
  classifyUnitExperienceBucket,
  isRvHeavyPropertyName,
  rowPassesGlampingUnitGate,
} from '@/lib/comps-v2/glamping-unit-classify';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function row(p: Partial<CompsV2Candidate>): CompsV2Candidate {
  return {
    stable_id: 's',
    property_name: p.property_name ?? 'P',
    city: 'Austin',
    state: 'TX',
    unit_type: p.unit_type ?? null,
    property_total_sites: null,
    quantity_of_units: p.quantity_of_units ?? null,
    avg_retail_daily_rate: null,
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
    description: p.description ?? null,
    distance_miles: 1,
    source_table: p.source_table ?? 'hipcamp',
    ...p,
  };
}

describe('isRvHeavyPropertyName', () => {
  it('flags RV parks', () => {
    expect(isRvHeavyPropertyName('Miller Creek RV Park')).toBe(true);
  });
  it('allows glamping names', () => {
    expect(isRvHeavyPropertyName('Hill Country Glamping')).toBe(false);
  });
});

describe('classifyUnitExperienceBucket', () => {
  it('classifies safari tent as glamping', () => {
    expect(classifyUnitExperienceBucket(row({ unit_type: 'Safari Tent' }))).toBe('glamping');
  });
  it('classifies RV site', () => {
    expect(classifyUnitExperienceBucket(row({ unit_type: 'RV Site' }))).toBe('rv');
  });
});

describe('rowPassesGlampingUnitGate', () => {
  it('rejects RV park name on hipcamp', () => {
    expect(
      rowPassesGlampingUnitGate(
        row({ property_name: 'Terraqueous RV Resort', source_table: 'hipcamp', unit_type: null })
      )
    ).toBe(false);
  });
  it('allows resort without RV in name when unit unknown', () => {
    expect(
      rowPassesGlampingUnitGate(
        row({ property_name: 'Lucky Arrow Retreat', source_table: 'hipcamp', unit_type: null })
      )
    ).toBe(true);
  });
});
