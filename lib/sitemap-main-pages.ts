import { locales, type Locale } from '@/i18n';
import { getAvailableLocalesForContent } from '@/lib/i18n-content';

/** Hub paths listed in /sitemaps/main.xml (under /{locale}…) */
export const MAIN_SITEMAP_PAGE_PATHS = [
  '',
  '/guides',
  '/glossary',
  '/partners',
  '/map',
  '/markets',
  '/journeys',
  '/sitemap',
] as const;

export type MainSitemapPagePath = (typeof MAIN_SITEMAP_PAGE_PATHS)[number];

/**
 * Public pages that live at the site root (no locale prefix), same pattern as
 * `/glamping-market-overview`. Emitted in /sitemaps/main.xml.
 */
export const NON_LOCALE_PUBLIC_SITEMAP_PATHS = [
  '/glamping-unit-type-classification',
  '/privacy-policy',
  '/terms-of-service',
] as const;

export type NonLocalePublicSitemapPath = (typeof NON_LOCALE_PUBLIC_SITEMAP_PATHS)[number];

export type NonLocaleSitemapEntry = {
  path: NonLocalePublicSitemapPath;
  priority: string;
  changefreq: 'weekly' | 'monthly' | 'yearly';
};

/** Sitemap signaling for root-level public/legal/reference pages. */
export function getNonLocalePublicSitemapEntries(): readonly NonLocaleSitemapEntry[] {
  return [
    {
      path: '/glamping-unit-type-classification',
      priority: '0.85',
      changefreq: 'monthly',
    },
    {
      path: '/privacy-policy',
      priority: '0.3',
      changefreq: 'yearly',
    },
    {
      path: '/terms-of-service',
      priority: '0.3',
      changefreq: 'yearly',
    },
  ];
}

/**
 * Locales that return 200 for a main sitemap hub path.
 * Guides and glossary index redirect non-en locales to /en (middleware).
 */
export function getLocalesForMainSitemapPage(pagePath: MainSitemapPagePath): readonly Locale[] {
  if (pagePath === '/guides') {
    return getAvailableLocalesForContent('guide');
  }
  if (pagePath === '/glossary') {
    return getAvailableLocalesForContent('glossary');
  }
  return locales;
}
