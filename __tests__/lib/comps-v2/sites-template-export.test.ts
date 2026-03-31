import type { CompsV2ExportRow } from '@/lib/comps-v2/export-expand';
import {
  SITES_TEMPLATE_HEADERS,
  compsV2ExportRowToSitesTemplate,
  formatSitesExportCalendarDate,
} from '@/lib/comps-v2/sites-template-export';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

const EMPTY_SEASONAL = {
  winter_weekday: null,
  winter_weekend: null,
  spring_weekday: null,
  spring_weekend: null,
  summer_weekday: null,
  summer_weekend: null,
  fall_weekday: null,
  fall_weekend: null,
};

function baseCandidate(over: Partial<CompsV2Candidate>): CompsV2Candidate {
  return {
    stable_id: 'test-1',
    property_name: 'Test Property',
    city: 'Austin',
    state: 'TX',
    unit_type: 'Safari tent',
    property_total_sites: 10,
    quantity_of_units: 10,
    avg_retail_daily_rate: 250,
    high_rate: 300,
    low_rate: 200,
    seasonal_rates: { ...EMPTY_SEASONAL },
    operating_season_months: 'Year-round',
    url: 'https://example.com/park',
    description: 'A nice place.',
    distance_miles: 12,
    source_table: 'all_glamping_properties',
    ...over,
  } as CompsV2Candidate;
}

describe('sites-template-export', () => {
  it('matches reference sites file column count (137)', () => {
    expect(SITES_TEMPLATE_HEADERS.length).toBe(137);
    expect(SITES_TEMPLATE_HEADERS[61]).toBe('Toilet');
    expect(SITES_TEMPLATE_HEADERS[SITES_TEMPLATE_HEADERS.length - 1]).toBe('Water Hookup');
  });

  it('emits one value per header', () => {
    const c = baseCandidate({});
    const row: CompsV2ExportRow = {
      ...c,
      export_stable_id: c.stable_id,
      site_index: 1,
      sites_in_property_record: 1,
    };
    const out = compsV2ExportRowToSitesTemplate(row, {
      exportDate: new Date('2026-03-27T12:00:00Z'),
    });
    expect(out.length).toBe(SITES_TEMPLATE_HEADERS.length);
  });

  it('maps core fields and full state name', () => {
    const c = baseCandidate({
      location_detail: '123 Main St · Austin, TX',
      geo_lat: 30.2,
      geo_lng: -97.7,
      market_occupancy_rate: 0.65,
    });
    const row: CompsV2ExportRow = {
      ...c,
      export_stable_id: c.stable_id,
      site_index: 1,
      sites_in_property_record: 1,
    };
    const out = compsV2ExportRowToSitesTemplate(row, {
      exportDate: new Date('2026-03-27T12:00:00Z'),
    });
    expect(out[4]).toBe('Test Property');
    expect(out[14]).toBe('Austin');
    expect(out[15]).toBe('Texas');
    expect(out[13]).toContain('123 Main St');
    expect(out[17]).toBe('United States');
    expect(out[22]).toBe('0.65');
    expect(out[23]).toBe('250');
    expect(out[55]).toBe('https://example.com/park');
    expect(out[59]).toBe(-97.7);
    expect(out[60]).toBe(30.2);
    expect(out[61]).toBe('No');
  });

  it('formats export dates as MM-DD-YYYY', () => {
    expect(formatSitesExportCalendarDate(new Date('2026-01-05T12:00:00Z'))).toBe('01-05-2026');
  });
});
