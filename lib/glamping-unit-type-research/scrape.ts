import {
  scrapeUrlMarkdown,
  type FirecrawlThrottleState,
} from '@/lib/comps-v2/scrape-url';

const STAY_HINTS = [
  '/accommodation',
  '/stay',
  '/lodging',
  '/cabin',
  '/glamping',
  '/tent',
  '/yurt',
  '/lodge',
];

const MIN_SCRAPE_GAP_MS = 6500;

export type UnitTypeScrape = {
  markdown: string;
  sources: string[];
};

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
    try {
      const link = match[0];
      if (new URL(link).host === host) found.add(link);
    } catch {
      /* skip malformed links */
    }
  }
  return [...found];
}

function scoreStayUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  for (const hint of STAY_HINTS) {
    if (lower.includes(hint)) score += 10;
  }
  return score;
}

/** Scrape the property site and one accommodations page when linked. */
export async function scrapeUnitTypePages(
  primaryUrl: string,
  throttle?: FirecrawlThrottleState
): Promise<UnitTypeScrape | { error: string }> {
  const primary = await pacedScrape(primaryUrl, throttle);
  if (!primary.ok) return { error: primary.reason };

  const sources = [primaryUrl];
  let markdown = primary.markdown;
  const stay = sameHostLinks(primary.markdown, primaryUrl)
    .map((url) => ({ url, score: scoreStayUrl(url) }))
    .filter((item) => item.score > 0 && item.url !== primaryUrl)
    .sort((a, b) => b.score - a.score)[0];

  if (stay) {
    const secondary = await pacedScrape(stay.url, throttle);
    if (secondary.ok) {
      markdown = `${markdown}\n\n${secondary.markdown}`;
      sources.push(stay.url);
    }
  }

  return { markdown, sources };
}
