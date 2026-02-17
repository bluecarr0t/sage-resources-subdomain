/**
 * Utility functions for generating locale-aware links
 */

/**
 * Generate a locale-aware link path
 * @param locale - The current locale
 * @param path - The path (should start with /)
 * @returns The locale-prefixed path
 */
export function getLocalePath(locale: string, path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Don't add locale prefix for external URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Add locale prefix
  return `/${locale}/${cleanPath}`;
}

/**
 * Generate locale-aware links for navigation
 */
export function createLocaleLinks(locale: string) {
  return {
    home: getLocalePath(locale, ''),
    guides: getLocalePath(locale, '/guides'),
    glossary: getLocalePath(locale, '/glossary'),
    map: getLocalePath(locale, '/map'),
    partners: getLocalePath(locale, '/partners'),
    sitemap: getLocalePath(locale, '/sitemap'),
    landing: (slug: string) => getLocalePath(locale, `/landing/${slug}`),
    property: (slug: string) => getLocalePath(locale, `/property/${slug}`),
    guide: (slug: string) => getLocalePath(locale, `/guides/${slug}`),
    glossaryTerm: (slug: string) => getLocalePath(locale, `/glossary/${slug}`),
  };
}
