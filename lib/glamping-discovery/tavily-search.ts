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

/** Canada-focused news / openings (Tavily). */
export const DISCOVERY_QUERIES_CANADA = [
  'glamping resort opening Canada 2025',
  '"glamping" Canada "grand opening" OR opening 2025',
  'site:ca luxury camping glamping resort new',
];

export interface TavilyArticleResult {
  url: string;
  title?: string;
  score?: number;
}

export type GlampingTavilyQuerySet = 'default' | 'canada';

/**
 * Search Tavily for glamping-related news articles
 * Returns unique URLs that may contain new glamping property announcements
 */
export async function searchGlampingNews(
  tavilyApiKey: string,
  limitPerQuery: number = 5,
  querySet: GlampingTavilyQuerySet = 'default'
): Promise<TavilyArticleResult[]> {
  const client = tavily({ apiKey: tavilyApiKey });
  const seen = new Set<string>();
  const results: TavilyArticleResult[] = [];
  const queries = querySet === 'canada' ? DISCOVERY_QUERIES_CANADA : DISCOVERY_QUERIES;

  for (const query of queries) {
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
