/**
 * Canonical IndexNow URL lists for new commercial hubs (markets + journeys).
 * Matches sitemap entries in `app/sitemaps/main.xml/route.ts`.
 */

import { locales } from '@/i18n';
import { getAllJourneyCaseSlugs } from '@/lib/journey-case-pages';
import { getAllMapMarketSlugs } from '@/lib/map-market-pages';

export type IndexNowHub = 'markets' | 'journeys';

export const INDEXNOW_HUBS: readonly IndexNowHub[] = ['markets', 'journeys'] as const;

const DEFAULT_BASE_URL = 'https://resources.sageoutdooradvisory.com';

export function parseIndexNowHubs(raw: string | undefined | null): IndexNowHub[] {
  if (!raw || raw.trim() === '' || raw.trim() === 'all') {
    return [...INDEXNOW_HUBS];
  }

  const parts = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const hubs: IndexNowHub[] = [];
  for (const part of parts) {
    if (part === 'markets' || part === 'journeys') {
      if (!hubs.includes(part)) hubs.push(part);
      continue;
    }
    throw new Error(
      `Unknown IndexNow hub "${part}". Use: markets, journeys, or all.`
    );
  }

  if (hubs.length === 0) {
    throw new Error('No IndexNow hubs selected. Use: markets, journeys, or all.');
  }

  return hubs;
}

/**
 * Absolute production URLs for selected hubs across all locales.
 * Includes hub index pages (`/en/markets`, `/en/journeys`) and each slug page.
 */
export function buildIndexNowHubUrls(
  hubs: readonly IndexNowHub[] = INDEXNOW_HUBS,
  baseUrl: string = DEFAULT_BASE_URL
): string[] {
  const origin = baseUrl.replace(/\/$/, '');
  const urls: string[] = [];

  for (const hub of hubs) {
    for (const locale of locales) {
      urls.push(`${origin}/${locale}/${hub}`);

      const slugs =
        hub === 'markets' ? getAllMapMarketSlugs() : getAllJourneyCaseSlugs();
      for (const slug of slugs) {
        urls.push(`${origin}/${locale}/${hub}/${slug}`);
      }
    }
  }

  return [...new Set(urls)];
}
