import { fetchArticleContent } from '@/lib/glamping-discovery/fetch-article';
import { scrapeUrlMarkdown } from '@/lib/comps-v2/scrape-url';
import { searchContactPagesForCompany } from '@/lib/contact-research/seed';
import type { ContactSeedCandidate } from '@/lib/contact-research/types';

const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/team', '/'];

function joinUrl(base: string, path: string): string | null {
  try {
    const u = new URL(base);
    if (path === '/') return `${u.origin}/`;
    return new URL(path, u.origin).toString();
  } catch {
    return null;
  }
}

/**
 * Candidate page URLs to scrape for a seed entity.
 */
export function candidatePageUrls(candidate: ContactSeedCandidate): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || !trimmed.startsWith('http') || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  if (candidate.official_url) {
    for (const path of CONTACT_PATHS) {
      add(joinUrl(candidate.official_url, path));
    }
    add(candidate.official_url);
  }

  return urls;
}

export type ScrapedPage = {
  url: string;
  markdown: string;
};

/**
 * Fetch page text via Cheerio (and Firecrawl fallback when configured).
 */
export async function scrapeContactPage(url: string): Promise<ScrapedPage | null> {
  const firecrawl = await scrapeUrlMarkdown(url);
  if (firecrawl.ok) {
    return { url, markdown: firecrawl.markdown };
  }

  try {
    const text = await fetchArticleContent(url, { firecrawlPrimary: false });
    if (text && text.trim().length >= 80) {
      return { url, markdown: text };
    }
  } catch {
    // fall through
  }

  return null;
}

/**
 * Resolve and scrape pages for a seed candidate. Optionally expand via Tavily.
 */
export async function resolveAndScrapePages(options: {
  candidate: ContactSeedCandidate;
  tavilyApiKey: string | null;
  maxPages?: number;
}): Promise<ScrapedPage[]> {
  const { candidate, tavilyApiKey, maxPages = 3 } = options;
  const urls = [...candidatePageUrls(candidate)];

  if (tavilyApiKey && urls.length < maxPages) {
    const found = await searchContactPagesForCompany(
      tavilyApiKey,
      candidate.company_name,
      candidate.suggested_category
    );
    for (const u of found) {
      if (!urls.includes(u)) urls.push(u);
    }
  }

  const pages: ScrapedPage[] = [];
  for (const url of urls.slice(0, Math.max(maxPages, 1))) {
    const page = await scrapeContactPage(url);
    if (page) pages.push(page);
    if (pages.length >= maxPages) break;
  }

  return pages;
}
