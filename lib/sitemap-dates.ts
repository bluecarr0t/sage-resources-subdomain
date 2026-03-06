/**
 * Helpers for sitemap lastmod dates.
 * Uses real content lastModified when available instead of new Date().
 */
import { getAllGuideSlugs, getGuideSync } from '@/lib/guides';
import { getAllLandingPageSlugs, getLandingPageSync } from '@/lib/landing-pages';

/**
 * Get the most recent lastModified date from guides and landing pages.
 * Returns ISO string for use in sitemap lastmod.
 */
export function getMostRecentContentDate(): string {
  const dates: string[] = [];

  for (const slug of getAllGuideSlugs()) {
    const guide = getGuideSync(slug);
    if (guide?.lastModified) {
      dates.push(guide.lastModified);
    }
  }

  for (const slug of getAllLandingPageSlugs()) {
    const page = getLandingPageSync(slug);
    if (page?.lastModified) {
      dates.push(page.lastModified);
    }
  }

  if (dates.length === 0) {
    return new Date().toISOString();
  }

  const sorted = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return new Date(sorted[0]).toISOString();
}
