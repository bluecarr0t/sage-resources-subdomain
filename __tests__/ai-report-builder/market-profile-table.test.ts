/**
 * Drive-time market profile native table helpers.
 */

import { buildDriveTimeMarketProfileTable } from '@/lib/ai-report-builder/drive-time-demographics';
import type { DriveTimeDemographicsResult } from '@/lib/ai-report-builder/drive-time-demographics';

const sample: DriveTimeDemographicsResult = {
  rings: [
    {
      minutes: 60,
      radius_label: '60 min',
      population_2020: 1_200_000,
      households_2020: 480_000,
      median_household_income: 72_000,
      method: 'haversine_county',
    },
    {
      minutes: 120,
      radius_label: '120 min',
      population_2020: 3_500_000,
      households_2020: 1_400_000,
      median_household_income: 68_000,
      method: 'haversine_county',
    },
    {
      minutes: 180,
      radius_label: '180 min',
      population_2020: 6_000_000,
      households_2020: 2_400_000,
      median_household_income: 65_000,
      method: 'haversine_county',
    },
  ],
  demand_rubric: [
    { minutes: 60, population: 1_200_000, score: 3, note: 'Strong' },
    { minutes: 120, population: 3_500_000, score: 3, note: 'Strong' },
    { minutes: 180, population: 6_000_000, score: 3, note: 'Strong' },
  ],
  overall_score: 9,
  fetched_at: '2026-08-10T00:00:00Z',
  source: 'county-population',
};

describe('buildDriveTimeMarketProfileTable', () => {
  it('builds Metric × ring columns with formatted values', () => {
    const { headers, body } = buildDriveTimeMarketProfileTable(sample);
    expect(headers).toEqual(['Metric', '60 min', '120 min', '180 min']);
    expect(body[0][0]).toBe('2020 Population');
    expect(body[0][1]).toBe('1,200,000');
    expect(body[2][1]).toBe('$72,000');
    expect(body[3]).toEqual(['Demand Rubric (0–3)', '3', '3', '3']);
  });
});
