/** Scopes for creating a spreadsheet in the signed-in user's Google Drive. */
export const GOOGLE_SHEETS_EXPORT_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
] as const;

/** Scopes for reading spreadsheets the user already has access to. */
export const GOOGLE_SHEETS_READ_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
] as const;

export function googleSheetsExportOAuthScopeString(): string {
  return GOOGLE_SHEETS_EXPORT_OAUTH_SCOPES.join(' ');
}

/** Scopes for reading and editing the project pipeline spreadsheet. */
export const GOOGLE_SHEETS_PIPELINE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
] as const;

export function googleSheetsPipelineOAuthScopeString(): string {
  return GOOGLE_SHEETS_PIPELINE_OAUTH_SCOPES.join(' ');
}

export function googleSheetsReadOAuthScopeString(): string {
  return GOOGLE_SHEETS_READ_OAUTH_SCOPES.join(' ');
}
