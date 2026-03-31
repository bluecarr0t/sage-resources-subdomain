/**
 * Prefer property-detail URLs for Firecrawl when only a subset of rows can be scraped.
 */

import { canonicalUrlKeyForDedupe } from '@/lib/comps-v2/canonical-url';

/** Hosts / patterns that are usually roundups, social, or weak property pages. */
const DIRECTORY_OR_HUB_PENALTY =
  /tripadvisor\.|yelp\.com\/biz|facebook\.com\/(pages|groups|share)|pinterest\.|10best\.|onlyinyourstate\.|wikipedia\.org|reddit\.com\/r\/|youtube\.com|youtu\.be|travelandleisure\.|cntraveler\.|outsideonline\.com\/(best|roundup)/i;

/** Likely single-property or reservation pages worth scraping. */
const PROPERTY_OR_BOOKING_BOOST =
  /hipcamp\.com\/(en-US\/|)[^/]+\/[^/]+|recreation\.gov\/camping\/|campspot\.com|reserveamerica\.com|koa\.com\/(campgrounds|rv-parks)|goodsam\.com\/campgrounds|campendium\.com\/campground|the_dyrt\.com\/campground|booking\.com\/(hotel|resort)/i;

export function firecrawlUrlPriorityScore(url: string): number {
  const u = url.trim();
  if (!u) return -1000;
  let score = 0;
  try {
    const parsed = new URL(u);
    const path = parsed.pathname;
    const segs = path.split('/').filter(Boolean);
    score += Math.min(segs.length * 4, 24);
    if (segs.length >= 2) score += 6;
  } catch {
    return -500;
  }
  if (DIRECTORY_OR_HUB_PENALTY.test(u)) score -= 55;
  if (PROPERTY_OR_BOOKING_BOOST.test(u)) score += 32;
  if (/google\.com\/maps\/search\//i.test(u)) score -= 45;
  if (/google\.com\/maps\/place\//i.test(u)) score += 12;
  return score;
}

/**
 * Pick up to `firecrawlTopN` canonical URL keys to scrape; value is the highest-priority URL for that key.
 */
export function buildFirecrawlTargetsByCanonicalKey(
  rows: Array<{ url?: string | null }>,
  firecrawlTopN: number
): Map<string, string> {
  const out = new Map<string, string>();
  if (firecrawlTopN <= 0) return out;

  type Pick = { key: string; url: string; score: number };
  const picks: Pick[] = [];
  for (const row of rows) {
    const raw = row.url?.trim();
    if (!raw) continue;
    const key = canonicalUrlKeyForDedupe(raw);
    if (!key) continue;
    picks.push({ key, url: raw, score: firecrawlUrlPriorityScore(raw) });
  }

  picks.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  for (const p of picks) {
    if (out.has(p.key)) continue;
    out.set(p.key, p.url);
    if (out.size >= firecrawlTopN) break;
  }
  return out;
}

export function orderedFirecrawlScrapeUrls(targetByKey: Map<string, string>): string[] {
  return [...targetByKey.values()].sort(
    (a, b) => firecrawlUrlPriorityScore(b) - firecrawlUrlPriorityScore(a)
  );
}
