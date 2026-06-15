/** Scopes for creating a spreadsheet in the signed-in user's Google Drive. */
export const GOOGLE_SHEETS_EXPORT_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
] as const;

export function googleSheetsExportOAuthScopeString(): string {
  return GOOGLE_SHEETS_EXPORT_OAUTH_SCOPES.join(' ');
}
