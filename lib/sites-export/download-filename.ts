import type { SitesExportParsed } from '@/lib/sites-export/types';

/**
 * Geographic context for the download name: zip+radius, states, countries, or a neutral fallback.
 * Segments are filesystem-safe (alphanumeric + hyphen).
 */
export function sitesExportGeoFilenameSegment(parsed: SitesExportParsed): string {
  const zip = parsed.zip.trim();
  const radius = parsed.radiusMilesResolved ?? parsed.radiusMiles;

  if (zip && radius != null && radius > 0) {
    const z = zip.replace(/[^0-9A-Za-z-]/g, '');
    if (z) return `zip-${z}-${radius}mi`;
  }

  const states = [...parsed.states]
    .map((s) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .sort();
  if (states.length > 0) {
    return `states-${states.join('-').slice(0, 100)}`;
  }

  const countries = [...parsed.countries]
    .map((c) =>
      c
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    )
    .filter(Boolean)
    .sort();
  if (countries.length > 0) {
    return `countries-${countries.join('-').slice(0, 100)}`;
  }

  return 'all-markets';
}

export function buildSitesExportDownloadFilename(
  parsed: SitesExportParsed,
  dateStamp: string,
  ext: string
): string {
  const geo = sitesExportGeoFilenameSegment(parsed);
  return `sites-export-${geo}-${dateStamp}.${ext}`;
}
