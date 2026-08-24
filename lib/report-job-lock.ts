/**
 * In-flight lock for Report Builder generate / regenerate.
 * Redis SET NX when available; in-memory fallback when Redis is down.
 * Do not treat Redis unavailability as "already locked".
 */

import { deleteCache, isRedisConnected, setIfNotExists } from '@/lib/redis';

const DEFAULT_TTL_SECONDS = 360;

const memoryLocks = new Map<string, number>();

function acquireMemoryLock(key: string, ttlMs: number): boolean {
  const now = Date.now();
  const expiresAt = memoryLocks.get(key);
  if (expiresAt != null && expiresAt > now) {
    return false;
  }
  memoryLocks.set(key, now + ttlMs);
  return true;
}

function releaseMemoryLock(key: string): void {
  memoryLocks.delete(key);
}

export async function acquireReportJobLock(
  lockId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<boolean> {
  const redisKey = `report-job:${lockId}`;
  const wonRedis = await setIfNotExists(redisKey, '1', ttlSeconds);
  if (wonRedis) {
    acquireMemoryLock(redisKey, ttlSeconds * 1000);
    return true;
  }
  if (isRedisConnected()) {
    return false;
  }
  return acquireMemoryLock(redisKey, ttlSeconds * 1000);
}

export async function releaseReportJobLock(lockId: string): Promise<void> {
  const redisKey = `report-job:${lockId}`;
  releaseMemoryLock(redisKey);
  await deleteCache(redisKey);
}

export function generateDraftLockId(userId: string): string {
  return `user:${userId}`;
}

export function regenerateLockId(studyId: string): string {
  return `study:${studyId}`;
}
