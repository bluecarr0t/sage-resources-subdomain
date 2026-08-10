/**
 * Tavily web research specifically for comparable properties.
 * Searches for nearby outdoor hospitality properties (glamping/RV)
 * and extracts structured comp data from web results — including seasonal
 * rate grids and subject-relative distance when geocoding succeeds.
 */

import { tavily } from '@tavily/core';
import type { ComparableProperty, SeasonalRates } from './types';
import { geocodePlaceLine } from '@/lib/geocode';
import { haversineDistanceMiles } from '@/lib/comps-v2/geo';
import { compNeedsGapFill } from './comparables-section';

const MAX_RESULTS_PER_QUERY = 5;
const TAVILY_DELAY_MS = 500;
const MAX_WEB_COMPS = 8;
const MAX_GEOCODE = 6;

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

export interface FetchTavilyCompsOptions {
  subjectLat?: number | null;
  subjectLng?: number | null;
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

/** Parse midweek/weekend × season rate grids from booking-page prose. */
export function extractSeasonalRates(text: string): SeasonalRates {
  const seasonal: SeasonalRates = { ...EMPTY_SEASONAL };
  const seasonKeys: Array<{
    season: 'winter' | 'spring' | 'summer' | 'fall';
    weekday: keyof SeasonalRates;
    weekend: keyof SeasonalRates;
  }> = [
    { season: 'winter', weekday: 'winter_weekday', weekend: 'winter_weekend' },
    { season: 'spring', weekday: 'spring_weekday', weekend: 'spring_weekend' },
    { season: 'summer', weekday: 'summer_weekday', weekend: 'summer_weekend' },
    { season: 'fall', weekday: 'fall_weekday', weekend: 'fall_weekend' },
  ];

  for (const { season, weekday, weekend } of seasonKeys) {
    const seasonBlock = new RegExp(
      `${season}[^\\n]{0,120}?\\$(\\d{2,4})(?:\\.\\d{2})?(?:[^\\n]{0,80}?\\$(\\d{2,4})(?:\\.\\d{2})?)?`,
      'i'
    );
    const m = text.match(seasonBlock);
    if (m) {
      const a = parseFloat(m[1]);
      const b = m[2] != null ? parseFloat(m[2]) : null;
      if (a >= 20 && a <= 2000) {
        if (b != null && b >= 20 && b <= 2000) {
          seasonal[weekday] = Math.min(a, b);
          seasonal[weekend] = Math.max(a, b);
        } else {
          seasonal[weekday] = a;
          seasonal[weekend] = a;
        }
      }
    }

    const midweek = text.match(
      new RegExp(`${season}[^\\n]{0,80}?(?:mid[- ]?week|weekday)[^\\n]{0,40}?\\$(\\d{2,4})`, 'i')
    );
    const weekendMatch = text.match(
      new RegExp(`${season}[^\\n]{0,80}?(?:week[- ]?end)[^\\n]{0,40}?\\$(\\d{2,4})`, 'i')
    );
    if (midweek) {
      const n = parseFloat(midweek[1]);
      if (n >= 20 && n <= 2000) seasonal[weekday] = n;
    }
    if (weekendMatch) {
      const n = parseFloat(weekendMatch[1]);
      if (n >= 20 && n <= 2000) seasonal[weekend] = n;
    }
  }

  // Holiday / peak bump → summer weekend when missing
  const holiday = text.match(/holiday[^\n]{0,40}?\$(\d{2,4})/i);
  if (holiday && seasonal.summer_weekend == null) {
    const n = parseFloat(holiday[1]);
    if (n >= 20 && n <= 2000) seasonal.summer_weekend = n;
  }

  return seasonal;
}

function hasAnySeasonal(s: SeasonalRates): boolean {
  return Object.values(s).some((v) => v != null && v > 0);
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
  const seasonal = extractSeasonalRates(content);
  const lowFromSeasonal = [
    seasonal.winter_weekday,
    seasonal.spring_weekday,
    seasonal.fall_weekday,
    seasonal.summer_weekday,
  ].filter((n): n is number => n != null && n > 0);
  const highFromSeasonal = [
    seasonal.summer_weekend,
    seasonal.spring_weekend,
    seasonal.fall_weekend,
    seasonal.winter_weekend,
  ].filter((n): n is number => n != null && n > 0);

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
    high_rate: highFromSeasonal.length ? Math.max(...highFromSeasonal) : null,
    low_rate: lowFromSeasonal.length ? Math.min(...lowFromSeasonal) : null,
    seasonal_rates: hasAnySeasonal(seasonal) ? seasonal : { ...EMPTY_SEASONAL },
    operating_season_months: null,
    url: result.url,
    description: descSnippet || null,
    distance_miles: null,
    source_table: 'tavily_web_research',
  };
}

/** Geocode web comps and set distance_miles from subject when possible. */
export async function attachSubjectDistanceToWebComps(
  comps: ComparableProperty[],
  subjectLat?: number | null,
  subjectLng?: number | null
): Promise<void> {
  let budget = MAX_GEOCODE;
  for (const comp of comps) {
    if (budget <= 0) break;
    if (comp.geo_lat != null && comp.geo_lng != null) {
      if (
        subjectLat != null &&
        subjectLng != null &&
        Number.isFinite(subjectLat) &&
        Number.isFinite(subjectLng)
      ) {
        comp.distance_miles =
          Math.round(
            haversineDistanceMiles(subjectLat, subjectLng, comp.geo_lat, comp.geo_lng) * 10
          ) / 10;
      }
      continue;
    }
    const line = [comp.property_name, comp.city, comp.state].filter(Boolean).join(', ');
    if (!line || line.length < 5) continue;
    try {
      const geo = await geocodePlaceLine(line);
      budget -= 1;
      if (!geo) continue;
      comp.geo_lat = geo.lat;
      comp.geo_lng = geo.lng;
      if (
        subjectLat != null &&
        subjectLng != null &&
        Number.isFinite(subjectLat) &&
        Number.isFinite(subjectLng)
      ) {
        comp.distance_miles =
          Math.round(haversineDistanceMiles(subjectLat, subjectLng, geo.lat, geo.lng) * 10) / 10;
      }
    } catch {
      /* soft-fail per comp */
    }
  }
}

export async function fetchTavilyComps(
  city: string,
  state: string,
  marketType?: string | null,
  options?: FetchTavilyCompsOptions,
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
        `luxury camping ${state} cabins yurts treehouses weekday weekend rates`,
        `glamping ${city} ${state} seasonal rates midweek weekend holiday`,
      ]
    : [
        `RV parks resorts near ${city} ${state} rates reviews`,
        `campground RV resort ${state} full hookup rates sites`,
        `RV park ${city} ${state} weekday weekend peak season rates`,
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

  if (options?.subjectLat != null && options?.subjectLng != null) {
    await attachSubjectDistanceToWebComps(comps, options.subjectLat, options.subjectLng);
  }

  console.log(`[tavily-comp-research] Found ${comps.length} web-sourced comps for ${city}, ${state}`);
  return comps;
}

const MAX_GAP_FILL = 6;

function extractAmenitiesSnippet(text: string): string | null {
  const amenityMatch = text.match(
    /(?:amenities?|features?|includes?)[:\s]+([^.!\n]{12,160})/i
  );
  if (amenityMatch?.[1]) return amenityMatch[1].replace(/\s+/g, ' ').trim();
  return null;
}

/**
 * When Supabase RV/glamping rows lack rates or amenities, look up each thin
 * property on the web (Tavily) and merge fields in place. Mutates `comps`.
 */
export async function gapFillComparableDetails(
  comps: ComparableProperty[],
  options?: { maxLookups?: number; marketType?: string | null }
): Promise<number> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey || comps.length === 0) return 0;

  const budget = Math.min(options?.maxLookups ?? MAX_GAP_FILL, MAX_GAP_FILL);
  const isGlamping = (options?.marketType ?? '').toLowerCase().includes('glamping');
  const client = tavily({ apiKey });
  let filled = 0;

  for (const comp of comps) {
    if (filled >= budget) break;
    if (!compNeedsGapFill(comp)) continue;

    const place = [comp.property_name, comp.city, comp.state].filter(Boolean).join(' ');
    if (place.length < 5) continue;
    const query = isGlamping
      ? `${place} glamping rates amenities nightly`
      : `${place} RV park campground rates amenities nightly`;

    try {
      const response = await client.search(query, {
        searchDepth: 'basic',
        maxResults: 3,
        includeAnswer: false,
        includeRawContent: 'markdown',
      });
      const blob = (response.results ?? [])
        .map((r) => `${r.title || ''}\n${r.content || ''}\n${r.rawContent || ''}`)
        .join('\n');
      if (!blob.trim()) continue;

      let changed = false;
      if (!(comp.avg_retail_daily_rate != null && comp.avg_retail_daily_rate > 0)) {
        const rate = extractRateFromText(blob);
        if (rate != null) {
          comp.avg_retail_daily_rate = rate;
          changed = true;
        }
      }
      const seasonal = extractSeasonalRates(blob);
      const seasonalVals = [
        seasonal.winter_weekday,
        seasonal.winter_weekend,
        seasonal.spring_weekday,
        seasonal.spring_weekend,
        seasonal.summer_weekday,
        seasonal.summer_weekend,
        seasonal.fall_weekday,
        seasonal.fall_weekend,
      ].filter((n): n is number => n != null && n > 0);
      if (seasonalVals.length > 0) {
        comp.seasonal_rates = seasonal;
        if (comp.low_rate == null) comp.low_rate = Math.min(...seasonalVals);
        if (comp.high_rate == null) comp.high_rate = Math.max(...seasonalVals);
        changed = true;
      }
      if (!(comp.amenities?.trim())) {
        const am = extractAmenitiesSnippet(blob);
        if (am) {
          comp.amenities = am;
          changed = true;
        }
      }
      if (!(comp.description && comp.description.length > 40)) {
        const snippet = blob.replace(/\s+/g, ' ').trim().slice(0, 280);
        if (snippet.length > 40) {
          comp.description = snippet;
          changed = true;
        }
      }
      if (!comp.url && response.results?.[0]?.url) {
        comp.url = response.results[0].url;
        changed = true;
      }
      if (changed) {
        comp.web_research_supplement = true;
        if (
          !comp.source_table ||
          comp.source_table === 'all_sage_data' ||
          comp.source_table === 'hipcamp' ||
          comp.source_table === 'campspot' ||
          comp.source_table === 'all_roverpass_data_new' ||
          comp.source_table === 'past_reports'
        ) {
          // Keep original source_table; flag supplement only.
        }
        filled += 1;
      }
    } catch (err) {
      console.warn(
        `[tavily-comp-research] Gap-fill failed for "${comp.property_name}":`,
        err instanceof Error ? err.message : err
      );
    }
    await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));
  }

  if (filled > 0) {
    console.log(`[tavily-comp-research] Gap-filled rates/amenities on ${filled} comparable(s)`);
  }
  return filled;
}
