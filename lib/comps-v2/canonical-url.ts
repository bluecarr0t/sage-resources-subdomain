/**
 * Stable key for URL dedupe (host + path, www stripped, trailing slash normalized).
 */
export function canonicalUrlKeyForDedupe(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const path = (u.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    return `${host}${path}`;
  } catch {
    return null;
  }
}
