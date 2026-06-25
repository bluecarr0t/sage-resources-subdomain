const STORAGE_KEY = 'sage-google-sheets-oauth';

/** Refresh one minute before Google reports expiry. */
const EXPIRY_BUFFER_MS = 60_000;

/** Soft re-auth prompt when this many ms remain before token expiry (~10 min on a 60 min token). */
export const GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS = 10 * 60_000;

const DEFAULT_EXPIRES_IN_SECONDS = 3600;

type StoredGoogleSheetsOAuth = {
  accessToken: string;
  expiresAt: number;
  scope: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function readGoogleSheetsOAuthAccessToken(scope: string): string | null {
  return readStoredGoogleSheetsOAuth(scope)?.accessToken ?? null;
}

export function writeGoogleSheetsOAuthAccessToken(
  accessToken: string,
  scope: string,
  expiresInSeconds: number = DEFAULT_EXPIRES_IN_SECONDS
): void {
  if (!isBrowser()) return;

  const trimmed = accessToken.trim();
  if (!trimmed) return;

  const payload: StoredGoogleSheetsOAuth = {
    accessToken: trimmed,
    scope,
    expiresAt: Date.now() + Math.max(expiresInSeconds * 1000 - EXPIRY_BUFFER_MS, 0),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function clearGoogleSheetsOAuthAccessToken(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

function readStoredGoogleSheetsOAuth(scope: string): StoredGoogleSheetsOAuth | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredGoogleSheetsOAuth;
    if (stored.scope !== scope) return null;
    if (!stored.accessToken?.trim()) return null;
    if (stored.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

export function readGoogleSheetsOAuthExpiresAt(scope: string): number | null {
  return readStoredGoogleSheetsOAuth(scope)?.expiresAt ?? null;
}

/** True when the stored token will expire soon and the user should reconnect. */
export function shouldPromptGoogleSheetsOAuthReconnect(
  scope: string,
  remainingMs: number = GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS
): boolean {
  const expiresAt = readGoogleSheetsOAuthExpiresAt(scope);
  if (!expiresAt) return false;
  return expiresAt - Date.now() <= remainingMs;
}
