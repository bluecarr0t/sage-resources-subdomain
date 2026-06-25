const DEFAULT_TTL_SECONDS = 180;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function projectPipelineSheetsCacheKey(...parts: string[]): string {
  return parts.join(':');
}

export function getProjectPipelineSheetsCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setProjectPipelineSheetsCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function isGoogleSheetsReadQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /quota exceeded/i.test(message) ||
    /rate limit/i.test(message) ||
    /\b429\b/.test(message) ||
    /RESOURCE_EXHAUSTED/i.test(message)
  );
}
