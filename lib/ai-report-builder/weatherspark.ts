/**
 * Fetch weather/climate data from WeatherSpark via Tavily search + extract.
 * Used to enrich the Demand Indicators section with temperature, precipitation,
 * comfort scores, and tourism season data.
 *
 * Pipeline:
 *  1. Tavily search to resolve the WeatherSpark URL for the target city
 *  2. Tavily extract to pull structured climate prose + any image URLs
 */

import { tavily } from '@tavily/core';

export interface WeatherSparkData {
  /** Resolved weatherspark.com URL for this city */
  url: string;
  /** Extracted climate prose (temperature, precip, comfort, tourism score) */
  climate_text: string;
  /** Image URLs extracted from the page (may be empty for Canvas-rendered charts) */
  image_urls: string[];
  /** City used in the lookup */
  city: string;
  /** State used in the lookup */
  state: string;
}

const TAVILY_DELAY_MS = 600;

export async function fetchWeatherSparkData(
  city: string,
  state: string,
): Promise<WeatherSparkData | null> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[weatherspark] TAVILY_API_KEY not set, skipping WeatherSpark lookup');
    return null;
  }

  const client = tavily({ apiKey });

  // Step 1: Resolve the WeatherSpark URL via Tavily search
  let weatherSparkUrl: string | null = null;
  try {
    const searchResponse = await client.search(
      `site:weatherspark.com average weather ${city} ${state} year round`,
      { maxResults: 3, searchDepth: 'basic' },
    );

    for (const r of searchResponse.results) {
      if (r.url?.includes('weatherspark.com/y/')) {
        weatherSparkUrl = r.url;
        break;
      }
    }

    if (!weatherSparkUrl) {
      for (const r of searchResponse.results) {
        if (r.url?.includes('weatherspark.com')) {
          weatherSparkUrl = r.url;
          break;
        }
      }
    }
  } catch (err) {
    console.warn(
      '[weatherspark] Tavily search failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  if (!weatherSparkUrl) {
    console.warn(`[weatherspark] No WeatherSpark URL found for ${city}, ${state}`);
    return null;
  }

  await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));

  // Step 2: Extract climate content + images from the WeatherSpark page
  try {
    const extractResponse = await client.extract([weatherSparkUrl], {
      includeImages: true,
      extractDepth: 'advanced',
    });

    const successResults = extractResponse.results ?? [];
    if (successResults.length === 0) {
      console.warn(`[weatherspark] Tavily extract returned no results for ${weatherSparkUrl}`);
      return null;
    }

    const extracted = successResults[0];
    const rawText = (extracted.rawContent || '').trim();

    if (!rawText) {
      console.warn(`[weatherspark] Empty content from ${weatherSparkUrl}`);
      return null;
    }

    const imageUrls: string[] = [];
    if (Array.isArray(extracted.images)) {
      for (const img of extracted.images) {
        if (typeof img === 'string' && img.startsWith('http')) {
          imageUrls.push(img);
        }
      }
    }

    // Truncate to a reasonable size for the AI prompt
    const climateText = rawText.length > 6000 ? rawText.slice(0, 6000) : rawText;

    console.log(
      `[weatherspark] Extracted ${climateText.length} chars + ${imageUrls.length} images for ${city}, ${state}`,
    );

    return {
      url: weatherSparkUrl,
      climate_text: climateText,
      image_urls: imageUrls,
      city,
      state,
    };
  } catch (err) {
    console.warn(
      '[weatherspark] Tavily extract failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
