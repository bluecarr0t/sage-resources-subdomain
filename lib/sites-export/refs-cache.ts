import { randomUUID } from 'crypto';
import { getCache, setCache } from '@/lib/redis';
import type { SiteExportTable } from '@/lib/sites-export/constants';

export type SitesExportRowRef = { t: SiteExportTable; id: number };

export type SitesExportCachedRefs = {
  v: 1;
  fingerprint: string;
  refs: SitesExportRowRef[];
};

const TTL_SEC = 120;
const KEY_PREFIX = 'sites-export:refs:v1:';

type MemEntry = { expires: number; data: SitesExportCachedRefs };
const memStore = new Map<string, MemEntry>();
const MEM_MAX = 200;

function memKey(userId: string, cacheKey: string): string {
  return `${userId}:${cacheKey}`;
}

function pruneMem(): void {
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (v.expires < now) memStore.delete(k);
  }
  if (memStore.size <= MEM_MAX) return;
  const sorted = [...memStore.entries()].sort((a, b) => a[1].expires - b[1].expires);
  while (memStore.size > MEM_MAX && sorted.length) {
    memStore.delete(sorted.shift()![0]);
  }
}

export function createSitesExportCacheKey(): string {
  return randomUUID();
}

export async function saveSitesExportRefs(
  userId: string,
  cacheKey: string,
  data: SitesExportCachedRefs
): Promise<void> {
  const redisKey = `${KEY_PREFIX}${userId}:${cacheKey}`;
  const ok = await setCache(redisKey, data, TTL_SEC);
  if (!ok) {
    pruneMem();
    memStore.set(memKey(userId, cacheKey), {
      expires: Date.now() + TTL_SEC * 1000,
      data,
    });
  }
}

export async function loadSitesExportRefs(
  userId: string,
  cacheKey: string
): Promise<SitesExportCachedRefs | null> {
  const redisKey = `${KEY_PREFIX}${userId}:${cacheKey}`;
  const fromRedis = await getCache<SitesExportCachedRefs>(redisKey);
  if (fromRedis) return fromRedis;

  pruneMem();
  const mem = memStore.get(memKey(userId, cacheKey));
  if (!mem || mem.expires < Date.now()) {
    if (mem) memStore.delete(memKey(userId, cacheKey));
    return null;
  }
  return mem.data;
}
