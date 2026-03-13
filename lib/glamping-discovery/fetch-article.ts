/**
 * Fetch article content from URL and extract main text
 * Uses cheerio for HTML parsing. Truncates to ~50k chars for OpenAI context.
 *
 * Features:
 * - Retry with exponential backoff for 5xx/429/network errors
 * - Browser-like headers to reduce 403 blocks
 * - Firecrawl fallback when Cheerio fails (403, insufficient content)
 * - Firecrawl primary for Google News URLs (Cheerio rarely works on redirect pages)
 * - Optional --firecrawl-primary to try Firecrawl before Cheerio for all URLs
 */

import * as cheerio from 'cheerio';

const MAX_CONTENT_LENGTH = 50000;
const MIN_CONTENT_LENGTH = 100;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const FIRECRAWL_DELAY_MS = 1500;

export interface FetchArticleOptions {
  /** Try Firecrawl before Cheerio for all URLs (not just Google News) */
  firecrawlPrimary?: boolean;
}

/** Browser-like headers to reduce bot blocking */
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry for transient errors (5xx, 429, network)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = INITIAL_RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, options);
      const isRetryable =
        res.status === 429 ||
        (res.status >= 500 && res.status < 600);
      if (!res.ok && isRetryable && attempt < MAX_RETRIES) {
        lastError = new Error(`${url}: ${res.status} ${res.statusText}`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await sleep(delay);
        delay *= 2;
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

/**
 * Extract main text content from HTML
 */
function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer, ads
  $('script, style, nav, footer, aside, [role="navigation"], .ad, .ads').remove();

  // Prefer article, main, or content areas
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.article-body',
    '.post-content',
    '.entry-content',
    '.content',
    '.story-body',
    'body',
  ];

  let text = '';
  for (const sel of contentSelectors) {
    const el = $(sel).first();
    if (el.length) {
      text = el.text();
      if (text.trim().length > 500) break;
    }
  }

  if (!text || text.trim().length < 200) {
    text = $('body').text();
  }

  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Try to extract canonical/source URL from HTML (e.g. Google News pages)
 */
function extractCanonicalUrl(html: string): string | null {
  const $ = cheerio.load(html);
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical && canonical.startsWith('http')) return canonical;
  const ogUrl = $('meta[property="og:url"]').attr('content');
  if (ogUrl && ogUrl.startsWith('http')) return ogUrl;
  return null;
}

let lastFirecrawlCallTime = 0;

function isGoogleNewsUrl(url: string): boolean {
  return url.includes('news.google.com') || url.includes('google.com/rss');
}

/**
 * Resolve Google News redirect URL to final destination.
 * Issues GET with redirect: follow to get the actual publisher URL.
 */
async function resolveGoogleNewsUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: DEFAULT_HEADERS,
    });
    return res.url;
  } catch {
    return url;
  }
}

/**
 * Try Firecrawl scrape (optional, requires FIRECRAWL_API_KEY).
 * Rate-limited to avoid hitting Firecrawl limits.
 */
async function tryFirecrawlScrape(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  const now = Date.now();
  const elapsed = now - lastFirecrawlCallTime;
  if (elapsed < FIRECRAWL_DELAY_MS) {
    await sleep(FIRECRAWL_DELAY_MS - elapsed);
  }
  lastFirecrawlCallTime = Date.now();

  try {
    const Firecrawl = (await import('@mendable/firecrawl-js')).default;
    const firecrawl = new Firecrawl({ apiKey });
    const result = (await firecrawl.scrape(url, {
      formats: ['markdown'],
    })) as { markdown?: string; success?: boolean } | undefined;

    const md = result?.markdown ?? '';
    if (md && md.trim().length >= MIN_CONTENT_LENGTH) {
      return md.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }
  } catch {
    // Firecrawl failed; return null to propagate original error
  }
  return null;
}

/**
 * Fetch article content from URL (Cheerio first, Firecrawl fallback on failure)
 * For Google News URLs or when firecrawlPrimary: tries Firecrawl first.
 * Returns extracted text, truncated to MAX_CONTENT_LENGTH
 */
export async function fetchArticleContent(
  url: string,
  options: FetchArticleOptions = {}
): Promise<string> {
  const { firecrawlPrimary = false } = options;
  const useFirecrawlFirst =
    firecrawlPrimary ||
    (isGoogleNewsUrl(url) && !!process.env.FIRECRAWL_API_KEY);

  if (useFirecrawlFirst) {
    let targetUrl = url;
    if (isGoogleNewsUrl(url)) {
      targetUrl = await resolveGoogleNewsUrl(url);
    }
    const firecrawlText = await tryFirecrawlScrape(targetUrl);
    if (firecrawlText) {
      return firecrawlText.substring(0, MAX_CONTENT_LENGTH);
    }
    if (firecrawlPrimary) {
      throw new Error(`Firecrawl failed to scrape ${url}`);
    }
    if (targetUrl !== url) {
      url = targetUrl;
    }
  }

  const res = await fetchWithRetry(url, {
    headers: DEFAULT_HEADERS,
  });

  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      const firecrawlText = await tryFirecrawlScrape(url);
      if (firecrawlText) {
        return firecrawlText.substring(0, MAX_CONTENT_LENGTH);
      }
    }
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  let text = extractTextFromHtml(html);

  if (
    (!text || text.length < MIN_CONTENT_LENGTH) &&
    isGoogleNewsUrl(url)
  ) {
    const canonical = extractCanonicalUrl(html);
    if (canonical && canonical !== url) {
      try {
        const canonRes = await fetchWithRetry(canonical, {
          headers: DEFAULT_HEADERS,
        });
        if (canonRes.ok) {
          const canonHtml = await canonRes.text();
          text = extractTextFromHtml(canonHtml);
        }
      } catch {
        // Canonical fetch failed
      }
    }
  }

  if (!text || text.length < MIN_CONTENT_LENGTH) {
    const firecrawlText = await tryFirecrawlScrape(url);
    if (firecrawlText) {
      return firecrawlText.substring(0, MAX_CONTENT_LENGTH);
    }
    throw new Error(`Insufficient content extracted from ${url}`);
  }

  return text.substring(0, MAX_CONTENT_LENGTH);
}
