/**
 * Tavily web search for report draft enrichment
 * Fetches targeted market context (tourism, demographics) to supplement benchmarks
 */

import { tavily } from '@tavily/core';
import type { ReportDraftInput } from './types';

const TAVILY_DELAY_MS = 600;
const MAX_RESULTS_PER_QUERY = 2;
const MAX_CONTENT_PER_RESULT = 2000;
const MAX_TOTAL_CONTENT = 6000;

/**
 * Fetch web context for a property/location via Tavily.
 * Returns markdown content suitable for the AI prompt, or null if unavailable.
 */
export async function fetchWebContextForReport(
  input: ReportDraftInput
): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return null;

  const client = tavily({ apiKey });
  const { city, state, property_name } = input;

  const queries = [
    `${city} ${state} tourism statistics outdoor hospitality`,
    `${state} glamping RV campground market`,
  ];

  if (property_name) {
    queries.push(`${property_name} ${city} ${state} development`);
  }

  const allResults: Array<{ content: string; score: number }> = [];

  for (const query of queries) {
    try {
      const response = await client.search(query, {
        searchDepth: 'advanced',
        maxResults: MAX_RESULTS_PER_QUERY,
        includeAnswer: true,
        includeRawContent: 'markdown',
      });

      for (const r of response.results) {
        const text = (r.rawContent || r.content || '').slice(0, MAX_CONTENT_PER_RESULT);
        if (text) allResults.push({ content: text, score: r.score ?? 0 });
      }
    } catch (err) {
      console.warn(
        `[tavily-context] Query failed: "${query.slice(0, 50)}…" –`,
        err instanceof Error ? err.message : err
      );
    }
    await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));
  }

  if (allResults.length === 0) return null;

  allResults.sort((a, b) => b.score - a.score);

  let totalLen = 0;
  const parts: string[] = [];
  for (const r of allResults) {
    if (totalLen + r.content.length > MAX_TOTAL_CONTENT) {
      const remaining = MAX_TOTAL_CONTENT - totalLen;
      if (remaining > 300) parts.push(r.content.slice(0, remaining));
      break;
    }
    parts.push(r.content);
    totalLen += r.content.length;
  }

  return parts.join('\n\n---\n\n');
}
