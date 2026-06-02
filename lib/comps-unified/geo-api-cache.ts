/**
 * Private HTTP caching for admin unified geo GET (repeat filter sets in a session).
 */

const GEO_CACHE_MAX_AGE_SEC = 120;
const GEO_CACHE_STALE_WHILE_REVALIDATE_SEC = 300;

export function canonicalGeoQueryKey(searchParams: URLSearchParams): string {
  const keys = [...searchParams.keys()].sort();
  const parts: string[] = [];
  for (const key of keys) {
    if (key === 'format') continue;
    const values = searchParams.getAll(key).sort();
    for (const value of values) {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.join('&');
}

/** Cheap fingerprint — not a cryptographic hash of the full body. */
export function geoResponseWeakEtag(input: {
  canonicalQuery: string;
  pointCount: number;
  total: number;
  capped: boolean;
  sampleIds: string[];
}): string {
  let h = 2166136261;
  const mix = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  };
  mix(input.canonicalQuery);
  mix(String(input.pointCount));
  mix(String(input.total));
  mix(input.capped ? '1' : '0');
  for (const id of input.sampleIds) mix(id);
  return `W/"geo-${(h >>> 0).toString(16)}"`;
}

export function geoApiCacheHeaders(etag: string): HeadersInit {
  return {
    ETag: etag,
    'Cache-Control': `private, max-age=${GEO_CACHE_MAX_AGE_SEC}, stale-while-revalidate=${GEO_CACHE_STALE_WHILE_REVALIDATE_SEC}`,
    Vary: 'Cookie',
  };
}

export function geoApiNotModifiedHeaders(etag: string): HeadersInit {
  return {
    ETag: etag,
    'Cache-Control': `private, max-age=${GEO_CACHE_MAX_AGE_SEC}`,
  };
}
