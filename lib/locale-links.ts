import { hasLocaleTranslation } from '@/lib/i18n-content';

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
 * Get the content locale for guides (guides are English-only).
 * Use this when linking to guides to avoid broken links to non-existent de/es/fr guide pages.
 */
export function getGuideContentLocale(locale: string): string {
  return hasLocaleTranslation('guide', locale as import('@/i18n').Locale) ? locale : 'en';
}

/**
 * Generate locale-aware links for navigation.
 * Guide links use content-aware locale: only /en/guides/... exists, so de/es/fr link to en.
 */
export function createLocaleLinks(locale: string) {
  const guideLocale = getGuideContentLocale(locale);
  return {
    home: getLocalePath(locale, ''),
    guides: getLocalePath(locale, '/guides'),
    glossary: getLocalePath(locale, '/glossary'),
    map: getLocalePath(locale, '/map'),
    partners: getLocalePath(locale, '/partners'),
    sitemap: getLocalePath(locale, '/sitemap'),
    landing: (slug: string) => getLocalePath(locale, `/landing/${slug}`),
    property: (slug: string) => getLocalePath(locale, `/property/${slug}`),
    guide: (slug: string) => getLocalePath(guideLocale, `/guides/${slug}`),
    glossaryTerm: (slug: string) => getLocalePath(locale, `/glossary/${slug}`),
    glampingNearNationalParks: getLocalePath(locale, '/glamping/near-national-parks'),
    glampingByUnitType: (slug: string) => getLocalePath(locale, `/glamping/${slug}`),
  };
}
