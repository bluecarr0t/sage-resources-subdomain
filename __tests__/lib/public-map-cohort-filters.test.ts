import fs from 'fs';
import path from 'path';
import {
  isExcludedPropertyTypeForPublicMap,
  PUBLIC_MAP_EXCLUDED_PROPERTY_TYPES,
} from '@/lib/public-map-cohort-filters';

describe('public-map-cohort-filters', () => {
  it('excludes Campground, RV Resort, Outdoor Boutique Hotel, and Unknown', () => {
    expect(PUBLIC_MAP_EXCLUDED_PROPERTY_TYPES).toEqual([
      'Campground',
      'RV Resort',
      'Outdoor Boutique Hotel',
      'Unknown',
    ]);
    expect(isExcludedPropertyTypeForPublicMap('Campground')).toBe(true);
    expect(isExcludedPropertyTypeForPublicMap('RV Resort')).toBe(true);
    expect(isExcludedPropertyTypeForPublicMap('Outdoor Boutique Hotel')).toBe(true);
    expect(isExcludedPropertyTypeForPublicMap('Unknown')).toBe(true);
    expect(isExcludedPropertyTypeForPublicMap('Glamping')).toBe(false);
    expect(isExcludedPropertyTypeForPublicMap(null)).toBe(false);
    expect(isExcludedPropertyTypeForPublicMap('')).toBe(false);
    expect(isExcludedPropertyTypeForPublicMap('  Campground  ')).toBe(true);
  });

  it('does not apply map property_type exclusions to published listing pages', () => {
    const publishedPagesPath = path.join(
      process.cwd(),
      'lib/published-property-pages.ts'
    );
    const source = fs.readFileSync(publishedPagesPath, 'utf8');
    expect(source).not.toContain('public-map-cohort-filters');
    expect(source).not.toContain('isExcludedPropertyTypeForPublicMap');
  });
});
