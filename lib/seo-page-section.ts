/**
 * Classifies public URLs into SEO reporting sections for GA4 and GSC segmenting.
 */

export type SeoPageSection =
  | 'home'
  | 'landing'
  | 'guides'
  | 'glossary'
  | 'property'
  | 'map'
  | 'map_location'
  | 'brand'
  | 'glamping_hub'
  | 'market_overview'
  | 'partners'
  | 'other';

const LOCALE_PREFIX = /^\/(en|es|fr|de)(\/|$)/;

/** Strip locale prefix; keep leading slash (e.g. `/en/map` → `/map`). */
export function stripLocaleFromPathname(pathname: string): string {
  const stripped = pathname.replace(LOCALE_PREFIX, '/');
  if (stripped === '') return '/';
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/**
 * Map a pathname to a stable section label for organic traffic dashboards.
 */
export function classifySeoPageSection(pathname: string): SeoPageSection {
  const path = stripLocaleFromPathname(pathname);

  if (path === '/' || path === '') return 'home';
  if (path === '/map' || path.startsWith('/map?')) return 'map';
  if (path.startsWith('/map/')) return 'map_location';
  if (path.startsWith('/landing/')) return 'landing';
  if (path.startsWith('/guides/')) return 'guides';
  if (path === '/guides') return 'guides';
  if (path.startsWith('/glossary/')) return 'glossary';
  if (path === '/glossary') return 'glossary';
  if (path.startsWith('/property/')) return 'property';
  if (path === '/brands' || path.startsWith('/brand/')) return 'brand';
  if (path.startsWith('/glamping/')) return 'glamping_hub';
  if (path === '/glamping-market-overview' || path.startsWith('/glamping-market-overview')) {
    return 'market_overview';
  }
  if (path === '/partners' || path.startsWith('/partners')) return 'partners';

  return 'other';
}

/** Secondary slug for landing/guides/glossary/property/brand (undefined when N/A). */
export function extractSeoContentSlug(pathname: string): string | undefined {
  const path = stripLocaleFromPathname(pathname);
  const patterns: Array<[RegExp, number]> = [
    [/^\/landing\/([^/]+)/, 1],
    [/^\/guides\/([^/]+)/, 1],
    [/^\/glossary\/([^/]+)/, 1],
    [/^\/property\/([^/]+)/, 1],
    [/^\/brand\/([^/]+)/, 1],
    [/^\/glamping\/([^/]+)/, 1],
    [/^\/map\/([^/]+)/, 1],
  ];

  for (const [re, group] of patterns) {
    const m = path.match(re);
    if (m?.[group]) return m[group];
  }
  return undefined;
}
