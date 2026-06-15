import {
  buildPipelineQuarterlyExportBundle,
  getPipelineQuarterlyPropertyExportColumns,
  pipelineQuarterlyPropertyRowsToExport,
  pipelineQuarterlyUnitMixRowsToExport,
} from '@/lib/pipeline-quarterly/export-rows';
import type { PipelineQuarterlyPropertyRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';
import type { PipelineQuarterlyUnitMixLine } from '@/lib/pipeline-quarterly/unit-mix';

const sampleUnitMix: PipelineQuarterlyUnitMixLine[] = [
  { unitType: 'Safari Tent', units: 8, avgRetailDailyRate: 350 },
  { unitType: 'Yurt', units: 4, avgRetailDailyRate: 300 },
];

function samplePropertyRow(
  overrides: Partial<PipelineQuarterlyPropertyRow> = {}
): PipelineQuarterlyPropertyRow {
  return {
    id: 1,
    propertyName: 'Test Glamp',
    state: 'Colorado',
    stateAbbr: 'CO',
    country: 'United States',
    city: 'Denver',
    address: '123 Mountain Rd',
    zipCode: '80202',
    brandId: 'brand-uuid-1',
    brandName: 'AutoCamp',
    isOpenLabel: 'Proposed Development',
    propertyType: 'Glamping Resort',
    unitType: 'Safari Tent',
    units: 12,
    acres: 80,
    serviceTier: 'luxury',
    plannedOpenDate: '2027-06-01',
    avgRetailDailyRate: 350,
    websiteUrl: 'https://example.com',
    description: 'A test property.',
    phoneNumber: '555-0100',
    discoverySource: 'weekly_pipeline_sync',
    newsArticleUrl: null,
    unitMix: sampleUnitMix,
    ...overrides,
  };
}

describe('pipelineQuarterly export bundle', () => {
  it('maps property rows to the property sheet shape', () => {
    expect(pipelineQuarterlyPropertyRowsToExport([samplePropertyRow()])).toEqual([
      {
        property_name: 'Test Glamp',
        address: '123 Mountain Rd',
        city: 'Denver',
        state: 'Colorado',
        zip_code: '80202',
        country: 'United States',
        is_open: 'Proposed Development',
        glamping_service_tier: 'luxury',
        Brand: 'AutoCamp',
        acres: 80,
        total_units: 12,
        distinct_unit_types: 2,
        planned_open_date: '2027-06-01',
        rate_avg_retail_daily_rate: 350,
      },
    ]);
  });

  it('maps unit mix rows in long format for pivot tables', () => {
    expect(pipelineQuarterlyUnitMixRowsToExport([samplePropertyRow()])).toEqual([
      {
        property_name: 'Test Glamp',
        state: 'Colorado',
        country: 'United States',
        is_open: 'Proposed Development',
        Brand: 'AutoCamp',
        unit_type: 'Safari Tent',
        units: 8,
        rate_avg_retail_daily_rate: 350,
      },
      {
        property_name: 'Test Glamp',
        state: 'Colorado',
        country: 'United States',
        is_open: 'Proposed Development',
        Brand: 'AutoCamp',
        unit_type: 'Yurt',
        units: 4,
        rate_avg_retail_daily_rate: 300,
      },
    ]);
  });

  it('omits planned_open_date from the property sheet when requested', () => {
    const row = samplePropertyRow({
      id: 2,
      propertyName: 'Open Camp',
      isOpenLabel: 'Open',
      unitMix: [{ unitType: 'Yurt', units: 4, avgRetailDailyRate: 200 }],
    });

    const bundle = buildPipelineQuarterlyExportBundle([row], { hidePlannedOpenDate: true });
    expect(bundle.properties[0]).not.toHaveProperty('planned_open_date');
    expect(bundle.propertyColumns).not.toContain('planned_open_date');
    expect(bundle.unitMix).toHaveLength(1);
  });
});
