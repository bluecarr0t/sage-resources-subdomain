/**
 * Upstash Redis client + rate-limit helpers (separate from the legacy
 * `redis` client in `lib/redis.ts`, which wraps the self-hosted Redis used
 * by the map/properties caches).
 *
 * Env:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If the env vars are missing (e.g. local dev without Upstash configured) or
 * Redis errors at runtime, the rate-limit/quota helpers fall back to an
 * in-memory per-instance limiter instead of failing open. That still bounds
 * abuse/cost during an Upstash outage (per serverless instance) without
 * bricking chat. Production should always have Redis configured; absence is
 * logged as an error so it can be alerted on.
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

const WINDOW_UNIT_MS: Record<RatelimitWindowUnit, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function windowToMs(window: RatelimitWindow): number {
  const [amount, unit] = window.split(' ') as [string, RatelimitWindowUnit];
  return Number(amount) * WINDOW_UNIT_MS[unit];
}

/** Per-instance sliding-window fallback used when Redis is unavailable. */
const memoryHits = new Map<string, number[]>();

function memoryLimit(
  key: string,
  subject: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const mapKey = `${key}:${subject}`;
  const hits = (memoryHits.get(mapKey) ?? []).filter((t) => now - t < windowMs);
  const success = hits.length < max;
  if (success) hits.push(now);
  memoryHits.set(mapKey, hits);
  // Opportunistic cleanup so the map cannot grow unbounded across subjects.
  if (memoryHits.size > 10_000) {
    for (const [k, v] of memoryHits) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) memoryHits.delete(k);
    }
  }
  return {
    success,
    limit: max,
    remaining: Math.max(0, max - hits.length),
    reset: now + windowMs,
  };
}

let warnedNoRedis = false;

function warnRedisUnavailable(context: string, err?: unknown) {
  // console.error (not warn) so log-based alerting can pick this up: an
  // unavailable limiter in production means chat cost caps are degraded to
  // per-instance in-memory limits.
  if (err) {
    console.error(`[upstash] Redis error in ${context}; using in-memory fallback limiter`, err);
    return;
  }
  if (!warnedNoRedis) {
    warnedNoRedis = true;
    console.error(
      `[upstash] Redis not configured (${context}); rate limits/quotas are per-instance in-memory only`
    );
  }
}

/**
 * Apply a rate limit for `subject`. When Redis is unavailable (missing env or
 * runtime error) this does NOT fail open: it falls back to a per-instance
 * in-memory sliding window and logs an error for alerting.
 */
export async function limit(
  key: string,
  subject: string,
  max: number,
  window: RatelimitWindow
): Promise<RateLimitResult> {
  const rl = createRateLimiter(key, max, window);
  if (!rl) {
    warnRedisUnavailable(`limit:${key}`);
    return memoryLimit(key, subject, max, windowToMs(window));
  }
  try {
    const res = await rl.limit(subject);
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    };
  } catch (err) {
    warnRedisUnavailable(`limit:${key}`, err);
    return memoryLimit(key, subject, max, windowToMs(window));
  }
}

/** Per-instance daily counters used when Redis is unavailable. */
const memoryQuota = new Map<string, number>();
let memoryQuotaDay = '';

function memoryDailyQuota(
  namespace: string,
  subject: string,
  quota: number
): { allowed: boolean; used: number; quota: number } {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== memoryQuotaDay) {
    memoryQuota.clear();
    memoryQuotaDay = day;
  }
  const key = `${namespace}:${subject}`;
  const used = (memoryQuota.get(key) ?? 0) + 1;
  memoryQuota.set(key, used);
  return { allowed: used <= quota, used, quota };
}

/**
 * Increment a per-user daily counter and return `{ allowed, used, quota }`.
 * Counters are bucketed by UTC date and expire after 2 days. When Redis is
 * unavailable, falls back to a per-instance in-memory counter (not fail-open)
 * and logs an error for alerting.
 */
export async function enforceDailyQuota(
  namespace: string,
  subject: string,
  quota: number
): Promise<{ allowed: boolean; used: number; quota: number }> {
  const redis = getRedis();
  if (!redis) {
    warnRedisUnavailable(`quota:${namespace}`);
    return memoryDailyQuota(namespace, subject, quota);
  }

  const day = new Date().toISOString().slice(0, 10);
  const key = `sage_ai:quota:${namespace}:${day}:${subject}`;
  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, 60 * 60 * 48);
    }
    return { allowed: used <= quota, used, quota };
  } catch (err) {
    warnRedisUnavailable(`quota:${namespace}`, err);
    return memoryDailyQuota(namespace, subject, quota);
  }
}
