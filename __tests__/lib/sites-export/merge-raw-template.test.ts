import { compsV2ExportRowToSitesTemplate } from '@/lib/comps-v2/sites-template-export';
import type { CompsV2ExportRow } from '@/lib/comps-v2/export-expand';
import { mergeHipcampspotRawIntoRow } from '@/lib/sites-export/merge-raw-template';

function baseExportRow(): CompsV2ExportRow {
  return {
    property_name: 'Test',
    city: 'Austin',
    state: 'Texas',
    unit_type: 'Tent',
    property_total_sites: 10,
    quantity_of_units: 2,
    avg_retail_daily_rate: 100,
    high_rate: 120,
    low_rate: 80,
    seasonal_rates: {
      winter_weekday: null,
      winter_weekend: null,
      spring_weekday: null,
      spring_weekend: null,
      summer_weekday: null,
      summer_weekend: null,
      fall_weekday: null,
      fall_weekend: null,
    },
    operating_season_months: null,
    url: null,
    description: null,
    distance_miles: null,
    source_table: 'hipcamp',
    geo_lat: 30,
    geo_lng: -97,
    stable_id: 'abc123',
    source_row_id: '1',
    property_type: null,
    adr_quality_tier: 'mid',
    export_stable_id: 'abc123',
    site_index: 1,
    sites_in_property_record: 1,
  };
}

describe('mergeHipcampspotRawIntoRow', () => {
  it('overlays amenity and core fields from raw hipcamp row', () => {
    const tmpl = compsV2ExportRowToSitesTemplate(baseExportRow());
    mergeHipcampspotRawIntoRow(tmpl, {
      duplicatenote: 'dup',
      pool: 'Yes',
      toilet: 'Yes',
      avg_retail_daily_rate_2025: '199.5',
    });
    expect(tmpl[0]).toBe('dup');
    expect(tmpl[63]).toBe('Yes');
    expect(tmpl[61]).toBe('Yes');
    expect(tmpl[23]).toBe('199.5');
  });
});
