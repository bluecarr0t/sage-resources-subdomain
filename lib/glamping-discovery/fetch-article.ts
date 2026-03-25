/**
 * Fetch article content from URL and extract main text
 * Uses cheerio for HTML parsing. Truncates to ~50k chars for OpenAI context.
 *
 * Features:
 * - Retry with exponential backoff for 5xx/429/network errors
 * - Browser-like headers; one 403/401 retry with Safari User-Agent
 * - Google News: follow redirects, then publisher link harvest from wrapper HTML
 * - Firecrawl fallback / primary (when FIRECRAWL_API_KEY is set)
 * - RSS title/description fallback when full article body cannot be read
 */

import * as cheerio from 'cheerio';

const MAX_CONTENT_LENGTH = 50000;
const MIN_CONTENT_LENGTH = 100;
/** RSS snippets are shorter; still useful for extraction when the article page fails */
const MIN_RSS_FALLBACK_LENGTH = 80;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const FIRECRAWL_DELAY_MS = 1500;
const MAX_PUBLISHER_URLS_TO_TRY = 6;

export interface FetchArticleOptions {
  /** Try Firecrawl before Cheerio for all URLs (not just Google News) */
  firecrawlPrimary?: boolean;
  /**
   * Plain text or HTML from the RSS item (title/summary/content).
   * Used when the article URL cannot be fetched or yields too little text.
   */
  rssFallbackText?: string;
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

const SAFARI_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry for transient errors (5xx, 429, network)
 */
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;
  let delay = INITIAL_RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, options);
      const isRetryable = res.status === 429 || (res.status >= 500 && res.status < 600);
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
 * After normal fetch, retry once with Safari UA on 401/403 (some publishers block "Chrome" only).
 */
async function fetchWithRetryMaybe403AltUa(url: string, init: RequestInit = {}): Promise<Response> {
  const merged: RequestInit = {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...(init.headers as Record<string, string>) },
    redirect: init.redirect ?? 'follow',
  };
  const res = await fetchWithRetry(url, merged);
  if (res.status === 403 || res.status === 401) {
    const retry = await fetch(url, {
      ...init,
      headers: {
        ...DEFAULT_HEADERS,
        'User-Agent': SAFARI_USER_AGENT,
        ...(init.headers as Record<string, string>),
      },
      redirect: init.redirect ?? 'follow',
    });
    if (retry.ok) return retry;
  }
  return res;
}

export function isGoogleNewsArticleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'news.google.com' || host.endsWith('.news.google.com')) return true;
    if (
      (host === 'google.com' || host.endsWith('.google.com')) &&
      u.pathname.includes('/rss/articles/')
    ) {
      return true;
    }
    return false;
  } catch {
    return /news\.google\.com\/rss\/articles/i.test(url) || /google\.com\/rss\/articles/i.test(url);
  }
}

function isLikelyPublisherArticleHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h.includes('google')) return false;
  const blockedSuffixes = [
    'facebook.com',
    'fb.com',
    'twitter.com',
    't.co',
    'twimg.com',
    'x.com',
    'instagram.com',
    'linkedin.com',
    'pinterest.com',
    'youtube.com',
    'youtu.be',
    'reddit.com',
    'tiktok.com',
    'bing.com',
    'microsoft.com',
    'msn.com',
  ];
  if (blockedSuffixes.some((s) => h === s || h.endsWith(`.${s}`))) return false;
  return true;
}

/**
 * Collect external article URLs from a Google News wrapper page (canonical, og:url, article links).
 * Exported for unit tests.
 */
export function extractPublisherCandidateUrls(html: string, limit = MAX_PUBLISHER_URLS_TO_TRY): string[] {
  const $ = cheerio.load(html);
  const scored: { url: string; score: number }[] = [];
  const seen = new Set<string>();

  const consider = (raw: string | undefined, baseScore: number) => {
    if (!raw?.startsWith('http')) return;
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      if (!isLikelyPublisherArticleHost(u.hostname)) return;
      const norm = u.toString().replace(/#[^#]*$/, '');
      if (seen.has(norm)) return;
      seen.add(norm);
      const pathLen = u.pathname.length;
      scored.push({ url: norm, score: baseScore + pathLen });
    } catch {
      /* ignore */
    }
  };

  consider($('link[rel="canonical"]').attr('href'), 1000);
  consider($('meta[property="og:url"]').attr('content'), 900);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href?.startsWith('http')) consider(href, 0);
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.url);
}

export function normalizeRssFallbackText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const stripped = trimmed.includes('<')
    ? trimmed.replace(/<[^>]+>/g, ' ')
    : trimmed;
  return stripped.replace(/\s+/g, ' ').trim();
}

/**
 * Extract main text content from HTML
 */
function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  $('script, style, nav, footer, aside, [role="navigation"], .ad, .ads').remove();

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

let lastFirecrawlCallTime = 0;

/**
 * Resolve Google News URL to the final URL after redirects (often the publisher).
 */
async function resolveGoogleNewsRedirectUrl(url: string): Promise<string> {
  try {
    const res = await fetchWithRetryMaybe403AltUa(url, {
      method: 'GET',
      redirect: 'follow',
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
    // Firecrawl failed; caller tries next strategy
  }
  return null;
}

async function tryFirecrawlUrlChain(urls: string[]): Promise<string | null> {
  for (const u of urls) {
    const t = await tryFirecrawlScrape(u);
    if (t) return t;
  }
  return null;
}

function clip(text: string): string {
  return text.substring(0, MAX_CONTENT_LENGTH);
}

async function fetchGoogleNewsWithFirecrawlFirst(
  url: string,
  firecrawlPrimary: boolean
): Promise<string | null> {
  let targetUrl = url;
  if (isGoogleNewsArticleUrl(url)) {
    targetUrl = await resolveGoogleNewsRedirectUrl(url);
  }

  let text = await tryFirecrawlScrape(targetUrl);
  if (text) return clip(text);

  if (isGoogleNewsArticleUrl(url)) {
    text = await tryFirecrawlScrape(url);
    if (text) return clip(text);

    try {
      const res = await fetchWithRetryMaybe403AltUa(url, { redirect: 'follow' });
      if (res.ok) {
        const html = await res.text();
        const candidates = extractPublisherCandidateUrls(html, 4);
        const fc = await tryFirecrawlUrlChain(candidates);
        if (fc) return clip(fc);
      }
    } catch {
      /* fall through */
    }
  }

  if (firecrawlPrimary) {
    throw new Error(`Firecrawl failed to scrape ${url}`);
  }

  return null;
}

async function fetchGoogleNewsCheerioPath(
  originalUrl: string,
  rssFallbackText: string | undefined
): Promise<string> {
  const res = await fetchWithRetryMaybe403AltUa(originalUrl, { redirect: 'follow' });

  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      const fc = await tryFirecrawlUrlChain([originalUrl, await resolveGoogleNewsRedirectUrl(originalUrl)]);
      if (fc) return clip(fc);
    }
    throw new Error(`Failed to fetch ${originalUrl}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const finalUrl = res.url;

  if (!isGoogleNewsArticleUrl(finalUrl)) {
    let text = extractTextFromHtml(html);
    if (text.length >= MIN_CONTENT_LENGTH) return clip(text);
    const fc = await tryFirecrawlScrape(finalUrl);
    if (fc) return clip(fc);
  }

  let text = extractTextFromHtml(html);
  if (text.length >= MIN_CONTENT_LENGTH) return clip(text);

  const candidates = extractPublisherCandidateUrls(html);
  for (const pubUrl of candidates) {
    try {
      const r2 = await fetchWithRetryMaybe403AltUa(pubUrl, { redirect: 'follow' });
      if (r2.ok) {
        const inner = extractTextFromHtml(await r2.text());
        if (inner.length >= MIN_CONTENT_LENGTH) return clip(inner);
      } else if (r2.status === 403 || r2.status === 401) {
        const fc = await tryFirecrawlScrape(pubUrl);
        if (fc) return clip(fc);
      }
    } catch {
      /* try next candidate */
    }
  }

  const uniqueFcUrls = [originalUrl, finalUrl, ...candidates].filter(
    (u, i, a) => a.indexOf(u) === i
  );
  const firecrawlText = await tryFirecrawlUrlChain(uniqueFcUrls);
  if (firecrawlText) return clip(firecrawlText);

  if (rssFallbackText) {
    const fb = normalizeRssFallbackText(rssFallbackText);
    if (fb.length >= MIN_RSS_FALLBACK_LENGTH) return clip(fb);
  }

  throw new Error(`Insufficient content extracted from ${originalUrl}`);
}

async function fetchNonGoogleArticle(
  url: string,
  rssFallbackText: string | undefined
): Promise<string> {
  const res = await fetchWithRetryMaybe403AltUa(url, { redirect: 'follow' });

  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      const firecrawlText = await tryFirecrawlScrape(url);
      if (firecrawlText) return clip(firecrawlText);
    }
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  let text = extractTextFromHtml(html);

  if (!text || text.length < MIN_CONTENT_LENGTH) {
    const firecrawlText = await tryFirecrawlScrape(url);
    if (firecrawlText) return clip(firecrawlText);

    if (rssFallbackText) {
      const fb = normalizeRssFallbackText(rssFallbackText);
      if (fb.length >= MIN_RSS_FALLBACK_LENGTH) return clip(fb);
    }

    throw new Error(`Insufficient content extracted from ${url}`);
  }

  return clip(text);
}

/**
 * Fetch article content from URL (Cheerio first, Firecrawl fallback on failure)
 * For Google News URLs or when firecrawlPrimary: tries Firecrawl first when API key is set.
 * Returns extracted text, truncated to MAX_CONTENT_LENGTH
 */
export async function fetchArticleContent(
  url: string,
  options: FetchArticleOptions = {}
): Promise<string> {
  const { firecrawlPrimary = false, rssFallbackText } = options;

  const useFirecrawlFirst =
    firecrawlPrimary ||
    (isGoogleNewsArticleUrl(url) && !!process.env.FIRECRAWL_API_KEY);

  if (useFirecrawlFirst) {
    const early = await fetchGoogleNewsWithFirecrawlFirst(url, firecrawlPrimary);
    if (early) return early;
  }

  if (isGoogleNewsArticleUrl(url)) {
    return fetchGoogleNewsCheerioPath(url, rssFallbackText);
  }

  return fetchNonGoogleArticle(url, rssFallbackText);
}
