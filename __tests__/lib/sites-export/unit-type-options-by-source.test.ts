import {
  labelRoverpassUnitTypeSlug,
  sitesExportMergedUnitTypeOptionValues,
  sitesExportUnitTypeOptionValuesForTable,
} from '@/lib/sites-export/unit-type-options-by-source';
import { SITE_EXPORT_TABLES } from '@/lib/sites-export/constants';

describe('sitesExportUnitTypeOptionValuesForTable', () => {
  it('returns Campspot-aligned tokens for campspot', () => {
    expect(sitesExportUnitTypeOptionValuesForTable('campspot')).toEqual([
      'Lodging',
      'Tent Sites',
      'RV Site',
    ]);
  });

  it('returns glamping catalog list for hipcamp and sage', () => {
    const hip = sitesExportUnitTypeOptionValuesForTable('hipcamp');
    const sage = sitesExportUnitTypeOptionValuesForTable('all_glamping_properties');
    expect(hip.length).toBeGreaterThan(10);
    expect(sage).toEqual(hip);
    expect(hip).toContain('Yurt');
  });

  it('returns roverpass site_type slugs', () => {
    const r = sitesExportUnitTypeOptionValuesForTable('all_roverpass_data_new');
    expect(r).toContain('rv_site');
    expect(r).toContain('tent');
  });
});

describe('sitesExportMergedUnitTypeOptionValues', () => {
  it('dedupes and includes tokens from every table when all sources are selected', () => {
    const merged = sitesExportMergedUnitTypeOptionValues([...SITE_EXPORT_TABLES]);
    expect(merged).toContain('Lodging');
    expect(merged).toContain('rv_site');
    expect(merged).toContain('Yurt');
    expect(merged.length).toBe(new Set(merged).size);
  });
});

describe('labelRoverpassUnitTypeSlug', () => {
  it('uses RV acronym', () => {
    expect(labelRoverpassUnitTypeSlug('rv_site')).toBe('RV Site');
  });
});
