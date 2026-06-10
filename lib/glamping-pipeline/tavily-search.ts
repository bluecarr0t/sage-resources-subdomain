import { tavily } from '@tavily/core';

const TAVILY_DELAY_MS = 600;

/** USA pipeline / pre-opening glamping news queries (weekly sync). */
export const PIPELINE_DISCOVERY_QUERIES = [
  'site:moderncampground.com/usa proposed glamping resort United States',
  'site:moderncampground.com/usa glamping under construction opening 2026',
  'site:moderncampground.com/usa glamping approved planning commission',
  '"proposed glamping" resort United States planning board 2026',
  'new glamping resort under construction United States domes cabins 2026',
  'glamping resort groundbreaking United States 2025 2026',
  'glamping resort project cancelled abandoned United States',
  'proposed glamping development denied shelved United States',
] as const;

/** USA RV park / resort / campground pipeline news queries (weekly sync). */
export const PIPELINE_RV_DISCOVERY_QUERIES = [
  'site:moderncampground.com/usa proposed RV park United States',
  'site:moderncampground.com/usa RV resort under construction',
  'site:moderncampground.com/usa proposed campground United States',
  'site:moderncampground.com/usa campground under construction',
  'new RV park resort under construction United States 2026',
  'new campground RV sites proposed United States planning 2026',
  'RV park planning commission approved United States',
  'RV resort groundbreaking United States 2025 2026',
  'campground development proposed United States RV sites',
  'RV park project cancelled abandoned United States',
] as const;

export type PipelineTavilyArticle = {
  url: string;
  title?: string;
  score?: number;
};

async function searchPipelineNewsQueries(
  tavilyApiKey: string,
  queries: readonly string[],
  limitPerQuery: number,
  logLabel: string
): Promise<PipelineTavilyArticle[]> {
  const client = tavily({ apiKey: tavilyApiKey });
  const seen = new Set<string>();
  const results: PipelineTavilyArticle[] = [];

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
      console.warn(
        `[glamping-pipeline] Tavily ${logLabel} query failed: "${query}" –`,
        err instanceof Error ? err.message : err
      );
    }
    await new Promise((resolve) => setTimeout(resolve, TAVILY_DELAY_MS));
  }

  return results;
}

export async function searchPipelineGlampingNews(
  tavilyApiKey: string,
  limitPerQuery: number = 5
): Promise<PipelineTavilyArticle[]> {
  return searchPipelineNewsQueries(
    tavilyApiKey,
    PIPELINE_DISCOVERY_QUERIES,
    limitPerQuery,
    'glamping'
  );
}

export async function searchPipelineRvNews(
  tavilyApiKey: string,
  limitPerQuery: number = 5
): Promise<PipelineTavilyArticle[]> {
  return searchPipelineNewsQueries(
    tavilyApiKey,
    PIPELINE_RV_DISCOVERY_QUERIES,
    limitPerQuery,
    'rv'
  );
}

/** Merge glamping + RV Tavily hits by URL (glamping results first). */
export async function searchPipelineAllSegmentsNews(
  tavilyApiKey: string,
  limitPerQuery: number = 5
): Promise<PipelineTavilyArticle[]> {
  const [glamping, rv] = await Promise.all([
    searchPipelineGlampingNews(tavilyApiKey, limitPerQuery),
    searchPipelineRvNews(tavilyApiKey, limitPerQuery),
  ]);
  const seen = new Set<string>();
  const merged: PipelineTavilyArticle[] = [];
  for (const article of [...glamping, ...rv]) {
    if (seen.has(article.url)) continue;
    seen.add(article.url);
    merged.push(article);
  }
  return merged;
}
