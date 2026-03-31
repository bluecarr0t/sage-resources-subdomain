/**
 * Deep enrichment for 3–5 selected comps: official site scrape, Google Places (GBP facts),
 * multi-query Tavily web research, then LLM structured JSON via Vercel AI Gateway by default.
 *
 * **Auth:** Prefer `AI_GATEWAY_API_KEY` (OpenAI-compatible client → `https://ai-gateway.vercel.sh/v1`).
 * If unset, falls back to `OPENAI_API_KEY` against the OpenAI API (model id must be OpenAI-native, e.g. `gpt-4o`).
 *
 * **Models (task-based, see `comps-v2-llm-config.ts`):**
 * - Extraction: `COMPS_V2_DEEP_ENRICH_MODEL` → … → default `anthropic/claude-sonnet-4.6` on the gateway.
 * - Optional condense (large context): set `COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL` (e.g. `anthropic/claude-haiku-4.5`)
 *   + optional `COMPS_V2_DEEP_ENRICH_CONDENSE_MIN_CHARS` (default 45000).
 *
 * **Reliability:** Chat completions retry on 429 and 5xx (`COMPS_V2_LLM_MAX_RETRIES`, default 2).
 * **Gateway-only:** `COMPS_V2_GATEWAY_MODEL_FALLBACKS`, `COMPS_V2_GATEWAY_PROMPT_CACHING=auto` — see `vercel-gateway-chat-extras.ts`.
 */

import pLimit from 'p-limit';
import OpenAI from 'openai';
import { tavily } from '@tavily/core';
import { scrapeUrlMarkdown } from '@/lib/comps-v2/scrape-url';
import { fetchGoogleBusinessProfileContext } from '@/lib/comps-v2/google-place-deep-enrich';
import {
  resolveCompsV2LlmClientForTask,
  shouldUseDeepEnrichCondense,
  type CompsV2LlmClientConfig,
} from '@/lib/comps-v2/comps-v2-llm-config';
import { logCompsV2DeepEnrichGatewayUsage } from '@/lib/comps-v2/log-comps-v2-ai-usage';
import { createChatCompletionWithRetry } from '@/lib/comps-v2/openai-chat-completion-with-retry';
import type { CompsV2EnrichCorrelationSource } from '@/lib/comps-v2/resolve-enrich-correlation-id';
import { buildVercelGatewayChatExtras } from '@/lib/comps-v2/vercel-gateway-chat-extras';

export interface DeepEnrichUsageLogContext {
  userId: string;
  userEmail: string | null;
  correlationId?: string;
  correlationSource?: CompsV2EnrichCorrelationSource;
}

export interface DeepEnrichInput {
  property_name: string;
  city?: string;
  state?: string;
  url?: string | null;
}

export interface DeepEnrichUnitRate {
  /** Accommodation label, e.g. "Treehouse", "Geodesic dome". */
  unit_type: string;
  /** Verbatim or closely paraphrased rate language from context (include currency and period if stated). */
  rate_note: string;
}

export interface DeepEnrichResult {
  property_name: string;
  city?: string;
  state?: string;
  url?: string | null;
  structured: {
    summary: string;
    amenities: string[];
    rates_notes: string;
    /** Specific unit/suite/room types with associated rate language when the context supports it. */
    unit_type_rates: DeepEnrichUnitRate[];
    review_highlights: string;
    google_business_notes: string;
    sources_cited: string[];
  };
  error?: string;
}

const CONDENSE_SYSTEM = `You compress hospitality property research context for a downstream extraction step.
Rules:
- Preserve every explicit price, currency, nightly/weekend phrasing, and unit-type names (treehouse, dome, safari tent, RV site, etc.).
- Preserve URLs and page titles that support facts.
- If a "Google Business Profile" or Google Places block appears, keep its facts (rating, review count, address, phone, hours, Maps URL) in condensed form.
- Do not invent facts; omit uncertain claims.
- Output plain Markdown sections: Summary bullets, Rates, Amenities cues, GBP/Maps, Sources (URLs).`;

const DEEP_SCHEMA_HINT = `Return a single JSON object with keys:
summary (string, 2-4 sentences),
amenities (array of short strings),
rates_notes (string: any general pricing overview; use empty string if nothing reliable),
unit_type_rates (array of objects, each with "unit_type" and "rate_note" strings).
  For unit_type_rates: ONLY include rows when the context names a specific accommodation product (e.g. treehouse, dome, safari tent, Airstream, cabin, site type) AND gives a concrete price or tight range (e.g. "$212/night", "from $349", "winter from $200"). No guessing — omit entries if unsure.
review_highlights (string, paraphrased guest themes),
google_business_notes (string): If a block titled "Google Business Profile (Google Places API" appears in the context, summarize rating, review count, address, phone, Maps URL, hours, and price level from that block. Otherwise summarize any Google Maps / Knowledge Panel facts visible in the web snippets (stars, review counts, address). Use empty string only if the context truly has no GBP or Maps-related facts.
sources_cited (array of URLs or page titles you relied on).`;

const SYSTEM_PROMPT = `You extract factual hospitality property details for investment-grade comps research.
Rules:
- Prefer the Google Places API block when present for google_business_notes (ratings, counts, address, phone, Maps link, hours).
- For rates and unit_type_rates, only state what is explicitly supported by the provided context (booking widgets, official rate tables, OTA snippets, Google nightly price text). Never invent prices.
- If multiple unit types have rates, list each separately in unit_type_rates and keep rates_notes as a short overview or empty.
- JSON only, no markdown outside the JSON.`;

const TAVILY_PER_RESULT_CHARS = 3400;
const TAVILY_SECTION_CAP = 42000;

function providerFromLlmConfig(cfg: CompsV2LlmClientConfig): 'vercel_ai_gateway' | 'openai' {
  return cfg.baseURL ? 'vercel_ai_gateway' : 'openai';
}

async function tavilyDeepContext(name: string, city: string, state: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return '';
  const client = tavily({ apiKey });
  const loc = [city, state].filter(Boolean).join(' ').trim();
  const queries = [
    `"${name}" ${loc} Google Maps reviews phone address`,
    `"${name}" ${loc} Google travel hotels nightly price fees`,
    `"${name}" ${loc} nightly price fees booking.com expedia hotels.com USD`,
    `"${name}" ${loc} glamping rates treehouse dome safari tent cabin RV site price per night`,
  ];

  const settled = await Promise.all(
    queries.map((q) =>
      client
        .search(q, {
          searchDepth: 'advanced',
          maxResults: 10,
          includeAnswer: true,
          includeRawContent: 'markdown',
        })
        .catch(() => null)
    )
  );

  const parts: string[] = [];
  let budget = TAVILY_SECTION_CAP;

  settled.forEach((res, idx) => {
    if (!res) return;
    const header = `--- Tavily query ${idx + 1} (${queries[idx].slice(0, 120)}${queries[idx].length > 120 ? '…' : ''}) ---`;
    const chunk: string[] = [header];
    if (res.answer) chunk.push(`Answer: ${res.answer}`);
    for (const r of res.results ?? []) {
      const body = (r.rawContent ?? r.content ?? '').slice(0, TAVILY_PER_RESULT_CHARS);
      chunk.push(`### ${r.title}\n${r.url}\n${body}`);
    }
    const block = chunk.join('\n');
    if (block.length <= budget) {
      parts.push(block);
      budget -= block.length;
    } else if (budget > 500) {
      parts.push(block.slice(0, budget));
      budget = 0;
    }
  });

  return parts.join('\n\n');
}

function emptyStructured(): DeepEnrichResult['structured'] {
  return {
    summary: '',
    amenities: [],
    rates_notes: '',
    unit_type_rates: [],
    review_highlights: '',
    google_business_notes: '',
    sources_cited: [],
  };
}

function parseUnitTypeRates(raw: unknown): DeepEnrichUnitRate[] {
  if (!Array.isArray(raw)) return [];
  const out: DeepEnrichUnitRate[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const unit_type = typeof o.unit_type === 'string' ? o.unit_type.trim() : '';
    const rate_note = typeof o.rate_note === 'string' ? o.rate_note.trim() : '';
    if (unit_type && rate_note) out.push({ unit_type, rate_note });
  }
  return out;
}

async function condenseBundleForDeepEnrich(
  openai: OpenAI,
  model: string,
  item: DeepEnrichInput,
  city: string,
  state: string,
  bundle: string,
  useGatewayExtensions: boolean,
  log?: { usageLog: DeepEnrichUsageLogContext; provider: 'vercel_ai_gateway' | 'openai' }
): Promise<string> {
  const user =
    `Property: ${item.property_name}\nLocation: ${city}, ${state}\nURL: ${item.url ?? 'unknown'}\n\n` +
    `Full context to compress (may be long):\n${bundle}`;
  const gatewayExtras = useGatewayExtensions ? buildVercelGatewayChatExtras() : {};
  const t0 = Date.now();
  const completion = await createChatCompletionWithRetry(openai, {
    model,
    temperature: 0.1,
    messages: [
      { role: 'system', content: CONDENSE_SYSTEM },
      { role: 'user', content: user },
    ],
    ...gatewayExtras,
  });
  if (log) {
    const resolvedModel = completion.model ?? model;
    await logCompsV2DeepEnrichGatewayUsage({
      userId: log.usageLog.userId,
      userEmail: log.usageLog.userEmail,
      task: 'condense',
      model: resolvedModel,
      requestedModel: model,
      provider: log.provider,
      usage: completion.usage,
      latencyMs: Date.now() - t0,
      propertyName: item.property_name,
      correlationId: log.usageLog.correlationId,
      correlationSource: log.usageLog.correlationSource,
    });
  }
  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  return text.slice(0, 95_000) || bundle;
}

export async function enrichCompDeep(
  item: DeepEnrichInput,
  usageLog?: DeepEnrichUsageLogContext
): Promise<DeepEnrichResult> {
  const city = item.city ?? '';
  const state = item.state ?? '';
  const extractLlm = resolveCompsV2LlmClientForTask('deep_enrich_extraction');
  if (!extractLlm) {
    return {
      property_name: item.property_name,
      city,
      state,
      url: item.url ?? null,
      structured: { ...emptyStructured() },
      error: 'AI_GATEWAY_API_KEY not configured (or set OPENAI_API_KEY for legacy direct OpenAI)',
    };
  }

  const [scrapeResult, gbpContext, webResearch] = await Promise.all([
    item.url
      ? scrapeUrlMarkdown(item.url)
      : Promise.resolve({ ok: false as const, reason: 'invalid_url' as const }),
    fetchGoogleBusinessProfileContext(item.property_name, city, state),
    tavilyDeepContext(item.property_name, city, state),
  ]);

  const websiteParts: string[] = [];
  if (scrapeResult.ok) {
    websiteParts.push(scrapeResult.markdown.slice(0, 16000));
  }

  const bundleParts: string[] = [];
  if (websiteParts.length) {
    bundleParts.push(`Official site content:\n${websiteParts.join('\n')}`);
  }
  if (gbpContext) {
    bundleParts.push(gbpContext);
  }
  if (webResearch) {
    bundleParts.push(`Web research (multi-query):\n${webResearch}`);
  }

  const bundle = bundleParts.join('\n\n').slice(0, 100000);

  const openai = new OpenAI({
    apiKey: extractLlm.apiKey,
    ...(extractLlm.baseURL ? { baseURL: extractLlm.baseURL } : {}),
  });

  const useGatewayExtensions = Boolean(extractLlm.baseURL);
  let contextForExtraction = bundle;
  const provider = providerFromLlmConfig(extractLlm);
  const condenseCfg = resolveCompsV2LlmClientForTask('deep_enrich_condense');
  if (condenseCfg && shouldUseDeepEnrichCondense(bundle.length)) {
    try {
      contextForExtraction = await condenseBundleForDeepEnrich(
        openai,
        condenseCfg.model,
        item,
        city,
        state,
        bundle,
        useGatewayExtensions,
        usageLog ? { usageLog, provider } : undefined
      );
    } catch {
      contextForExtraction = bundle;
    }
  }

  const userContent =
    `Property: ${item.property_name}\nLocation: ${city}, ${state}\nURL: ${item.url ?? 'unknown'}\n\n` +
    `Context (may be partial):\n${contextForExtraction || '(no context retrieved)'}\n\n${DEEP_SCHEMA_HINT}`;

  const gatewayExtras = useGatewayExtensions ? buildVercelGatewayChatExtras() : {};

  try {
    const tExtract = Date.now();
    const completion = await createChatCompletionWithRetry(openai, {
      model: extractLlm.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      ...gatewayExtras,
    });
    if (usageLog) {
      const resolvedModel = completion.model ?? extractLlm.model;
      await logCompsV2DeepEnrichGatewayUsage({
        userId: usageLog.userId,
        userEmail: usageLog.userEmail,
        task: 'extraction',
        model: resolvedModel,
        requestedModel: extractLlm.model,
        provider,
        usage: completion.usage,
        latencyMs: Date.now() - tExtract,
        propertyName: item.property_name,
        correlationId: usageLog.correlationId,
        correlationSource: usageLog.correlationSource,
      });
    }
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const structured = {
      summary: String(parsed.summary ?? ''),
      amenities: Array.isArray(parsed.amenities)
        ? (parsed.amenities as unknown[]).map((x) => String(x))
        : [],
      rates_notes: String(parsed.rates_notes ?? ''),
      unit_type_rates: parseUnitTypeRates(parsed.unit_type_rates),
      review_highlights: String(parsed.review_highlights ?? ''),
      google_business_notes: String(parsed.google_business_notes ?? ''),
      sources_cited: Array.isArray(parsed.sources_cited)
        ? (parsed.sources_cited as unknown[]).map((x) => String(x))
        : [],
    };
    return {
      property_name: item.property_name,
      city,
      state,
      url: item.url ?? null,
      structured,
    };
  } catch (e) {
    return {
      property_name: item.property_name,
      city,
      state,
      url: item.url ?? null,
      structured: { ...emptyStructured() },
      error: e instanceof Error ? e.message : 'enrichment failed',
    };
  }
}

/**
 * Run deep enrichment with limited parallelism so each property gets full Tavily + Places + model work
 * without overwhelming APIs (accuracy over raw throughput).
 */
export async function enrichCompSelectionDeep(
  items: DeepEnrichInput[],
  usageLog?: DeepEnrichUsageLogContext
): Promise<DeepEnrichResult[]> {
  const limit = pLimit(2);
  return Promise.all(items.map((item) => limit(() => enrichCompDeep(item, usageLog))));
}
