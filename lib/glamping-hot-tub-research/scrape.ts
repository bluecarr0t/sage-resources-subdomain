import {
  scrapeUrlMarkdown,
  type FirecrawlThrottleState,
} from '@/lib/comps-v2/scrape-url';

const THIN_MARKDOWN_CHARS = 500;
const SECONDARY_PATH_SUFFIXES = [
  '/accommodations',
  '/rooms',
  '/sites',
  '/stay',
  '/lodging',
  '/cabins',
  '/tents',
  '/glamping',
];

function baseOrigin(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function extractMarkdownLinks(markdown: string, origin: string): string[] {
  const links = new Set<string>();
  const mdLink = /\]\((https?:\/\/[^)\s]+)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = mdLink.exec(markdown)) !== null) {
    links.add(m[1]!);
  }
  const bare = /https?:\/\/[^\s)\]"']+/gi;
  while ((m = bare.exec(markdown)) !== null) {
    links.add(m[0]!);
  }
  try {
    const host = new URL(origin).host;
    for (const link of [...links]) {
      if (!link.includes(host)) links.delete(link);
    }
  } catch {
    /* ignore */
  }
  return [...links];
}

function scoreSecondaryUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  for (const suffix of SECONDARY_PATH_SUFFIXES) {
    if (lower.includes(suffix)) score += 10;
  }
  if (lower.includes('accommodation') || lower.includes('suite')) score += 3;
  return score;
}

export type PropertyScrapeResult = {
  primaryUrl: string;
  markdown: string;
  sources: string[];
};

/**
 * Scrape property homepage and optionally one accommodations/rooms page.
 */
export async function scrapePropertyPages(
  primaryUrl: string,
  throttle?: FirecrawlThrottleState
): Promise<PropertyScrapeResult | { error: string }> {
  const primary = await scrapeUrlMarkdown(primaryUrl, throttle);
  if (!primary.ok) {
    return { error: primary.reason };
  }

  let combined = primary.markdown;
  const sources = [primaryUrl];

  if (combined.length < THIN_MARKDOWN_CHARS) {
    const origin = baseOrigin(primaryUrl);
    if (origin) {
      const candidates = SECONDARY_PATH_SUFFIXES.map((s) => `${origin}${s}`);
      for (const url of candidates) {
        const r = await scrapeUrlMarkdown(url, throttle);
        if (r.ok && r.markdown.length > 100) {
          combined += `\n\n---\n\n## ${url}\n\n${r.markdown}`;
          sources.push(url);
          break;
        }
      }
    }
  } else {
    const origin = baseOrigin(primaryUrl);
    if (origin) {
      const links = extractMarkdownLinks(combined, origin)
        .map((u) => u.split('#')[0]!)
        .filter((u) => scoreSecondaryUrl(u) > 0)
        .sort((a, b) => scoreSecondaryUrl(b) - scoreSecondaryUrl(a));

      const top = links[0];
      if (top && top !== primaryUrl && !primaryUrl.startsWith(top)) {
        const r = await scrapeUrlMarkdown(top, throttle);
        if (r.ok && r.markdown.length > 200) {
          combined += `\n\n---\n\n## ${top}\n\n${r.markdown}`;
          sources.push(top);
        }
      }
    }
  }

  return { primaryUrl, markdown: combined.slice(0, 48_000), sources };
}
