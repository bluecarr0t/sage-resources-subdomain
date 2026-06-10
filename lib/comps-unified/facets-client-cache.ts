import { COMPS_UNIFIED_FACETS_CACHE_KEY } from '@/lib/comps-unified/facets-cache-keys';

const SESSION_STORAGE_KEY = `admin:${COMPS_UNIFIED_FACETS_CACHE_KEY}:session`;
/** Client-side TTL; server facets are cached 24h in Redis. */
const CLIENT_TTL_MS = 60 * 60 * 1000;

export interface UnifiedCompsFacetsClientPayload {
  unit_categories?: string[];
  countries?: string[];
  states?: string[];
  keywords?: string[];
}

interface CachedEnvelope {
  savedAt: number;
  data: UnifiedCompsFacetsClientPayload;
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function readUnifiedCompsFacetsClientCache(): UnifiedCompsFacetsClientPayload | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CachedEnvelope;
    if (!envelope?.data || typeof envelope.savedAt !== 'number') return null;
    if (Date.now() - envelope.savedAt > CLIENT_TTL_MS) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

export function writeUnifiedCompsFacetsClientCache(data: UnifiedCompsFacetsClientPayload): void {
  if (!canUseSessionStorage()) return;
  try {
    const envelope: CachedEnvelope = { savedAt: Date.now(), data };
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota or private mode — ignore.
  }
}
