/**
 * Tavily web research specifically for comparable properties.
 * Searches for nearby outdoor hospitality properties (glamping/RV)
 * and extracts structured comp data from web results.
 */

import { tavily } from '@tavily/core';
import type { ComparableProperty, SeasonalRates } from './types';

const MAX_RESULTS_PER_QUERY = 5;
const TAVILY_DELAY_MS = 500;
const MAX_WEB_COMPS = 8;

const EMPTY_SEASONAL: SeasonalRates = {
  winter_weekday: null, winter_weekend: null,
  spring_weekday: null, spring_weekend: null,
  summer_weekday: null, summer_weekend: null,
  fall_weekday: null, fall_weekend: null,
};

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
  score: number;
}

function extractPropertyName(title: string, url: string): string {
  const cleaned = title
    .replace(/\s*[-|–—]\s*(Hipcamp|RoverPass|Campspot|Glamping Hub|Pitchup|Tentrr|Recreation\.gov|Campendium|The Dyrt).*/i, '')
    .replace(/\s*[-|–—]\s*Book.*$/i, '')
    .replace(/\s*[-|–—]\s*Rates.*$/i, '')
    .trim();

  if (cleaned.length > 5) return cleaned;

  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.split('.')[0] || title;
  } catch {
    return title;
  }
}

function extractRateFromText(text: string): number | null {
  const patterns = [
    /\$(\d{2,4})(?:\.\d{2})?\s*(?:\/?\s*(?:night|nightly|per night))/i,
    /(?:rate|price|from|starting)\s*(?:of\s*)?\$(\d{2,4})(?:\.\d{2})?/i,
    /\$(\d{2,4})(?:\.\d{2})?\s*(?:avg|average)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const rate = parseFloat(match[1]);
      if (rate >= 20 && rate <= 2000) return rate;
    }
  }
  return null;
}

function extractSiteCount(text: string): number | null {
  const patterns = [
    /(\d{1,4})\s*(?:sites?|spaces?|campsites?|rv sites?|lots?|pads?|units?|cabins?|tents?|yurts?)/i,
    /(?:total|has|with|offers?|features?)\s*(\d{1,4})\s*(?:sites?|spaces?|campsites?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count >= 1 && count <= 2000) return count;
    }
  }
  return null;
}

function extractCityState(text: string, title: string): { city: string; state: string } {
  const combinedText = `${title} ${text}`;
  const statePattern = /(?:in|near|at|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([A-Z]{2})\b/;
  const match = combinedText.match(statePattern);
  if (match) return { city: match[1], state: match[2] };
  return { city: '', state: '' };
}

function isOutdoorHospitalityResult(title: string, content: string): boolean {
  const text = `${title} ${content}`.toLowerCase();
  const keywords = [
    'campground', 'rv park', 'rv resort', 'glamping', 'campsite',
    'cabin', 'yurt', 'tent', 'treehouse', 'lodge', 'camp',
    'rv site', 'hookup', 'full hookup', 'pull-through',
  ];
  return keywords.some((kw) => text.includes(kw));
}

function buildCompFromResult(result: TavilyResult): ComparableProperty | null {
  const content = result.rawContent || result.content || '';
  if (!isOutdoorHospitalityResult(result.title, content)) return null;

  const propertyName = extractPropertyName(result.title, result.url);
  const { city, state } = extractCityState(content, result.title);
  const rate = extractRateFromText(content);
  const siteCount = extractSiteCount(content);

  const unitTypePatterns: Array<[RegExp, string]> = [
    [/glamping|luxury tent|safari tent|bell tent/i, 'Glamping'],
    [/yurt/i, 'Yurt'],
    [/cabin|cottage/i, 'Cabin'],
    [/treehouse/i, 'Treehouse'],
    [/tiny\s*home|tiny\s*house/i, 'Tiny Home'],
    [/rv\s*site|rv\s*park|full\s*hookup|pull.?through/i, 'RV Site'],
    [/tent\s*site|campsite/i, 'Tent Site'],
  ];
  let unitType: string | null = null;
  for (const [pattern, label] of unitTypePatterns) {
    if (pattern.test(content) || pattern.test(result.title)) {
      unitType = label;
      break;
    }
  }

  const descSnippet = content.length > 300 ? content.slice(0, 300) + '...' : content;

  return {
    property_name: propertyName,
    city,
    state,
    unit_type: unitType,
    property_total_sites: siteCount,
    quantity_of_units: null,
    avg_retail_daily_rate: rate,
    high_rate: null,
    low_rate: null,
    seasonal_rates: { ...EMPTY_SEASONAL },
    operating_season_months: null,
    url: result.url,
    description: descSnippet || null,
    distance_miles: null,
    source_table: 'tavily_web_research',
  };
}

export async function fetchTavilyComps(
  city: string,
  state: string,
  marketType?: string | null,
): Promise<ComparableProperty[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[tavily-comp-research] TAVILY_API_KEY not set, skipping web comp research');
    return [];
  }

  const client = tavily({ apiKey });
  const isGlamping = (marketType ?? '').toLowerCase().includes('glamping');

  const queries = isGlamping
    ? [
        `glamping resorts near ${city} ${state} rates reviews`,
        `luxury camping ${state} cabins yurts treehouses rates`,
      ]
    : [
        `RV parks resorts near ${city} ${state} rates reviews`,
        `campground RV resort ${state} full hookup rates sites`,
      ];

  const allResults: TavilyResult[] = [];

  for (const query of queries) {
    try {
      const response = await client.search(query, {
        searchDepth: 'advanced',
        maxResults: MAX_RESULTS_PER_QUERY,
        includeAnswer: false,
        includeRawContent: 'markdown',
      });

      for (const r of response.results) {
        allResults.push({
          title: r.title || '',
          url: r.url,
          content: r.content || '',
          rawContent: r.rawContent ?? undefined,
          score: r.score ?? 0,
        });
      }
    } catch (err) {
      console.warn(
        `[tavily-comp-research] Query failed: "${query.slice(0, 60)}…" –`,
        err instanceof Error ? err.message : err,
      );
    }
    await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));
  }

  allResults.sort((a, b) => b.score - a.score);

  const comps: ComparableProperty[] = [];
  const seenNames = new Set<string>();

  for (const result of allResults) {
    if (comps.length >= MAX_WEB_COMPS) break;

    const comp = buildCompFromResult(result);
    if (!comp) continue;

    const key = comp.property_name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    comps.push(comp);
  }

  console.log(`[tavily-comp-research] Found ${comps.length} web-sourced comps for ${city}, ${state}`);
  return comps;
}
