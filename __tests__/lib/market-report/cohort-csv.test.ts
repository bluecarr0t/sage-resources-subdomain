import {
  buildCohortCsv,
  buildCohortXlsxBuffer,
  cohortCsvFilename,
  cohortXlsxFilename,
  collectUnionRawKeys,
  inferYearRound,
} from '@/lib/market-report/cohort-csv';
import type { DedupedCohortRow } from '@/lib/market-report/dedupe';

function makeRow(overrides: Partial<DedupedCohortRow> = {}): DedupedCohortRow {
  return {
    source: 'all_glamping_properties',
    sourceId: '1',
    property_name: 'Test Lodge',
    city: 'Bend',
    state: 'OR',
    property_type: 'Glamping',
    unit_type: 'Safari Tent',
    property_total_sites: 20,
    quantity_of_units: 4,
    distance_miles: 12.3,
    geo_lat: 44.0,
    geo_lng: -121.3,
    rate_avg: 425,
    winter_weekday: null,
    winter_weekend: null,
    spring_weekday: null,
    spring_weekend: null,
    summer_weekday: 450,
    summer_weekend: 525,
    fall_weekday: null,
    fall_weekend: null,
    occupancy: 62.5,
    operating_season_months: 'May – October',
    url: 'https://example.com',
    raw: null,
    rateTierRows: 3,
    rateLow: 350,
    rateHigh: 525,
    ...overrides,
  };
}

describe('inferYearRound', () => {
  it('returns Yes for explicit year-round phrasing', () => {
    expect(inferYearRound('Year-round')).toBe('Yes');
    expect(inferYearRound('Open all year')).toBe('Yes');
    expect(inferYearRound('JANUARY through December')).toBe('Yes');
  });

  it('returns Yes when all 12 month tokens appear', () => {
    expect(
      inferYearRound('jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec')
    ).toBe('Yes');
  });

  it('returns No for a partial-coverage season string', () => {
    expect(inferYearRound('May – October')).toBe('No');
    expect(inferYearRound('Memorial Day to Labor Day')).toBe('No');
  });

  it('returns Unknown for null/empty input', () => {
    expect(inferYearRound(null)).toBe('Unknown');
    expect(inferYearRound('')).toBe('Unknown');
    expect(inferYearRound('   ')).toBe('Unknown');
  });
});

describe('buildCohortCsv', () => {
  it('emits the expected header row', () => {
    const csv = buildCohortCsv({ rows: [] });
    const firstLine = csv.split('\n')[0]!.trim();
    expect(firstLine).toContain('source');
    expect(firstLine).toContain('source_id');
    expect(firstLine).toContain('property_name');
    expect(firstLine).toContain('adr_avg');
    expect(firstLine).toContain('adr_low');
    expect(firstLine).toContain('adr_high');
    expect(firstLine).toContain('year_round');
  });

  it('rounds rates and inlines the source label', () => {
    const csv = buildCohortCsv({ rows: [makeRow({ rate_avg: 425.789 })] });
    expect(csv).toContain('425.79');
    // Source label resolution should yield "Sage" or similar — at minimum it
    // must NOT be the bare table key when fed through marketReportSourceLabel.
    expect(csv).toMatch(/all_glamping_properties/);
    expect(csv).toContain('Test Lodge');
    expect(csv).toContain('Safari Tent');
  });

  it('renders empty cells (not "null" strings) for missing values', () => {
    const csv = buildCohortCsv({
      rows: [
        makeRow({
          rate_avg: null,
          rateLow: null,
          rateHigh: null,
          quantity_of_units: null,
          property_total_sites: null,
          occupancy: null,
          url: null,
          operating_season_months: null,
        }),
      ],
    });
    expect(csv).not.toContain('null');
    expect(csv).not.toContain('undefined');
    expect(csv).not.toContain('NaN');
  });

  it('falls through year_round to "Unknown" when seasons are absent', () => {
    const csv = buildCohortCsv({ rows: [makeRow({ operating_season_months: null })] });
    expect(csv).toContain('Unknown');
  });

  it('wide mode adds raw_* columns and JSON for nested raw values', () => {
    const rows = [
      makeRow({
        raw: { hot_tub: true, nested: { a: 1 } },
      }),
      makeRow({
        raw: { hot_tub: false, other_col: 'x' },
      }),
    ];
    expect(new Set(collectUnionRawKeys(rows))).toEqual(new Set(['hot_tub', 'nested', 'other_col']));
    const csv = buildCohortCsv({ rows, wide: true });
    expect(csv).toContain('raw_hot_tub');
    expect(csv).toContain('raw_nested');
    expect(csv).toContain('raw_other_col');
    expect(csv).toContain('""a""');
    expect(csv).toContain(':1');
  });
});

describe('cohortCsvFilename', () => {
  it('builds a national $300+ glamping filename', () => {
    expect(
      cohortCsvFilename({
        scope: 'national',
        segment: 'glamping',
        adrMin: 300,
        adrMax: null,
        radiusMiles: 0,
        addressLine: '',
      })
    ).toBe('national-glamping-300plus.csv');
  });

  it('includes the radius for local scope', () => {
    expect(
      cohortCsvFilename({
        scope: 'local',
        segment: 'rv_resort',
        adrMin: null,
        adrMax: null,
        radiusMiles: 50,
        addressLine: 'Lake Geneva, WI',
      })
    ).toBe('local-rv-all-rates-50mi.csv');
  });

  it('uses an under-N slug when only adrMax is set', () => {
    expect(
      cohortCsvFilename({
        scope: 'national',
        segment: 'glamping',
        adrMin: null,
        adrMax: 200,
        radiusMiles: 0,
        addressLine: '',
      })
    ).toBe('national-glamping-under200.csv');
  });
});

describe('cohortXlsxFilename', () => {
  it('mirrors cohort CSV basename with .xlsx extension', () => {
    expect(
      cohortXlsxFilename({
        scope: 'national',
        segment: 'glamping',
        adrMin: 300,
        adrMax: null,
        radiusMiles: 0,
        addressLine: '',
      })
    ).toBe('national-glamping-300plus.xlsx');
  });
});

describe('buildCohortXlsxBuffer', () => {
  it('writes a valid XLSX (ZIP) file', () => {
    const buf = buildCohortXlsxBuffer({ rows: [makeRow()] });
    expect(buf.subarray(0, 2).toString('utf8')).toBe('PK');
  });

  it('handles an empty cohort', () => {
    const buf = buildCohortXlsxBuffer({ rows: [] });
    expect(buf.subarray(0, 2).toString('utf8')).toBe('PK');
  });
});
