/**
 * Phase 2 connector unit tests (mocked HTTP / pure functions).
 */

import { scoreDriveTimeRing, formatDriveTimeForPrompt } from '@/lib/ai-report-builder/drive-time-demographics';
import { formatSiteRiskForPrompt } from '@/lib/ai-report-builder/site-risk';
import { formatStvrForPrompt } from '@/lib/ai-report-builder/stvr-indicators';
import { formatCompRadiusPivotsForPrompt } from '@/lib/ai-report-builder/comp-radius-pivots';
import { formatTourismForPrompt } from '@/lib/ai-report-builder/tourism-economics';
import { formatNearestAirportForPrompt } from '@/lib/ai-report-builder/nearest-airport';
import { proposeAssumptions } from '@/lib/feasibility-model/propose-assumptions';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';
import type { SiteRiskResult } from '@/lib/ai-report-builder/site-risk';

describe('scoreDriveTimeRing', () => {
  it('scores population against historic thresholds', () => {
    expect(scoreDriveTimeRing(60, null).score).toBe(0);
    expect(scoreDriveTimeRing(60, 40_000).score).toBe(0);
    expect(scoreDriveTimeRing(60, 50_000).score).toBe(1);
    expect(scoreDriveTimeRing(60, 150_000).score).toBe(2);
    expect(scoreDriveTimeRing(60, 300_000).score).toBe(3);
    expect(scoreDriveTimeRing(180, 1_500_000).score).toBe(3);
  });
});

describe('format helpers for prompts', () => {
  it('formats drive-time demographics', () => {
    const text = formatDriveTimeForPrompt({
      rings: [
        {
          minutes: 60,
          radius_label: '60 min',
          population_2020: 100_000,
          households_2020: 40_000,
          median_household_income: 75_000,
          method: 'haversine_county',
        },
      ],
      demand_rubric: [
        { minutes: 60, population: 100_000, score: 1, note: 'Adequate' },
      ],
      overall_score: 1,
      fetched_at: '2026-01-01T00:00:00Z',
      source: 'county-population',
    });
    expect(text).toContain('60 min');
    expect(text).toContain('100,000');
    expect(text).toContain('rubric 1/3');
  });

  it('formats site risk for Flood Zone / Wetlands / Wildfire', () => {
    const risk: SiteRiskResult = {
      flood: { zone: 'AE', panel: '12345C', source: 'fema_nfhl' },
      wetlands: { present: false, note: 'No FWS wetland features', source: 'fws_wetlands' },
      wildfire: { eal_rating: 'Relatively Moderate', risk_score: null, source: 'fema_nri' },
      fetched_at: '2026-01-01T00:00:00Z',
    };
    const text = formatSiteRiskForPrompt(risk);
    expect(text).toContain('AE');
    expect(text).toContain('No FWS wetland');
    expect(text).toContain('Relatively Moderate');
  });

  it('formats STVR and pivots', () => {
    expect(
      formatStvrForPrompt({
        radius_miles: 50,
        sample_count: 12,
        avg_occupancy: 0.42,
        avg_adr: 185,
        sources: ['hipcamp', 'campspot'],
        airdna: null,
        fetched_at: '2026-01-01T00:00:00Z',
      })
    ).toContain('42%');

    expect(
      formatCompRadiusPivotsForPrompt({
        buckets: [
          {
            radius_miles: 50,
            property_count: 8,
            avg_adr: 200,
            avg_occupancy: 0.5,
            sources: ['all_sage_data'],
          },
        ],
        fetched_at: '2026-01-01T00:00:00Z',
      })
    ).toContain('50 mi');
  });

  it('formats tourism and airport', () => {
    expect(
      formatTourismForPrompt({
        rows: [
          {
            geo_level: 'state',
            state: 'CO',
            county: null,
            year: 2023,
            lodging_spend: 1_000_000,
            total_spend: 5_000_000,
            employment: 10_000,
            source: 'seed',
          },
        ],
        fetched_at: '2026-01-01T00:00:00Z',
        source: 'tourism_economics',
      })
    ).toContain('CO');

    expect(
      formatNearestAirportForPrompt({
        name: 'Denver International',
        iata_code: 'DEN',
        city: 'Denver',
        state_province: 'CO',
        distance_miles: 55.2,
        avg_annual_passengers: 30_000_000,
        hub_size: 'large',
        fetched_at: '2026-01-01T00:00:00Z',
        source: 'airports',
      })
    ).toContain('DEN');
  });
});

describe('proposeAssumptions STVR fallback', () => {
  it('uses stvr_indicators when comps lack occupancy', () => {
    const enriched: EnrichedInput = {
      property_name: 'Test',
      city: 'Bend',
      state: 'OR',
      unit_mix: [{ type: 'Safari Tent', count: 10 }],
      stvr_indicators: {
        radius_miles: 50,
        sample_count: 20,
        avg_occupancy: 0.48,
        avg_adr: 190,
        sources: ['hipcamp'],
        airdna: null,
        fetched_at: '2026-01-01T00:00:00Z',
      },
    };
    const a = proposeAssumptions(enriched);
    expect(a.units[0].value.lowAdr).toBe(190);
    expect(a.units[0].value.lowOccupancy).toBeCloseTo(0.48 * 0.55, 5);
    expect(a.units[0].value.peakOccupancy).toBeGreaterThan(0.48);
  });
});
