import { locales, type Locale } from '@/i18n';
import { getAvailableLocalesForContent } from '@/lib/i18n-content';

/** Hub paths listed in /sitemaps/main.xml */
export const MAIN_SITEMAP_PAGE_PATHS = [
  '',
  '/guides',
  '/glossary',
  '/partners',
  '/map',
  '/sitemap',
] as const;

export type MainSitemapPagePath = (typeof MAIN_SITEMAP_PAGE_PATHS)[number];

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
