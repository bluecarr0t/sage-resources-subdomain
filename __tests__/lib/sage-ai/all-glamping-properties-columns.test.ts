import {
  isGlampingEqFilterColumn,
  isGlampingGroupByColumn,
  isGlampingDistinctColumn,
} from '@/lib/sage-ai/all-glamping-properties-columns';

describe('all-glamping-properties-columns', () => {
  it('treats structured feature flags as eq-filterable', () => {
    expect(isGlampingEqFilterColumn('property_pool')).toBe(true);
    expect(isGlampingEqFilterColumn('unit_private_bathroom')).toBe(true);
    expect(isGlampingEqFilterColumn('unit_hot_tub')).toBe(true);
    expect(isGlampingEqFilterColumn('activities_hiking')).toBe(true);
  });

  it('excludes long-text / JSON columns from eq filters', () => {
    expect(isGlampingEqFilterColumn('description')).toBe(false);
    expect(isGlampingEqFilterColumn('rate_unit_rates_by_year')).toBe(false);
  });

  it('allows group_by on flags but not on description', () => {
    expect(isGlampingGroupByColumn('property_pool')).toBe(true);
    expect(isGlampingGroupByColumn('description')).toBe(false);
  });

  it('allows distinct on id for tooling but excludes description', () => {
    expect(isGlampingDistinctColumn('id')).toBe(false);
    expect(isGlampingDistinctColumn('property_pool')).toBe(true);
    expect(isGlampingDistinctColumn('unit_private_bathroom')).toBe(true);
    expect(isGlampingDistinctColumn('description')).toBe(false);
  });
});
