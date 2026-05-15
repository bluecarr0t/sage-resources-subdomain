import FirecrawlApp from '@mendable/firecrawl-js';
import { isUrlSafeForServerScrape } from '@/lib/comps-v2/safe-scrape-url';
import { stripHtmlToPlainText } from '@/lib/glamping-description-research/html-to-text';

const DEFAULT_MAX_CHARS = 14_000;
const FETCH_TIMEOUT_MS = 18_000;
const MAX_HTML_BYTES = 600_000;

function normalizeHttpUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export interface FetchedEvidence {
  url: string;
  /** Plain text or markdown-derived plain-ish text */
  text: string;
}

/**
 * Fetch one public URL: Firecrawl markdown when client provided, else bounded `fetch` + HTML strip.
 */
export async function fetchPrimaryUrlEvidence(
  rawUrl: string | null | undefined,
  options: {
    firecrawl: FirecrawlApp | null;
    maxChars?: number;
  }
): Promise<{ ok: true; items: FetchedEvidence[] } | { ok: false; message: string }> {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const url = normalizeHttpUrl(rawUrl);
  if (!url) {
    return { ok: false, message: 'Property has no website URL to research.' };
  }
  if (!isUrlSafeForServerScrape(url)) {
    return { ok: false, message: 'URL failed SSRF safety checks for server fetch.' };
  }

  if (options.firecrawl) {
    try {
      const result = (await options.firecrawl.scrape(url, {
        formats: ['markdown'],
      })) as { markdown?: string; success?: boolean; error?: string };
      if (result.success === false) {
        return {
          ok: false,
          message: result.error || 'Firecrawl scrape returned unsuccessful.',
        };
      }
      const md = (result.markdown ?? '').trim();
      if (!md) {
        return { ok: false, message: 'Firecrawl returned empty markdown.' };
      }
      const text = md.length > maxChars ? `${md.slice(0, maxChars)}\n…` : md;
      return { ok: true, items: [{ url, text }] };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `Firecrawl error: ${msg}` };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'SageDescriptionResearch/1.0 (+https://resources.sageoutdooradvisory.com)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status} fetching ${url}` };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      return { ok: false, message: 'Response body too large.' };
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const text = stripHtmlToPlainText(html, maxChars);
    if (!text.trim()) {
      return { ok: false, message: 'Empty text after HTML stripping.' };
    }
    return { ok: true, items: [{ url, text }] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Fetch error: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}
