import { hasLocaleTranslation } from '@/lib/i18n-content';
import { locales, type Locale } from '@/i18n';

/**
 * Path roots that are served under `/[locale]/...`. Unprefixed links cause
 * next-intl redirects (307) and SEO audit noise; prefix at render time.
 */
const LOCALE_SCOPED_ROOT_SEGMENTS = new Set([
  'glossary',
  'guides',
  'landing',
  'map',
  'partners',
  'property',
  'glamping',
  'sitemap',
  'map-sheet',
]);

/**
 * Prefix href targets in HTML fragments, e.g. `href="/glossary/foo"` → `href="/de/glossary/foo"`.
 * Skips already-localized paths and non-resource roots (e.g. `/privacy-policy`).
 */
export function prefixInternalResourceHrefsInHtml(html: string, locale: string): string {
  if (!html) return html;
  const segmentPattern = [...LOCALE_SCOPED_ROOT_SEGMENTS].join('|');
  const re = new RegExp(
    `href=(["'])\\/(?!en\\/|es\\/|fr\\/|de\\/)(${segmentPattern})(\\/[^"']*)?\\1`,
    'gi',
  );
  return html.replace(re, (_m, quote, seg: string, rest: string | undefined) => {
    const suffix = rest ?? '';
    return `href=${quote}/${locale}/${seg}${suffix}${quote}`;
  });
}

/**
 * Ensure a same-site path includes the active locale when missing (for Link href).
 */
export function localizeInternalHref(href: string, locale: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const parts = href.split('/').filter(Boolean);
  if (parts.length === 0) return href;
  if (locales.includes(parts[0] as Locale)) return href;
  if (!LOCALE_SCOPED_ROOT_SEGMENTS.has(parts[0])) return href;
  return `/${locale}/${parts.join('/')}`;
}

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
