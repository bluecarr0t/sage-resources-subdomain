/** Browser-safe Google Sheets error classifiers (no Node / googleapis imports). */

export function isGoogleSheetsPermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /caller does not have permission/i.test(message) ||
    /permission denied/i.test(message) ||
    /does not have access/i.test(message) ||
    /\b403\b/.test(message)
  );
}

/** True when Google rejected the OAuth access token (expired, revoked, or missing). */
export function isGoogleSheetsOAuthAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /invalid credentials/i.test(message) ||
    /invalid authentication credentials/i.test(message) ||
    /login required/i.test(message) ||
    /unauthenticated/i.test(message) ||
    /invalid_grant/i.test(message) ||
    /invalid.?token/i.test(message) ||
    /access.?token.*(expired|invalid|revoked)/i.test(message) ||
    /Request had invalid authentication credentials/i.test(message) ||
    /\b401\b/.test(message)
  );
}
