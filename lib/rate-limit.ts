/**
 * Rate limiter for API routes.
 * Uses Redis when available (serverless/multi-instance), falls back to in-memory.
 */

import { checkRateLimitRedis } from '@/lib/redis';

const store = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, val] of store.entries()) {
    if (val.resetAt < now) store.delete(key);
  }
}

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.resetAt < now) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Synchronous rate limit check (in-memory only).
 * Use when Redis is not needed or for sync contexts.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  return checkRateLimitMemory(key, limit, windowMs);
}

/**
 * Async rate limit check. Uses Redis when available for serverless/multi-instance.
 * Falls back to in-memory when Redis is unavailable.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redisResult = await checkRateLimitRedis(key, limit, windowMs);
  if (redisResult) {
    return {
      allowed: redisResult.allowed,
      remaining: Math.max(0, limit - redisResult.count),
      resetAt: redisResult.resetAt,
    };
  }
  return checkRateLimitMemory(key, limit, windowMs);
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return ip;
}
