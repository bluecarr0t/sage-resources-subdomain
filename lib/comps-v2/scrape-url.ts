/**
 * Firecrawl markdown scrape for comps-v2 (server-only, rate-limited per pipeline run).
 */

import { isUrlSafeForServerScrape } from '@/lib/comps-v2/safe-scrape-url';
import { isLikelyTransientNetworkError, sleepBackoffMs } from '@/lib/comps-v2/retry-transient';

const FIRECRAWL_DELAY_MS = 800;
const MIN_LEN = 80;
const FIRECRAWL_MAX_ATTEMPTS = 3;
const FIRECRAWL_RETRY_BASE_MS = 600;

export type FirecrawlThrottleState = { lastCall: number };

export type ScrapeMarkdownResult =
  | { ok: true; markdown: string; html?: string }
  | {
      ok: false;
      reason: 'no_api_key' | 'invalid_url' | 'blocked_url' | 'too_short' | 'fetch_error';
    };

const MAX_HTML_FOR_GEO = 200_000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Scrape URL to markdown. Pass `throttle` (mutable `{ lastCall }`) to space calls within one pipeline;
 * omit for one-off scrapes (e.g. deep enrich) — no cross-request global lock.
 */
export async function scrapeUrlMarkdown(
  url: string,
  throttle?: FirecrawlThrottleState
): Promise<ScrapeMarkdownResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: 'no_api_key' };
  }

  let u: string;
  try {
    u = url.trim();
    new URL(u);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (!isUrlSafeForServerScrape(u)) {
    return { ok: false, reason: 'blocked_url' };
  }

  for (let attempt = 0; attempt < FIRECRAWL_MAX_ATTEMPTS; attempt++) {
    if (throttle) {
      const now = Date.now();
      const elapsed = now - throttle.lastCall;
      if (elapsed < FIRECRAWL_DELAY_MS) {
        await sleep(FIRECRAWL_DELAY_MS - elapsed);
      }
      throttle.lastCall = Date.now();
    }
    try {
      const Firecrawl = (await import('@mendable/firecrawl-js')).default;
      const firecrawl = new Firecrawl({ apiKey });
      const result = (await firecrawl.scrape(u, {
        formats: ['markdown', 'html'],
      })) as { markdown?: string; html?: string } | undefined;
      const md = result?.markdown ?? '';
      const rawHtml = result?.html?.trim() ?? '';
      if (md && md.trim().length >= MIN_LEN) {
        return {
          ok: true,
          markdown: md.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
          ...(rawHtml
            ? { html: rawHtml.length > MAX_HTML_FOR_GEO ? rawHtml.slice(0, MAX_HTML_FOR_GEO) : rawHtml }
            : {}),
        };
      }
      return { ok: false, reason: 'too_short' };
    } catch (e) {
      const retry = attempt < FIRECRAWL_MAX_ATTEMPTS - 1 && isLikelyTransientNetworkError(e);
      if (retry) {
        console.warn('[firecrawl] scrape transient failure, retrying', e);
        await sleepBackoffMs(attempt, FIRECRAWL_RETRY_BASE_MS);
        continue;
      }
      return { ok: false, reason: 'fetch_error' };
    }
  }
  return { ok: false, reason: 'fetch_error' };
}
