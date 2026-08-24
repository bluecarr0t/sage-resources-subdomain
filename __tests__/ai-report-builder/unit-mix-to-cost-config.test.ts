import { mapUnitMixToCostConfigs } from '@/lib/ai-report-builder/unit-mix-to-cost-config';

describe('mapUnitMixToCostConfigs', () => {
  it('returns unmapped types that have no cost slug', () => {
    const result = mapUnitMixToCostConfigs([
      { type: 'Cabin', count: 4 },
      { type: 'Unobtanium Pod', count: 2 },
      { type: 'RV Site - Full Hookup', count: 6 },
    ]);

    expect(result.configs).toHaveLength(2);
    expect(result.unmappedTypes).toEqual(['Unobtanium Pod']);
  });
});
