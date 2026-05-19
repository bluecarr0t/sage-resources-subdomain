/**
 * Fetch article URLs from configured Google News RSS feeds.
 */

import Parser from 'rss-parser';
import { GLAMPING_RSS_FEEDS } from './feeds';

/** Minimum combined RSS text to pass as fallback when the article page cannot be scraped */
const MIN_RSS_SNIPPET_CHARS = 80;

export interface RssArticleTask {
  url: string;
  discoverySource: string;
  rssFallbackText?: string;
}

function buildRssItemFallbackText(item: Parser.Item): string | undefined {
  const parts: string[] = [];
  if (item.title?.trim()) parts.push(item.title.trim());
  const encoded = (item as Record<string, string | undefined>)['content:encoded'];
  const body = item.content ?? encoded ?? item.summary ?? item.contentSnippet;
  if (body?.trim()) parts.push(body.trim());
  const combined = parts.join('\n\n').trim();
  return combined.length >= MIN_RSS_SNIPPET_CHARS ? combined : undefined;
}

/**
 * Parse all configured RSS feeds and return unique article URLs (newest-first per feed order).
 * @param limit — cap total unique URLs returned (undefined = no cap)
 */
export async function getRssArticleTasks(limit?: number): Promise<RssArticleTask[]> {
  const parser = new Parser();
  const results: RssArticleTask[] = [];

  for (const feed of GLAMPING_RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        const link = item.link;
        if (link && link.startsWith('http')) {
          const rssFallbackText = buildRssItemFallbackText(item);
          results.push({ url: link, discoverySource: feed.discoverySource, rssFallbackText });
        }
      }
    } catch (err) {
      console.warn(
        `[glamping-discovery/rss] Failed to parse feed ${feed.name}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  const unique = Array.from(new Map(results.map((r) => [r.url, r])).values());
  return limit ? unique.slice(0, limit) : unique;
}
