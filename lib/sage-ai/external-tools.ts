/**
 * Sage AI — external API tools: Google Places (always registered) and the
 * opt-in Tavily / Firecrawl web-research family. Extracted from tools.ts —
 * behavior-preserving.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { fetchWithTimeout } from '@/lib/sage-ai/fetch-with-timeout';
import { quotaGate } from '@/lib/sage-ai/quota-gate';
import { wrapUntrustedContent } from '@/lib/sage-ai/untrusted-content';

/**
 * Per-call timeout caps for external HTTP integrations (ms). These were
 * picked to comfortably fit inside the route's `maxDuration = 60` budget so a
 * single hung peer can't exhaust the whole turn.
 */
const TIMEOUT_GOOGLE_PLACES = 10_000;
const TIMEOUT_TAVILY = 20_000;
const TIMEOUT_FIRECRAWL_SCRAPE = 25_000;
const TIMEOUT_FIRECRAWL_CRAWL_KICKOFF = 15_000;
const TIMEOUT_FIRECRAWL_CRAWL_POLL = 8_000;

/**
 * Wall-clock ceiling for crawl_website polling. The crawl runs asynchronously
 * on Firecrawl; polling previously ran 30 × 2s = up to 60s, which could eat
 * almost the entire chat turn — starving the model's remaining tool steps and
 * risking the route's function timeout. Cap the poll window well under the
 * turn budget and return whatever pages finished so far. Override with
 * SAGE_AI_CRAWL_MAX_POLL_MS (clamped 4s–45s).
 */
const CRAWL_MAX_POLL_MS = (() => {
  const raw = process.env.SAGE_AI_CRAWL_MAX_POLL_MS;
  const n = raw != null && raw !== '' ? Number(raw.replace(/_/g, '')) : 25_000;
  if (!Number.isFinite(n) || n <= 0) return 25_000;
  return Math.min(Math.max(Math.floor(n), 4_000), 45_000);
})();
const CRAWL_POLL_INTERVAL_MS = 2_000;

/** Per-user daily quotas for external tools (env-overridable). */
const QUOTAS = {
  google_places_search: Number(process.env.SAGE_AI_QUOTA_GOOGLE_PLACES ?? 200),
  google_place_details: Number(process.env.SAGE_AI_QUOTA_GOOGLE_PLACES ?? 200),
  web_search: Number(process.env.SAGE_AI_QUOTA_WEB_SEARCH ?? 100),
  scrape_webpage: Number(process.env.SAGE_AI_QUOTA_SCRAPE ?? 50),
  crawl_website: Number(process.env.SAGE_AI_QUOTA_CRAWL ?? 5),
} as const;

/**
 * Fields the model is allowed to request from Google Place Details. The
 * `fields` parameter on the Places API drives billing tier (Basic / Contact /
 * Atmosphere), so accepting arbitrary strings would let a prompt-injected
 * response opt us into the most expensive tier on every call. Anything outside
 * this list is silently dropped at request time.
 */
const GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS = [
  // Basic data SKU
  'address_component',
  'address_components',
  'adr_address',
  'business_status',
  'formatted_address',
  'geometry',
  'icon',
  'icon_mask_base_uri',
  'icon_background_color',
  'name',
  'permanently_closed',
  'photo',
  'photos',
  'place_id',
  'plus_code',
  'type',
  'types',
  'url',
  'utc_offset',
  'vicinity',
  // Contact data SKU
  'formatted_phone_number',
  'international_phone_number',
  'opening_hours',
  'website',
  // Atmosphere data SKU — kept narrow on purpose
  'price_level',
  'rating',
  'reviews',
  'user_ratings_total',
] as const;

/** Cap per-page scraped content fed back to the model (bytes, UTF-16 approx). */
const SCRAPED_CONTENT_MAX_CHARS = 8_000;

export function createGooglePlacesTools(userId: string | undefined) {
  return {
    google_places_search: tool({
      description:
        'Search for places using Google Places API. Useful for finding businesses, attractions, campgrounds, or any location-based information. Returns place names, addresses, ratings, and place IDs.',
      inputSchema: z.object({
        query: z.string().describe('Search query (e.g., "glamping near Austin TX", "RV parks in Colorado")'),
        location: z
          .object({
            lat: z.number().describe('Latitude'),
            lng: z.number().describe('Longitude'),
          })
          .optional()
          .describe('Optional center point for location-biased search'),
        radius: z
          .number()
          .min(1)
          .max(50000)
          .optional()
          .describe('Search radius in meters (max 50000)'),
        type: z
          .string()
          .optional()
          .describe('Place type filter (e.g., campground, lodging, rv_park, tourist_attraction)'),
      }),
      execute: async ({ query, location, radius, type }, { abortSignal }) => {
        const gate = await quotaGate('google_places_search', userId, QUOTAS.google_places_search);
        if (gate) return gate;
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return { error: 'Google Places API key not configured', data: null };
        }

        try {
          const params = new URLSearchParams({
            query,
            key: apiKey,
          });

          if (location) {
            params.append('location', `${location.lat},${location.lng}`);
          }
          if (radius) {
            params.append('radius', radius.toString());
          }
          if (type) {
            params.append('type', type);
          }

          const response = await fetchWithTimeout(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
            { timeoutMs: TIMEOUT_GOOGLE_PLACES, parentSignal: abortSignal }
          );

          if (!response.ok) {
            return { error: `Google Places API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') {
            return { error: `Google Places API status: ${result.status}`, data: null };
          }

          const places = (result.results || []).slice(0, 20).map((place: {
            name: string;
            formatted_address: string;
            place_id: string;
            rating?: number;
            user_ratings_total?: number;
            types?: string[];
            geometry?: { location: { lat: number; lng: number } };
            opening_hours?: { open_now: boolean };
            price_level?: number;
          }) => ({
            name: place.name,
            address: place.formatted_address,
            place_id: place.place_id,
            rating: place.rating,
            total_ratings: place.user_ratings_total,
            types: place.types,
            location: place.geometry?.location,
            open_now: place.opening_hours?.open_now,
            price_level: place.price_level,
          }));

          return {
            data: places,
            total_count: places.length,
            query,
          };
        } catch (err) {
          return {
            error: `Failed to search places: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    google_place_details: tool({
      description: `Get detailed information about a specific place using its place_id from Google Places API. Returns reviews, contact info, hours, and more.

Allowed fields (anything outside this list is dropped to control billing tier):
${GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS.join(', ')}.`,
      inputSchema: z.object({
        place_id: z.string().min(1).max(256).describe('The Google Place ID to get details for'),
        fields: z
          .array(z.string())
          .optional()
          .describe(
            `Specific fields to return. Each entry must be one of: ${GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS.join(', ')}. Unknown fields are silently dropped. If not specified, returns the common-field default set.`
          ),
      }),
      execute: async ({ place_id, fields }, { abortSignal }) => {
        const gate = await quotaGate('google_place_details', userId, QUOTAS.google_place_details);
        if (gate) return gate;
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return { error: 'Google Places API key not configured', data: null };
        }

        try {
          const defaultFields = [
            'name',
            'formatted_address',
            'formatted_phone_number',
            'website',
            'rating',
            'user_ratings_total',
            'reviews',
            'opening_hours',
            'price_level',
            'types',
            'url',
          ];

          // Filter caller-supplied fields against the allowlist. Google Places
          // bills per-field-mask, so accepting arbitrary strings means a
          // prompt-injection or buggy model could opt us into the more
          // expensive Pro/Enterprise SKU fields (Atmosphere/Contact). Track
          // rejected fields to surface them in the response for debugging.
          let appliedFields = defaultFields;
          let rejectedFields: string[] = [];
          if (fields && fields.length > 0) {
            const allowed: string[] = [];
            const rejected: string[] = [];
            const seen = new Set<string>();
            for (const f of fields) {
              const key = String(f ?? '').trim();
              if (!key || seen.has(key)) continue;
              seen.add(key);
              if ((GOOGLE_PLACE_DETAILS_ALLOWED_FIELDS as readonly string[]).includes(key)) {
                allowed.push(key);
              } else {
                rejected.push(key);
              }
            }
            appliedFields = allowed.length > 0 ? allowed : defaultFields;
            rejectedFields = rejected;
          }

          const params = new URLSearchParams({
            place_id,
            key: apiKey,
            fields: appliedFields.join(','),
          });

          const response = await fetchWithTimeout(
            `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
            { timeoutMs: TIMEOUT_GOOGLE_PLACES, parentSignal: abortSignal }
          );

          if (!response.ok) {
            return { error: `Google Places API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          if (result.status !== 'OK') {
            return { error: `Google Places API status: ${result.status}`, data: null };
          }

          return {
            data: result.result,
            place_id,
            ...(rejectedFields.length ? { rejected_fields: rejectedFields } : {}),
          };
        } catch (err) {
          return {
            error: `Failed to get place details: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),
  };
}

export function createWebResearchTools(userId: string | undefined) {
  return {
    web_search: tool({
      description:
        'Search the web using Tavily API. Useful for finding current information about glamping trends, competitor research, industry news, or any general web search. Returns relevant snippets and URLs.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        search_depth: z
          .enum(['basic', 'advanced'])
          .optional()
          .default('basic')
          .describe('Search depth - basic is faster, advanced is more thorough'),
        include_domains: z
          .array(z.string())
          .optional()
          .describe('Limit search to specific domains (e.g., ["hipcamp.com", "glamping.com"])'),
        exclude_domains: z
          .array(z.string())
          .optional()
          .describe('Exclude specific domains from results'),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe('Maximum number of results to return'),
      }),
      execute: async (
        { query, search_depth, include_domains, exclude_domains, max_results },
        { abortSignal }
      ) => {
        const gate = await quotaGate('web_search', userId, QUOTAS.web_search);
        if (gate) return gate;
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
          return { error: 'Tavily API key not configured', data: null };
        }

        try {
          const response = await fetchWithTimeout('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            timeoutMs: TIMEOUT_TAVILY,
            parentSignal: abortSignal,
            body: JSON.stringify({
              api_key: apiKey,
              query,
              search_depth: search_depth || 'basic',
              include_domains: include_domains || [],
              exclude_domains: exclude_domains || [],
              max_results: max_results || 5,
              include_answer: true,
            }),
          });

          if (!response.ok) {
            return { error: `Tavily API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          return {
            answer: result.answer,
            results: result.results?.map((r: { title: string; url: string; content: string; score: number }) => ({
              title: r.title,
              url: r.url,
              content: r.content,
              relevance_score: r.score,
            })),
            query,
          };
        } catch (err) {
          return {
            error: `Failed to search web: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    scrape_webpage: tool({
      description:
        'Scrape content from a webpage using Firecrawl. Useful for extracting detailed information from competitor websites, property listings, or any webpage. Returns clean markdown content.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL of the webpage to scrape'),
        formats: z
          .array(z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot']))
          .optional()
          .default(['markdown'])
          .describe('Output formats to return'),
        only_main_content: z
          .boolean()
          .optional()
          .default(true)
          .describe('Extract only main content, excluding headers/footers/navs'),
        wait_for: z
          .number()
          .min(0)
          .max(30000)
          .optional()
          .describe('Milliseconds to wait for dynamic content to load'),
      }),
      execute: async (
        { url, formats, only_main_content, wait_for },
        { abortSignal }
      ) => {
        const gate = await quotaGate('scrape_webpage', userId, QUOTAS.scrape_webpage);
        if (gate) return gate;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          const response = await fetchWithTimeout('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeoutMs: TIMEOUT_FIRECRAWL_SCRAPE,
            parentSignal: abortSignal,
            body: JSON.stringify({
              url,
              formats: formats || ['markdown'],
              onlyMainContent: only_main_content !== false,
              waitFor: wait_for,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { error: `Firecrawl API error: ${response.status} - ${errorText}`, data: null };
          }

          const result = await response.json();

          if (!result.success) {
            return { error: result.error || 'Scraping failed', data: null };
          }

          const rawMarkdown: string = result.data?.markdown ?? '';
          const content = rawMarkdown
            ? wrapUntrustedContent(url, rawMarkdown, SCRAPED_CONTENT_MAX_CHARS)
            : '';

          return {
            url,
            content,
            metadata: result.data?.metadata,
            links: result.data?.links,
            original_length: rawMarkdown.length,
            truncated: rawMarkdown.length > SCRAPED_CONTENT_MAX_CHARS,
          };
        } catch (err) {
          return {
            error: `Failed to scrape webpage: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    crawl_website: tool({
      description:
        'Crawl multiple pages from a website using Firecrawl. Useful for comprehensive research on a competitor or property website. Returns content from multiple pages.',
      inputSchema: z.object({
        url: z.string().url().describe('The starting URL to crawl from'),
        max_pages: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe('Maximum number of pages to crawl (max 20)'),
        include_paths: z
          .array(z.string())
          .optional()
          .describe('Only crawl pages matching these path patterns (e.g., ["/blog/*", "/properties/*"])'),
        exclude_paths: z
          .array(z.string())
          .optional()
          .describe('Exclude pages matching these path patterns'),
      }),
      execute: async (
        { url, max_pages, include_paths, exclude_paths },
        { abortSignal }
      ) => {
        const gate = await quotaGate('crawl_website', userId, QUOTAS.crawl_website);
        if (gate) return gate;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          const startResponse = await fetchWithTimeout('https://api.firecrawl.dev/v1/crawl', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeoutMs: TIMEOUT_FIRECRAWL_CRAWL_KICKOFF,
            parentSignal: abortSignal,
            body: JSON.stringify({
              url,
              limit: max_pages || 5,
              includePaths: include_paths,
              excludePaths: exclude_paths,
              scrapeOptions: {
                formats: ['markdown'],
                onlyMainContent: true,
              },
            }),
          });

          if (!startResponse.ok) {
            return { error: `Firecrawl API error: ${startResponse.status}`, data: null };
          }

          const startResult = await startResponse.json();

          if (!startResult.success || !startResult.id) {
            return { error: 'Failed to start crawl job', data: null };
          }

          // Poll for results, bounded by a wall-clock deadline so the crawl
          // can never outlive its share of the chat turn.
          const crawlId = startResult.id;
          const deadline = Date.now() + CRAWL_MAX_POLL_MS;

          const mapPages = (data: unknown) =>
            Array.isArray(data)
              ? data.map(
                  (page: {
                    metadata?: { url?: string; title?: string };
                    markdown?: string;
                  }) => {
                    const pageUrl = page.metadata?.url ?? url;
                    const md = page.markdown ?? '';
                    return {
                      url: pageUrl,
                      title: page.metadata?.title,
                      content: md ? wrapUntrustedContent(pageUrl, md, SCRAPED_CONTENT_MAX_CHARS) : '',
                      original_length: md.length,
                      truncated: md.length > SCRAPED_CONTENT_MAX_CHARS,
                    };
                  }
                )
              : [];

          let lastData: unknown = null;
          while (Date.now() < deadline) {
            // Bail early if the parent stream was cancelled — keeps polling
            // from outliving the chat turn it was started for.
            if (abortSignal?.aborted) {
              return { error: 'Crawl cancelled by client', data: null };
            }
            // Never sleep past the deadline.
            const remaining = deadline - Date.now();
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(CRAWL_POLL_INTERVAL_MS, Math.max(remaining, 0)))
            );

            const statusResponse = await fetchWithTimeout(
              `https://api.firecrawl.dev/v1/crawl/${crawlId}`,
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
                timeoutMs: TIMEOUT_FIRECRAWL_CRAWL_POLL,
                parentSignal: abortSignal,
              }
            );

            if (!statusResponse.ok) {
              return { error: `Failed to check crawl status: ${statusResponse.status}`, data: null };
            }

            const statusResult = await statusResponse.json();
            if (statusResult.data != null) lastData = statusResult.data;

            if (statusResult.status === 'completed') {
              const pages = mapPages(statusResult.data);
              return { url, pages_crawled: pages.length, pages };
            }

            if (statusResult.status === 'failed') {
              return { error: 'Crawl job failed', data: null };
            }
          }

          // Deadline elapsed while the crawl was still running. Return whatever
          // pages completed so far (Firecrawl streams partial `data`) rather
          // than a bare timeout, so the model can still use the content and the
          // turn stays within budget.
          const partialPages = mapPages(lastData);
          return {
            url,
            timed_out: true,
            partial: partialPages.length > 0,
            note:
              partialPages.length > 0
                ? 'Crawl still running on Firecrawl; returning the pages that completed before the poll budget elapsed.'
                : 'Crawl still running on Firecrawl and no pages completed within the poll budget. Try a smaller max_pages or narrower include_paths.',
            pages_crawled: partialPages.length,
            pages: partialPages,
          };
        } catch (err) {
          return {
            error: `Failed to crawl website: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),
  };
}
