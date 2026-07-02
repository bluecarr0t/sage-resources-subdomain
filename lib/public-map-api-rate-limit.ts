import { checkRateLimitAsync } from '@/lib/rate-limit';
import {
  getClientIpFromRequest,
  hasTrustedPublicMapApiBypass,
  type PublicMapApiRequestLike,
} from '@/lib/public-map-api-guard';
import { recordPublicMapApiAbuse } from '@/lib/public-map-api-abuse';

export type PublicMapApiRateLimitRoute =
  | 'properties'
  | 'google-places'
  | 'google-places-photo';

export type PublicMapApiRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      retryAfterSec: number;
      scope: 'minute' | 'hour' | 'google_places_minute' | 'google_places_photo_minute';
    };

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
    return blocked(ipKey, retryAfterSeconds(minuteRl.resetAt), 'minute');
  }

  const hourRl = await checkRateLimitAsync(
    `public_map_api:hour:${ipKey}`,
    perHour,
    3_600_000
  );
  if (!hourRl.allowed) {
    return blocked(ipKey, retryAfterSeconds(hourRl.resetAt), 'hour');
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
      return blocked(
        ipKey,
        retryAfterSeconds(googleRl.resetAt),
        'google_places_minute'
      );
    }
  }

  if (route === 'google-places-photo') {
    const photoPerMin = parseLimitEnv(
      'GOOGLE_PLACES_PHOTO_ROUTE_RATELIMIT_PER_MIN',
      40,
      500
    );
    const photoRl = await checkRateLimitAsync(
      `public_map_api:google_places_photo:min:${ipKey}`,
      photoPerMin,
      60_000
    );
    if (!photoRl.allowed) {
      return blocked(
        ipKey,
        retryAfterSeconds(photoRl.resetAt),
        'google_places_photo_minute'
      );
    }
  }

  return { allowed: true };
}

/**
 * Build a blocked result and record the offense for auto-ban tracking.
 * Offense recording is best-effort and never blocks the response.
 */
async function blocked(
  ipKey: string,
  retryAfterSec: number,
  scope: Extract<PublicMapApiRateLimitResult, { allowed: false }>['scope']
): Promise<PublicMapApiRateLimitResult> {
  try {
    await recordPublicMapApiAbuse(ipKey);
  } catch {
    // Never let abuse tracking break the rate-limit response.
  }
  return { allowed: false, retryAfterSec, scope };
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
