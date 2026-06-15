import {
  buildGoogleSheetUrl,
  buildSheetGridValues,
  createGoogleSheetFromRows,
  createGoogleSheetFromTabs,
  getGoogleSheetsExportAuthMode,
  isGoogleSheetsExportConfigured,
  parseGoogleServiceAccountFromEnv,
} from '@/lib/google-sheets-export';
import { PIPELINE_QUARTERLY_EXPORT_COLUMNS } from '@/lib/pipeline-quarterly/export-rows';

describe('buildSheetGridValues', () => {
  it('builds a header row and stringified body rows in column order', () => {
    const grid = buildSheetGridValues(
      [
        {
          property_name: 'Alpine Camp',
          state: 'Colorado',
          total_units: 12,
          rate_avg_retail_daily_rate: 264,
        },
      ],
      PIPELINE_QUARTERLY_EXPORT_COLUMNS
    );

    expect(grid[0]).toEqual([...PIPELINE_QUARTERLY_EXPORT_COLUMNS]);
    expect(grid[1][0]).toBe('Alpine Camp');
    expect(grid[1][3]).toBe('Colorado');
    expect(grid[1][10]).toBe('12');
    expect(grid[1][13]).toBe('264');
  });

  it('fills missing columns with empty strings', () => {
    const grid = buildSheetGridValues(
      [{ property_name: 'Only Name' }],
      ['property_name', 'state', 'city']
    );

    expect(grid).toEqual([
      ['property_name', 'state', 'city'],
      ['Only Name', '', ''],
    ]);
  });
});

describe('parseGoogleServiceAccountFromEnv', () => {
  it('parses split email and private key env vars', () => {
    const credentials = parseGoogleServiceAccountFromEnv({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: 'export@test.iam.gserviceaccount.com',
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });

    expect(credentials).toEqual({
      client_email: 'export@test.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });
  });

  it('parses a JSON service account blob', () => {
    const credentials = parseGoogleServiceAccountFromEnv({
      GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: 'json@test.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nxyz\\n-----END PRIVATE KEY-----\\n',
      }),
    });

    expect(credentials?.client_email).toBe('json@test.iam.gserviceaccount.com');
    expect(credentials?.private_key).toContain('\nxyz\n');
  });

  it('returns null when credentials are missing', () => {
    expect(parseGoogleServiceAccountFromEnv({})).toBeNull();
    expect(isGoogleSheetsExportConfigured({})).toBe(false);
    expect(getGoogleSheetsExportAuthMode({})).toBeNull();
  });

  it('prefers service account over OAuth when both are set', () => {
    expect(
      getGoogleSheetsExportAuthMode({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: 'export@test.iam.gserviceaccount.com',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
        NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID: '123.apps.googleusercontent.com',
      })
    ).toBe('service_account');
  });

  it('uses OAuth mode when only the web client id is configured', () => {
    expect(
      getGoogleSheetsExportAuthMode({
        NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID: '123.apps.googleusercontent.com',
      })
    ).toBe('oauth');
    expect(
      isGoogleSheetsExportConfigured({
        NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID: '123.apps.googleusercontent.com',
      })
    ).toBe(true);
  });
});

describe('buildGoogleSheetUrl', () => {
  it('builds an edit URL for the spreadsheet id', () => {
    expect(buildGoogleSheetUrl('abc123')).toBe(
      'https://docs.google.com/spreadsheets/d/abc123/edit'
    );
  });
});

describe('createGoogleSheetFromRows', () => {
  it('creates, populates, and shares a spreadsheet via injected clients', async () => {
    const sheetsCreate = jest.fn().mockResolvedValue({
      data: {
        spreadsheetId: 'sheet-123',
        sheets: [{ properties: { title: 'Sheet1' } }],
      },
    });
    const valuesUpdate = jest.fn().mockResolvedValue({});
    const permissionsCreate = jest.fn().mockResolvedValue({});

    const result = await createGoogleSheetFromRows({
      title: 'pipeline-quarterly-2026-06-10',
      rows: [{ property_name: 'Test Glamp', state: 'Texas' }],
      columns: ['property_name', 'state'],
      clients: {
        sheets: {
          spreadsheets: {
            create: sheetsCreate,
            values: { update: valuesUpdate },
          },
        } as never,
        drive: {
          permissions: { create: permissionsCreate },
        } as never,
      },
    });

    expect(result).toEqual({
      spreadsheetId: 'sheet-123',
      url: 'https://docs.google.com/spreadsheets/d/sheet-123/edit',
    });
    expect(sheetsCreate).toHaveBeenCalledWith({
      requestBody: {
        properties: { title: 'pipeline-quarterly-2026-06-10' },
        sheets: [{ properties: { title: 'Sheet1' } }],
      },
    });
    expect(valuesUpdate).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-123',
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['property_name', 'state'],
          ['Test Glamp', 'Texas'],
        ],
      },
    });
    expect(permissionsCreate).toHaveBeenCalledWith({
      fileId: 'sheet-123',
      requestBody: { type: 'anyone', role: 'reader' },
    });
  });

  it('rejects empty exports', async () => {
    await expect(
      createGoogleSheetFromRows({
        title: 'empty',
        rows: [],
        columns: ['property_name'],
        clients: {
          sheets: { spreadsheets: { create: jest.fn() } } as never,
          drive: { permissions: { create: jest.fn() } } as never,
        },
      })
    ).rejects.toThrow('Cannot create Google Sheet from empty export');
  });

  it('skips public sharing when shareWithAnyone is false', async () => {
    const sheetsCreate = jest.fn().mockResolvedValue({
      data: {
        spreadsheetId: 'sheet-oauth',
        sheets: [{ properties: { title: 'Sheet1' } }],
      },
    });
    const valuesUpdate = jest.fn().mockResolvedValue({});
    const permissionsCreate = jest.fn().mockResolvedValue({});

    await createGoogleSheetFromRows({
      title: 'oauth-export',
      rows: [{ property_name: 'OAuth Camp' }],
      columns: ['property_name'],
      shareWithAnyone: false,
      clients: {
        sheets: {
          spreadsheets: {
            create: sheetsCreate,
            values: { update: valuesUpdate },
          },
        } as never,
        drive: {
          permissions: { create: permissionsCreate },
        } as never,
      },
    });

    expect(permissionsCreate).not.toHaveBeenCalled();
  });
});

describe('createGoogleSheetFromTabs', () => {
  it('creates and populates multiple worksheet tabs', async () => {
    const sheetsCreate = jest.fn().mockResolvedValue({
      data: { spreadsheetId: 'multi-123' },
    });
    const valuesUpdate = jest.fn().mockResolvedValue({});
    const permissionsCreate = jest.fn().mockResolvedValue({});

    const result = await createGoogleSheetFromTabs({
      title: 'pipeline-export',
      tabs: [
        {
          title: 'Properties',
          rows: [{ property_name: 'Camp A', total_units: 10 }],
          columns: ['property_name', 'total_units'],
        },
        {
          title: 'Unit mix',
          rows: [{ property_name: 'Camp A', unit_type: 'Yurt', units: 10 }],
          columns: ['property_name', 'unit_type', 'units'],
        },
      ],
      clients: {
        sheets: {
          spreadsheets: {
            create: sheetsCreate,
            values: { update: valuesUpdate },
          },
        } as never,
        drive: {
          permissions: { create: permissionsCreate },
        } as never,
      },
    });

    expect(result.spreadsheetId).toBe('multi-123');
    expect(valuesUpdate).toHaveBeenCalledTimes(2);
    expect(valuesUpdate).toHaveBeenNthCalledWith(1, {
      spreadsheetId: 'multi-123',
      range: 'Properties!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['property_name', 'total_units'],
          ['Camp A', '10'],
        ],
      },
    });
  });
});
