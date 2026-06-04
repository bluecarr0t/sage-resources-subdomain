import { checkRateLimitAsync } from '@/lib/rate-limit';
import {
  getClientIpFromRequest,
  hasTrustedPublicMapApiBypass,
  type PublicMapApiRequestLike,
} from '@/lib/public-map-api-guard';

export type PublicMapApiRateLimitRoute = 'properties' | 'google-places';

export type PublicMapApiRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; scope: 'minute' | 'hour' | 'google_places_minute' };

function parseLimitEnv(name: string, defaultValue: number, max: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw === '' ? defaultValue : Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function rateLimitIpKey(request: PublicMapApiRequestLike): string {
  const ip = getClientIpFromRequest(request);
  return ip === 'unknown' ? 'unknown' : ip;
}

function retryAfterSeconds(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

/**
 * Per-IP limits for public map JSON APIs.
 * - Combined minute + hour buckets across /api/properties and /api/google-places
 * - Extra per-minute cap on google-places (Google billing)
 * Bypass when {@link hasTrustedPublicMapApiBypass} is true.
 */
export async function enforcePublicMapApiRateLimits(
  request: PublicMapApiRequestLike,
  route: PublicMapApiRateLimitRoute
): Promise<PublicMapApiRateLimitResult> {
  if (hasTrustedPublicMapApiBypass(request)) {
    return { allowed: true };
  }

  const ipKey = rateLimitIpKey(request);

  const perMin = parseLimitEnv('PUBLIC_MAP_API_RATELIMIT_PER_MIN', 60, 500);
  const perHour = parseLimitEnv('PUBLIC_MAP_API_RATELIMIT_PER_HOUR', 300, 10_000);

  const minuteRl = await checkRateLimitAsync(
    `public_map_api:min:${ipKey}`,
    perMin,
    60_000
  );
  if (!minuteRl.allowed) {
    return {
      allowed: false,
      retryAfterSec: retryAfterSeconds(minuteRl.resetAt),
      scope: 'minute',
    };
  }

  const hourRl = await checkRateLimitAsync(
    `public_map_api:hour:${ipKey}`,
    perHour,
    3_600_000
  );
  if (!hourRl.allowed) {
    return {
      allowed: false,
      retryAfterSec: retryAfterSeconds(hourRl.resetAt),
      scope: 'hour',
    };
  }

  if (route === 'google-places') {
    const googlePerMin = parseLimitEnv(
      'GOOGLE_PLACES_PUBLIC_ROUTE_RATELIMIT_PER_MIN',
      30,
      500
    );
    const googleRl = await checkRateLimitAsync(
      `public_map_api:google_places:min:${ipKey}`,
      googlePerMin,
      60_000
    );
    if (!googleRl.allowed) {
      return {
        allowed: false,
        retryAfterSec: retryAfterSeconds(googleRl.resetAt),
        scope: 'google_places_minute',
      };
    }
  }

  return { allowed: true };
}

export function publicMapApiRateLimitResponse(
  result: Extract<PublicMapApiRateLimitResult, { allowed: false }>,
  body: Record<string, unknown> = { success: false, error: 'Too many requests' }
): Response {
  return Response.json(body, {
    status: 429,
    headers: {
      'Cache-Control': 'no-store',
      'Retry-After': String(result.retryAfterSec),
      'X-RateLimit-Scope': result.scope,
    },
  });
}
