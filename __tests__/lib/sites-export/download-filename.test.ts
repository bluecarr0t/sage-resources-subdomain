import {
  buildSitesExportDownloadFilename,
  sitesExportGeoFilenameSegment,
} from '@/lib/sites-export/download-filename';
import type { SitesExportParsed } from '@/lib/sites-export/types';

function baseParsed(over: Partial<SitesExportParsed>): SitesExportParsed {
  return {
    sources: ['campspot'],
    countries: [],
    states: [],
    unitTypes: [],
    zip: '',
    radiusMiles: null,
    format: 'csv',
    centerLat: null,
    centerLng: null,
    radiusMilesResolved: null,
    ...over,
  };
}

describe('sitesExportGeoFilenameSegment', () => {
  it('uses zip and mile radius when present', () => {
    expect(
      sitesExportGeoFilenameSegment(
        baseParsed({ zip: '96094', radiusMiles: 200, radiusMilesResolved: 200 })
      )
    ).toBe('zip-96094-200mi');
  });

  it('sanitizes zip to alphanumerics and hyphen', () => {
    expect(
      sitesExportGeoFilenameSegment(
        baseParsed({ zip: 'K1A 0B1', radiusMiles: 50, radiusMilesResolved: 50 })
      )
    ).toBe('zip-K1A0B1-50mi');
  });

  it('uses sorted state abbreviations when no zip filter', () => {
    expect(
      sitesExportGeoFilenameSegment(baseParsed({ states: ['CA', 'ny'], zip: '', radiusMiles: null }))
    ).toBe('states-CA-NY');
  });

  it('uses sorted country slugs when only countries', () => {
    expect(
      sitesExportGeoFilenameSegment(
        baseParsed({ countries: ['United States', 'Canada'], zip: '', radiusMiles: null })
      )
    ).toBe('countries-Canada-United-States');
  });

  it('prefers zip+radius over states when both sent (zip mode wins)', () => {
    expect(
      sitesExportGeoFilenameSegment(
        baseParsed({
          zip: '90210',
          radiusMiles: 25,
          radiusMilesResolved: 25,
          states: ['CA'],
          countries: ['United States'],
        })
      )
    ).toBe('zip-90210-25mi');
  });

  it('falls back to all-markets when no geo segment', () => {
    expect(sitesExportGeoFilenameSegment(baseParsed({}))).toBe('all-markets');
  });
});

describe('buildSitesExportDownloadFilename', () => {
  it('includes geo segment, date stamp, and extension', () => {
    expect(
      buildSitesExportDownloadFilename(
        baseParsed({ zip: '96094', radiusMiles: 200, radiusMilesResolved: 200 }),
        '2026-04-02',
        'csv'
      )
    ).toBe('sites-export-zip-96094-200mi-2026-04-02.csv');
  });
});
