/**
 * Tavily search for glamping-related news articles
 * Returns article URLs for the discovery pipeline
 */

import { tavily } from '@tavily/core';

const TAVILY_DELAY_MS = 600;

const DISCOVERY_QUERIES = [
  '"new glamping resort" opening 2025',
  '"glamping" "grand opening" site:news',
  '"luxury camping" resort opened',
];

export interface TavilyArticleResult {
  url: string;
  title?: string;
  score?: number;
}

/**
 * Search Tavily for glamping-related news articles
 * Returns unique URLs that may contain new glamping property announcements
 */
export async function searchGlampingNews(
  tavilyApiKey: string,
  limitPerQuery: number = 5
): Promise<TavilyArticleResult[]> {
  const client = tavily({ apiKey: tavilyApiKey });
  const seen = new Set<string>();
  const results: TavilyArticleResult[] = [];

  for (const query of DISCOVERY_QUERIES) {
    try {
      const response = await client.search(query, {
        searchDepth: 'advanced',
        maxResults: limitPerQuery,
        includeAnswer: false,
      });

      for (const r of response.results || []) {
        const url = r.url;
        if (url && url.startsWith('http') && !seen.has(url)) {
          seen.add(url);
          results.push({
            url,
            title: r.title,
            score: r.score,
          });
        }
      }
    } catch (err) {
      console.warn(`Tavily query failed: "${query}" –`, err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));
  }

  return results;
}
