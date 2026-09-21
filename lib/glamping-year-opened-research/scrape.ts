import {
  scrapeUrlMarkdown,
  type FirecrawlThrottleState,
} from '@/lib/comps-v2/scrape-url';

const ABOUT_HINTS = ['/about', '/our-story', '/story', '/history', 'about-us'];

export type YearOpenedScrape = {
  markdown: string;
  sources: string[];
};

const MIN_SCRAPE_GAP_MS = 6500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function pacedScrape(url: string, throttle?: FirecrawlThrottleState) {
  if (throttle && throttle.lastCall > 0) {
    const wait = MIN_SCRAPE_GAP_MS - (Date.now() - throttle.lastCall);
    if (wait > 0) await sleep(wait);
  }
  return scrapeUrlMarkdown(url, throttle);
}

function sameHostLinks(markdown: string, pageUrl: string): string[] {
  let host = '';
  try {
    host = new URL(pageUrl).host;
  } catch {
    return [];
  }
  const found = new Set<string>();
  const pattern = /https?:\/\/[^\s)\]"']+/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const link = match[0];
    try {
      if (new URL(link).host === host) found.add(link);
    } catch {
      /* skip malformed links */
    }
  }
  return [...found];
}

function scoreAboutUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  for (const hint of ABOUT_HINTS) {
    if (lower.includes(hint)) score += 10;
  }
  return score;
}

/**
 * Scrape the property site and one about / story / history page when linked.
 */
export async function scrapeYearOpenedPages(
  primaryUrl: string,
  throttle?: FirecrawlThrottleState
): Promise<YearOpenedScrape | { error: string }> {
  const primary = await pacedScrape(primaryUrl, throttle);
  if (!primary.ok) return { error: primary.reason };

  const sources = [primaryUrl];
  let markdown = primary.markdown;
  const about = sameHostLinks(primary.markdown, primaryUrl)
    .map((url) => ({ url, score: scoreAboutUrl(url) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (about && about.url !== primaryUrl) {
    const secondary = await pacedScrape(about.url, throttle);
    if (secondary.ok) {
      markdown = `${markdown}\n\n${secondary.markdown}`;
      sources.push(about.url);
    }
  }

  return { markdown, sources };
}
