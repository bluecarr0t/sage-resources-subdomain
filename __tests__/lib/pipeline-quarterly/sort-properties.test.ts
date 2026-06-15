import {
  getPipelinePropertyInitialSort,
  nextPipelinePropertySortState,
  PIPELINE_PROPERTY_DEFAULT_SORT_DIRECTION,
  PIPELINE_PROPERTY_INITIAL_SORT,
  sortPipelineQuarterlyProperties,
} from '@/lib/pipeline-quarterly/sort-properties';
import type { PipelineQuarterlyPropertyRow } from '@/lib/pipeline-quarterly/fetch-status-breakdown';

function row(
  overrides: Partial<PipelineQuarterlyPropertyRow> & Pick<PipelineQuarterlyPropertyRow, 'id' | 'propertyName'>
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
    isOpenLabel: 'Proposed Development',
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
    ...overrides,
  };
}

describe('sortPipelineQuarterlyProperties', () => {
  it('sorts property names ascending by default direction', () => {
    const rows = [
      row({ id: 1, propertyName: 'Zion Camp' }),
      row({ id: 2, propertyName: 'Alpine Camp' }),
    ];

    expect(
      sortPipelineQuarterlyProperties(rows, 'property', 'asc').map((r) => r.propertyName)
    ).toEqual(['Alpine Camp', 'Zion Camp']);
  });

  it('sorts brand names ascending', () => {
    const rows = [
      row({ id: 1, propertyName: 'A', brandName: 'Under Canvas' }),
      row({ id: 2, propertyName: 'B', brandName: 'AutoCamp' }),
    ];

    expect(
      sortPipelineQuarterlyProperties(rows, 'brand', 'asc').map((r) => r.brandName)
    ).toEqual(['AutoCamp', 'Under Canvas']);
  });

  it('sorts units descending with null-like zeros ordered numerically', () => {
    const rows = [
      row({ id: 1, propertyName: 'A', units: 5 }),
      row({ id: 2, propertyName: 'B', units: 48 }),
      row({ id: 3, propertyName: 'C', units: 0 }),
    ];

    expect(
      sortPipelineQuarterlyProperties(rows, 'units', 'desc').map((r) => r.units)
    ).toEqual([48, 5, 0]);
  });

  it('puts null acres last when sorting descending', () => {
    const rows = [
      row({ id: 1, propertyName: 'A', acres: null }),
      row({ id: 2, propertyName: 'B', acres: 40 }),
      row({ id: 3, propertyName: 'C', acres: 10 }),
    ];

    expect(
      sortPipelineQuarterlyProperties(rows, 'acres', 'desc').map((r) => r.acres)
    ).toEqual([40, 10, null]);
  });

  it('sorts planned open ascending with unknown dates last', () => {
    expect(PIPELINE_PROPERTY_DEFAULT_SORT_DIRECTION.plannedOpen).toBe('asc');

    const rows = [
      row({ id: 1, propertyName: 'Unknown A', plannedOpenDate: null }),
      row({ id: 2, propertyName: 'Later', plannedOpenDate: '2027-06-01' }),
      row({ id: 3, propertyName: 'Sooner', plannedOpenDate: '2026-06-01' }),
      row({ id: 4, propertyName: 'Unknown B', plannedOpenDate: '' }),
    ];

    expect(
      sortPipelineQuarterlyProperties(rows, 'plannedOpen', 'asc').map((r) => r.propertyName)
    ).toEqual(['Sooner', 'Later', 'Unknown A', 'Unknown B']);
  });

  it('sorts planned open descending with unknown dates still last', () => {
    const rows = [
      row({ id: 1, propertyName: 'Unknown', plannedOpenDate: null }),
      row({ id: 2, propertyName: 'Later', plannedOpenDate: '2027-06-01' }),
      row({ id: 3, propertyName: 'Sooner', plannedOpenDate: '2026-06-01' }),
    ];

    expect(
      sortPipelineQuarterlyProperties(rows, 'plannedOpen', 'desc').map((r) => r.propertyName)
    ).toEqual(['Later', 'Sooner', 'Unknown']);
  });

  it('sorts avg rate descending by default direction constant', () => {
    expect(PIPELINE_PROPERTY_DEFAULT_SORT_DIRECTION.avgRate).toBe('desc');

    const rows = [
      row({ id: 1, propertyName: 'A', avgRetailDailyRate: 170 }),
      row({ id: 2, propertyName: 'B', avgRetailDailyRate: 493 }),
      row({ id: 3, propertyName: 'C', avgRetailDailyRate: null }),
    ];

    expect(
      sortPipelineQuarterlyProperties(rows, 'avgRate', 'desc').map((r) => r.avgRetailDailyRate)
    ).toEqual([493, 170, null]);
  });
});

describe('nextPipelinePropertySortState', () => {
  it('uses the column default direction when switching columns', () => {
    expect(
      nextPipelinePropertySortState(
        { column: 'property', direction: 'asc' },
        'units'
      )
    ).toEqual({ column: 'units', direction: 'desc' });
  });

  it('toggles direction when clicking the active column', () => {
    expect(
      nextPipelinePropertySortState(
        { column: 'state', direction: 'asc' },
        'state'
      )
    ).toEqual({ column: 'state', direction: 'desc' });
  });

  it('defaults planned open to ascending on first click', () => {
    expect(
      nextPipelinePropertySortState(
        { column: 'property', direction: 'asc' },
        'plannedOpen'
      )
    ).toEqual({ column: 'plannedOpen', direction: 'asc' });
  });
});

describe('getPipelinePropertyInitialSort', () => {
  it('defaults under-construction to planned open ascending', () => {
    expect(getPipelinePropertyInitialSort('under-construction')).toEqual({
      column: 'plannedOpen',
      direction: 'asc',
    });
  });

  it('keeps property name sort for other statuses', () => {
    expect(getPipelinePropertyInitialSort('open')).toEqual(PIPELINE_PROPERTY_INITIAL_SORT);
    expect(getPipelinePropertyInitialSort('proposed-development')).toEqual(
      PIPELINE_PROPERTY_INITIAL_SORT
    );
  });
});
