import {
  expandSitesExportUnitTypesForQuery,
  SITES_EXPORT_UNIT_TYPE_FILTER_VALUES,
} from '@/lib/sites-export/campspot-unit-type-filter';

describe('expandSitesExportUnitTypesForQuery', () => {
  it('expands all three Campspot-aligned tokens', () => {
    expect(
      expandSitesExportUnitTypesForQuery([...SITES_EXPORT_UNIT_TYPE_FILTER_VALUES]).sort()
    ).toEqual(
      ['Lodging', 'RV Site', 'RV Sites', 'Tent', 'Tent Site', 'Tent Sites'].sort()
    );
  });

  it('expands Tent Sites only', () => {
    expect(expandSitesExportUnitTypesForQuery(['Tent Sites']).sort()).toEqual(
      ['Tent', 'Tent Site', 'Tent Sites'].sort()
    );
  });

  it('expands RV Site only', () => {
    expect(expandSitesExportUnitTypesForQuery(['RV Site']).sort()).toEqual(['RV Site', 'RV Sites'].sort());
  });

  it('passes through unknown values', () => {
    expect(expandSitesExportUnitTypesForQuery(['Cabin'])).toEqual(['Cabin']);
  });

  it('returns empty for empty input', () => {
    expect(expandSitesExportUnitTypesForQuery([])).toEqual([]);
  });
});
