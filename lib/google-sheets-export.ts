import { google, type drive_v3, type sheets_v4 } from 'googleapis';

export type GoogleSheetsExportRow = Record<string, unknown>;

export type GoogleServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

function normalizeCell(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Build A1 grid values: header row plus one row per export record. */
export function buildSheetGridValues(
  rows: readonly GoogleSheetsExportRow[],
  columnOrder: readonly string[]
): string[][] {
  const headers = [...columnOrder];
  const body = rows.map((row) => headers.map((column) => normalizeCell(row[column])));
  return [headers, ...body];
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n');
}

function parseServiceAccountJsonBlob(raw: string): GoogleServiceAccountCredentials | null {
  let json = raw.trim();
  if (!json) return null;

  if (
    (json.startsWith("'") && json.endsWith("'")) ||
    (json.startsWith('"') && json.endsWith('"') && !json.startsWith('{"'))
  ) {
    json = json.slice(1, -1);
  }

  try {
    const parsed = JSON.parse(json) as {
      client_email?: string;
      private_key?: string;
    };
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: normalizePrivateKey(parsed.private_key),
      };
    }
  } catch {
    return null;
  }

  return null;
}

/** Read service-account credentials from env (JSON blob or email + key). */
export function parseGoogleServiceAccountFromEnv(
  env: NodeJS.ProcessEnv = process.env
): GoogleServiceAccountCredentials | null {
  const json = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const fromJson = parseServiceAccountJsonBlob(json);
    if (fromJson) return fromJson;
  }

  const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!clientEmail || !privateKey) return null;

  return {
    client_email: clientEmail,
    private_key: normalizePrivateKey(privateKey),
  };
}

export type GoogleSheetsExportAuthMode = 'service_account' | 'oauth';

export function getGoogleSheetsOAuthClientIdFromEnv(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const clientId = env.NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID?.trim();
  return clientId || null;
}

export function getGoogleSheetsExportAuthMode(
  env: NodeJS.ProcessEnv = process.env
): GoogleSheetsExportAuthMode | null {
  if (parseGoogleServiceAccountFromEnv(env)) return 'service_account';
  if (getGoogleSheetsOAuthClientIdFromEnv(env)) return 'oauth';
  return null;
}

export function isGoogleSheetsExportConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return getGoogleSheetsExportAuthMode(env) !== null;
}

export function buildGoogleSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

type GoogleClients = {
  sheets: sheets_v4.Sheets;
  drive: drive_v3.Drive;
};

function createGoogleClients(credentials: GoogleServiceAccountCredentials): GoogleClients {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}

function createGoogleClientsFromAccessToken(accessToken: string): GoogleClients {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}

export type CreateGoogleSheetFromRowsInput = {
  title: string;
  rows: readonly GoogleSheetsExportRow[];
  columns: readonly string[];
  clients?: GoogleClients;
  /** User OAuth token from the browser (alternative to service account keys). */
  accessToken?: string;
  /** When false, skip link sharing (used for user-owned OAuth sheets). */
  shareWithAnyone?: boolean;
};

export type CreateGoogleSheetFromRowsResult = {
  spreadsheetId: string;
  url: string;
};

export type GoogleSheetExportTab = {
  title: string;
  rows: readonly GoogleSheetsExportRow[];
  columns: readonly string[];
};

export type CreateGoogleSheetFromTabsInput = {
  title: string;
  tabs: readonly GoogleSheetExportTab[];
  clients?: GoogleClients;
  accessToken?: string;
  shareWithAnyone?: boolean;
};

function sanitizeGoogleSheetTabTitle(title: string, fallback: string): string {
  const cleaned = title.replace(/[\\/?*[\]]/g, ' ').trim();
  return (cleaned || fallback).slice(0, 100);
}

/**
 * Create a spreadsheet with multiple tabs, populate each, and optionally share read-only.
 */
export async function createGoogleSheetFromTabs(
  input: CreateGoogleSheetFromTabsInput
): Promise<CreateGoogleSheetFromRowsResult> {
  const { title, tabs, clients, accessToken } = input;
  const shareWithAnyone = input.shareWithAnyone ?? !accessToken;

  if (!tabs.length) {
    throw new Error('Cannot create Google Sheet without export tabs');
  }

  const resolvedClients =
    clients ??
    (() => {
      if (accessToken) {
        return createGoogleClientsFromAccessToken(accessToken);
      }
      const credentials = parseGoogleServiceAccountFromEnv();
      if (!credentials) {
        throw new Error('Google Sheets export is not configured');
      }
      return createGoogleClients(credentials);
    })();

  const sheetTitles = tabs.map((tab, index) =>
    sanitizeGoogleSheetTabTitle(tab.title, `Sheet${index + 1}`)
  );

  const createResponse = await resolvedClients.sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: sheetTitles.map((sheetTitle) => ({
        properties: { title: sheetTitle },
      })),
    },
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Google Sheets API did not return a spreadsheet id');
  }

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    const sheetTitle = sheetTitles[index];
    const values = buildSheetGridValues(tab.rows, tab.columns);

    await resolvedClients.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  if (shareWithAnyone) {
    try {
      await resolvedClients.drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          type: 'anyone',
          role: 'reader',
        },
      });
    } catch (permissionError) {
      console.error('[google-sheets-export] failed to share spreadsheet', permissionError);
      throw new Error(
        'Google Sheet was created but could not be shared. Enable the Google Drive API for the service account project.'
      );
    }
  }

  return {
    spreadsheetId,
    url: buildGoogleSheetUrl(spreadsheetId),
  };
}

/**
 * Create a new Google Sheet owned by the service account, populate it, and share
 * read-only with anyone who has the link (no Google sign-in required to view).
 */
export async function createGoogleSheetFromRows(
  input: CreateGoogleSheetFromRowsInput
): Promise<CreateGoogleSheetFromRowsResult> {
  const { title, rows, columns, clients, accessToken } = input;
  const shareWithAnyone = input.shareWithAnyone ?? !accessToken;
  if (!rows.length) {
    throw new Error('Cannot create Google Sheet from empty export');
  }

  return createGoogleSheetFromTabs({
    title,
    tabs: [{ title: 'Sheet1', rows, columns }],
    clients,
    accessToken,
    shareWithAnyone,
  });
}
