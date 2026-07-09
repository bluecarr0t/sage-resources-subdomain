/**
 * Per-session tool-result cache for Sage AI.
 *
 * When the model re-issues the same read-only tool call in a session, return
 * the cached payload instead of re-querying Supabase and re-injecting full JSON.
 */

import { createHash } from 'crypto';
import { getRedis } from '@/lib/upstash';

export interface ToolResultCacheContext {
  userId: string;
  sessionId: string;
}

type ExecFn<TArgs, TOut> = (args: TArgs, ...rest: unknown[]) => Promise<TOut>;

/** Read-only data tools safe to cache for the session TTL. */
export const CACHEABLE_SAGE_AI_TOOLS = new Set([
  'query_properties',
  'count_unique_properties',
  'aggregate_properties',
  'count_rows',
  'get_property_details',
  'get_column_values',
  'query_ota',
  'query_raw_ota_table',
  'find_glamping_columns',
]);

const DEFAULT_TTL_SEC = 3600;

type MemoryEntry = { payload: unknown; cachedAt: string; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

function parseTtlSec(): number {
  const raw = process.env.SAGE_AI_TOOL_CACHE_TTL_SEC?.replace(/_/g, '');
  if (raw == null || raw === '') return DEFAULT_TTL_SEC;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TTL_SEC;
}

/** Recursively sort object keys for stable JSON serialization. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

export function toolResultCacheHash(toolName: string, args: unknown): string {
  const digest = createHash('sha256')
    .update(toolName)
    .update(':')
    .update(stableStringify(args))
    .digest('hex');
  return digest;
}

export function buildToolResultCacheKey(
  userId: string,
  sessionId: string,
  toolName: string,
  args: unknown
): string {
  return `sage_ai:tc:${userId}:${sessionId}:${toolResultCacheHash(toolName, args)}`;
}

function shouldCacheResult(result: unknown): boolean {
  if (!result || typeof result !== 'object') return true;
  const maybe = result as { error?: unknown };
  if (typeof maybe.error === 'string' && maybe.error.length > 0) {
    const msg = maybe.error.toLowerCase();
    if (msg.includes('quota')) return false;
    if (msg.includes('rate') && msg.includes('limit')) return false;
    return false;
  }
  return true;
}

async function readCache(key: string): Promise<MemoryEntry | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      if (!raw) return null;
      const parsed = typeof raw === 'string' ? (JSON.parse(raw) as MemoryEntry) : (raw as MemoryEntry);
      if (!parsed?.payload) return null;
      return parsed;
    } catch {
      // fall through to memory
    }
  }
  const mem = memoryCache.get(key);
  if (!mem) return null;
  if (Date.now() > mem.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return mem;
}

async function writeCache(key: string, payload: unknown, ttlSec: number): Promise<void> {
  const cachedAt = new Date().toISOString();
  const entry: MemoryEntry = {
    payload,
    cachedAt,
    expiresAt: Date.now() + ttlSec * 1000,
  };
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(entry), { ex: ttlSec });
      return;
    } catch {
      // fall through to memory
    }
  }
  memoryCache.set(key, entry);
}

/**
 * Wrap a tool execute function with per-session result caching.
 * Cache hits still run through the wrapper chain (telemetry records ~0ms).
 */
export function withToolResultCache<TArgs, TOut>(
  toolName: string,
  ctx: ToolResultCacheContext | null | undefined,
  execute: ExecFn<TArgs, TOut>
): ExecFn<TArgs, TOut> {
  if (!ctx?.userId || !ctx.sessionId || !CACHEABLE_SAGE_AI_TOOLS.has(toolName)) {
    return execute;
  }

  const ttlSec = parseTtlSec();

  return async (args, ...rest) => {
    const key = buildToolResultCacheKey(ctx.userId, ctx.sessionId, toolName, args);
    const cached = await readCache(key);
    if (cached) {
      const payload =
        cached.payload && typeof cached.payload === 'object'
          ? {
              ...(cached.payload as Record<string, unknown>),
              _cache: { hit: true, cached_at: cached.cachedAt },
            }
          : cached.payload;
      return payload as TOut;
    }

    const result = await execute(args, ...rest);
    if (shouldCacheResult(result)) {
      void writeCache(key, result, ttlSec).catch((err) => {
        console.warn('[sage-ai/tool-result-cache] write failed', toolName, err);
      });
    }
    return result;
  };
}

/** Test-only: clear in-memory fallback between tests. */
export function clearToolResultMemoryCacheForTests(): void {
  memoryCache.clear();
}
