import { createHash } from 'crypto';
import type { SitesExportParsed } from '@/lib/sites-export/types';

/** ~1.1 m precision — geocoders jitter slightly between requests; stable count→export cache keys. */
function fingerprintCoord(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 1e5) / 1e5;
}

/**
 * Stable fingerprint for cache invalidation (excludes format and cacheKey).
 */
export function sitesExportFingerprint(parsed: SitesExportParsed): string {
  const payload = {
    sources: [...parsed.sources].sort(),
    countries: [...parsed.countries].sort(),
    states: [...parsed.states].sort(),
    unitTypes: [...parsed.unitTypes].sort(),
    zip: parsed.zip,
    radiusMiles: parsed.radiusMiles,
    centerLat: fingerprintCoord(parsed.centerLat),
    centerLng: fingerprintCoord(parsed.centerLng),
    radiusMilesResolved: parsed.radiusMilesResolved,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
