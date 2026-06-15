import {
  buildPipelinePropertyStateOptions,
  buildPipelinePropertyTierOptions,
  buildPipelinePropertyUnitTypeOptions,
  filterPipelineQuarterlyProperties,
  parsePipelineStateParam,
} from '@/lib/pipeline-quarterly/filter-properties';
import type { PipelineQuarterlyPropertyRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';

function row(
  partial: Partial<PipelineQuarterlyPropertyRow> &
    Pick<PipelineQuarterlyPropertyRow, 'id' | 'propertyName'>
): PipelineQuarterlyPropertyRow {
  return {
    state: null,
    stateAbbr: null,
    country: null,
    city: null,
    address: null,
    zipCode: null,
    brandId: null,
    brandName: null,
    isOpenLabel: 'Open',
    propertyType: null,
    unitType: null,
    units: 0,
    acres: null,
    serviceTier: null,
    plannedOpenDate: null,
    avgRetailDailyRate: null,
    websiteUrl: null,
    description: null,
    phoneNumber: null,
    discoverySource: null,
    newsArticleUrl: null,
    unitMix: [],
    ...partial,
  };
}

describe('pipeline property table filters', () => {
  const rows = [
    row({
      id: 1,
      propertyName: 'Alpha',
      stateAbbr: 'CO',
      state: 'Colorado',
      serviceTier: 'luxury',
      unitType: 'Safari Tent',
    }),
    row({
      id: 2,
      propertyName: 'Beta',
      stateAbbr: 'TX',
      state: 'Texas',
      serviceTier: 'rustic',
      unitType: 'Dome',
    }),
    row({
      id: 3,
      propertyName: 'Gamma',
      stateAbbr: 'CO',
      state: 'Colorado',
      serviceTier: 'upscale',
      unitType: null,
    }),
  ];

  it('builds filter options from the current cohort', () => {
    expect(buildPipelinePropertyStateOptions(rows).map((o) => o.value)).toEqual(['CO', 'TX']);
    expect(buildPipelinePropertyTierOptions(rows).map((o) => o.value)).toEqual([
      'luxury',
      'upscale',
      'rustic',
    ]);
    expect(buildPipelinePropertyUnitTypeOptions(rows).map((o) => o.value)).toEqual([
      'Dome',
      'Safari Tent',
      'Unspecified',
    ]);
  });

  it('filters by state, tier, and unit type', () => {
    expect(
      filterPipelineQuarterlyProperties(rows, {
        states: ['CO'],
        tiers: [],
        unitTypes: [],
      }).map((r) => r.propertyName)
    ).toEqual(['Alpha', 'Gamma']);

    expect(
      filterPipelineQuarterlyProperties(rows, {
        states: [],
        tiers: ['luxury', 'rustic'],
        unitTypes: [],
      }).map((r) => r.propertyName)
    ).toEqual(['Alpha', 'Beta']);

    expect(
      filterPipelineQuarterlyProperties(rows, {
        states: ['CO'],
        tiers: ['upscale'],
        unitTypes: ['Unspecified'],
      }).map((r) => r.propertyName)
    ).toEqual(['Gamma']);
  });
});

describe('parsePipelineStateParam', () => {
  it('parses USPS abbreviations and state names', () => {
    expect(parsePipelineStateParam('tx')).toBe('TX');
    expect(parsePipelineStateParam('Texas')).toBe('TX');
    expect(parsePipelineStateParam('')).toBeNull();
    expect(parsePipelineStateParam('ZZ')).toBeNull();
  });
});
