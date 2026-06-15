/**
 * Live Google Sheets smoke test. Skips unless service-account credentials are set.
 */

import {
  createGoogleSheetFromRows,
  isGoogleSheetsExportConfigured,
} from '@/lib/google-sheets-export';
import { PIPELINE_QUARTERLY_EXPORT_COLUMNS } from '@/lib/pipeline-quarterly/export-rows';

const runLive = isGoogleSheetsExportConfigured();
const describeLive = runLive ? describe : describe.skip;

describeLive('google sheets export (live service account)', () => {
  it('creates a populated spreadsheet with a public view link', async () => {
    const title = `pipeline-quarterly-test-${new Date().toISOString()}`;

    const result = await createGoogleSheetFromRows({
      title,
      rows: [
        {
          property_name: 'Integration Test Property',
          state: 'California',
          country: 'United States',
          is_open: 'Proposed Development',
          unit_type: 'Safari Tent',
          units: 3,
          acres: 10,
          glamping_service_tier: 'comfort',
          planned_open_date: '2027-01-01',
          rate_avg_retail_daily_rate: 199,
          city: 'Sonoma',
        },
      ],
      columns: PIPELINE_QUARTERLY_EXPORT_COLUMNS,
    });

    expect(result.spreadsheetId).toMatch(/^[a-zA-Z0-9-_]+$/);
    expect(result.url).toBe(
      `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit`
    );

    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/export?format=csv`
    );
    expect(response.ok).toBe(true);

    const csv = await response.text();
    expect(csv).toContain('Integration Test Property');
    expect(csv).toContain('California');
  }, 30_000);
});
