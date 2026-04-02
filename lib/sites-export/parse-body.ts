import {
  SITE_EXPORT_TABLES,
  type SiteExportTable,
} from '@/lib/sites-export/constants';
import type { SitesExportFormat, SitesExportRequestBody } from '@/lib/sites-export/types';

/** True when the request scopes rows by country, state, or zip + mile radius (avoids accidental full-table exports). */
export function sitesExportHasRegionScope(
  parsed: Pick<SitesExportRequestBody, 'countries' | 'states' | 'zip' | 'radiusMiles'>
): boolean {
  return (
    parsed.countries.length > 0 ||
    parsed.states.length > 0 ||
    (parsed.zip.trim() !== '' && parsed.radiusMiles != null)
  );
}

const TABLE_SET = new Set<string>(SITE_EXPORT_TABLES);

function isSiteExportTable(v: unknown): v is SiteExportTable {
  return typeof v === 'string' && TABLE_SET.has(v);
}

function isFormat(v: unknown): v is SitesExportFormat {
  return v === 'xlsx' || v === 'csv';
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim());
}

/**
 * Parse JSON body for sites export / count. Returns null if invalid.
 *
 * **API contract — `states`:** send **USPS-style 2-letter abbreviations** only (`"CA"`, `"NY"`).
 * Values are uppercased and truncated to two characters; full state names are not interpreted
 * (e.g. `"New York"` becomes `"NE"`, which will not match New York rows).
 */
export function parseSitesExportBody(body: unknown): SitesExportRequestBody | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;

  const sourcesRaw = o.sources;
  let sources: SiteExportTable[] = [];
  if (Array.isArray(sourcesRaw)) {
    sources = sourcesRaw.filter(isSiteExportTable);
  }
  if (sources.length === 0) return null;

  const format = o.format;
  if (!isFormat(format)) return null;

  const zip =
    o.zip == null || o.zip === ''
      ? ''
      : String(o.zip)
          .trim()
          .replace(/\s+/g, '');
  let radiusMiles: number | null = null;
  if (o.radiusMiles != null && o.radiusMiles !== '') {
    const n = typeof o.radiusMiles === 'number' ? o.radiusMiles : Number(o.radiusMiles);
    if (Number.isFinite(n) && n > 0) radiusMiles = Math.min(500, Math.max(1, n));
  }

  if (zip && radiusMiles == null) return null;
  if (radiusMiles != null && !zip) return null;

  const cacheKeyRaw = o.cacheKey;
  const cacheKey =
    typeof cacheKeyRaw === 'string' && cacheKeyRaw.trim() ? cacheKeyRaw.trim() : undefined;

  return {
    sources,
    countries: asStringArray(o.countries),
    states: asStringArray(o.states).map((s) => s.toUpperCase().slice(0, 2)),
    unitTypes: asStringArray(o.unitTypes),
    zip,
    radiusMiles,
    format,
    ...(cacheKey ? { cacheKey } : {}),
  };
}
