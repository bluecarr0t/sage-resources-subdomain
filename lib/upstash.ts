/**
 * Upstash Redis client + rate-limit helpers (separate from the legacy
 * `redis` client in `lib/redis.ts`, which wraps the self-hosted Redis used
 * by the map/properties caches).
 *
 * Env:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If the env vars are missing (e.g. local dev without Upstash configured),
 * `getRedis()` returns null and the rate-limit/quota helpers degrade to a
 * no-op "allow" so the feature keeps working. Production should always have
 * these configured.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

type RatelimitWindowUnit = 'ms' | 's' | 'm' | 'h' | 'd';
type RatelimitWindow = `${number} ${RatelimitWindowUnit}`;

let cachedRedis: Redis | null | undefined;

/**
 * Returns a singleton Upstash Redis client, or null when credentials are
 * unavailable. Callers should treat null as "skip limit".
 */
export function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedRedis = null;
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const limiterCache = new Map<string, Ratelimit>();

/**
 * Build (and cache) a sliding-window rate limiter for `key`. `limit` requests
 * per `window` (e.g. `'5 m'` for 5 minutes).
 */
export function createRateLimiter(
  key: string,
  limit: number,
  window: RatelimitWindow
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${key}:${limit}:${window}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix: `sage_ai:rl:${key}`,
  });
  limiterCache.set(cacheKey, rl);
  return rl;
}

/**
 * Apply a rate limit for `subject`. Returns `success: true` when Redis is
 * unavailable (fail-open so chat stays up during an Upstash outage).
 */
export async function limit(
  key: string,
  subject: string,
  max: number,
  window: RatelimitWindow
): Promise<RateLimitResult> {
  const rl = createRateLimiter(key, max, window);
  if (!rl) {
    return { success: true, limit: max, remaining: max, reset: 0 };
  }
  const res = await rl.limit(subject);
  return {
    success: res.success,
    limit: res.limit,
    remaining: res.remaining,
    reset: res.reset,
  };
}

/**
 * Increment a per-user daily counter and return `{ allowed, used, quota }`.
 * Counters are bucketed by UTC date and expire after 2 days.
 */
export async function enforceDailyQuota(
  namespace: string,
  subject: string,
  quota: number
): Promise<{ allowed: boolean; used: number; quota: number }> {
  const redis = getRedis();
  if (!redis) return { allowed: true, used: 0, quota };

  const day = new Date().toISOString().slice(0, 10);
  const key = `sage_ai:quota:${namespace}:${day}:${subject}`;
  const used = await redis.incr(key);
  if (used === 1) {
    await redis.expire(key, 60 * 60 * 48);
  }
  return { allowed: used <= quota, used, quota };
}
