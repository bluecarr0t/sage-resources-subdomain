/**
 * Trusted origin for server-side internal fetches (never trust Host / x-forwarded-host).
 */

function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

/**
 * Resolve the app origin for loopback admin API calls that attach ADMIN_INTERNAL_API_KEY.
 * Prefer SITE_URL / NEXT_PUBLIC_SITE_URL / VERCEL_URL — never request Host headers.
 */
export function getTrustedAppOrigin(): string {
  const fromSite =
    normalizeOrigin(process.env.SITE_URL ?? '') ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? '');
  if (fromSite) return fromSite;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const origin = normalizeOrigin(vercel.startsWith('http') ? vercel : `https://${vercel}`);
    if (origin) return origin;
  }

  // Match `next dev -p 3003` from package.json scripts
  return 'http://localhost:3003';
}
