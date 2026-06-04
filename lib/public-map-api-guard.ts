export type PublicMapApiRequestLike = {
  headers: Pick<Headers, 'get'>;
};

/** Known scraper user-agent substrings (case-insensitive). */
export const DEFAULT_BLOCKED_USER_AGENT_SUBSTRINGS = ['OutReserveBot', 'OutReserve'];

/** IPs observed scraping public map APIs (Jun 2026). */
export const DEFAULT_BLOCKED_IPS = ['212.83.77.168'];

const PUBLIC_MAP_API_PATHS = new Set([
  '/api/properties',
  '/api/google-places',
]);

export function isPublicMapApiPath(pathname: string): boolean {
  return PUBLIC_MAP_API_PATHS.has(pathname);
}

export function getClientIpFromRequest(request: PublicMapApiRequestLike): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  if (realIp?.trim()) return realIp.trim();
  return 'unknown';
}

function parseCsvEnv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getBlockedUserAgentSubstrings(): string[] {
  const fromEnv = parseCsvEnv(process.env.PUBLIC_MAP_API_BLOCK_UA_SUBSTRINGS);
  return [...new Set([...DEFAULT_BLOCKED_USER_AGENT_SUBSTRINGS, ...fromEnv])];
}

function getBlockedIps(): string[] {
  const fromEnv = parseCsvEnv(process.env.PUBLIC_MAP_API_BLOCK_IPS);
  return [...new Set([...DEFAULT_BLOCKED_IPS, ...fromEnv])];
}

export function isBlockedScraperRequest(request: PublicMapApiRequestLike): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  const uaLower = ua.toLowerCase();
  if (getBlockedUserAgentSubstrings().some((s) => uaLower.includes(s.toLowerCase()))) {
    return true;
  }

  const ip = getClientIpFromRequest(request);
  if (getBlockedIps().includes(ip)) {
    return true;
  }

  return false;
}

function normalizeSiteOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Origins allowed to call public map JSON APIs from the browser. */
export function getAllowedPublicMapApiOrigins(): string[] {
  const origins = new Set<string>([
    'https://resources.sageoutdooradvisory.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  if (process.env.SITE_URL?.trim()) {
    origins.add(normalizeSiteOrigin(process.env.SITE_URL));
  }
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    origins.add(normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL));
  }
  if (process.env.VERCEL_URL?.trim()) {
    origins.add(`https://${process.env.VERCEL_URL.trim().replace(/\/$/, '')}`);
  }

  for (const extra of parseCsvEnv(process.env.PUBLIC_MAP_API_ALLOWED_ORIGINS)) {
    origins.add(normalizeSiteOrigin(extra));
  }

  return [...origins];
}

function matchesAllowedOrigin(value: string | null): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim();
  return getAllowedPublicMapApiOrigins().some(
    (origin) => normalized === origin || normalized.startsWith(`${origin}/`)
  );
}

/** Scripts, cron, and internal callers skip origin + rate limits when configured. */
export function hasTrustedPublicMapApiBypass(request: PublicMapApiRequestLike): boolean {
  const bypassSecret = process.env.PUBLIC_MAP_API_BYPASS_SECRET;
  if (bypassSecret && request.headers.get('x-public-map-api-key') === bypassSecret) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }

  const internalKey = process.env.ADMIN_INTERNAL_API_KEY;
  const internalHeader = request.headers.get('x-internal-api-key');
  if (internalKey && internalHeader && internalHeader === internalKey) {
    return true;
  }

  return false;
}

/**
 * Returns true when the caller may access public map JSON APIs.
 * Legitimate map traffic: same-site Origin or Referer. Scripts/CI: bypass headers.
 */
export function isAllowedPublicMapApiCaller(request: PublicMapApiRequestLike): boolean {
  if (process.env.PUBLIC_MAP_API_GUARD_DISABLED === 'true') {
    return true;
  }

  if (isBlockedScraperRequest(request)) {
    return false;
  }

  if (hasTrustedPublicMapApiBypass(request)) {
    return true;
  }

  const origin = request.headers.get('origin');
  if (matchesAllowedOrigin(origin)) {
    return true;
  }

  const referer = request.headers.get('referer');
  if (matchesAllowedOrigin(referer)) {
    return true;
  }

  return false;
}

export function guardPublicMapApiResponse(request: PublicMapApiRequestLike): Response | null {
  if (!isAllowedPublicMapApiCaller(request)) {
    return Response.json(
      { success: false, error: 'Forbidden' },
      {
        status: 403,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
  return null;
}
