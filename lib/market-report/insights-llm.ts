/**
 * Generate a short 4–5 bullet narrative for the Market Summary card via the
 * Vercel AI Gateway. The bullets are designed for the client-facing deck —
 * they should be specific, numeric, and stripped of marketing fluff.
 *
 * Auth precedence (mirrors `comps-v2-llm-config.ts`):
 *   1. AI_GATEWAY_API_KEY → Vercel AI Gateway (`https://ai-gateway.vercel.sh/v1`)
 *   2. OPENAI_API_KEY → direct OpenAI API (model id must be OpenAI-native)
 *
 * Model id env: `MARKET_REPORT_INSIGHTS_MODEL` (default `anthropic/claude-opus-4.6`
 * on the gateway — strongest reasoning for narrative quality; bullets are
 * <300 tokens of output so cost-per-call stays reasonable).
 *
 * Cost guardrails:
 *   - Input is the structured summary only, never the raw cohort.
 *   - max_tokens capped tightly so a runaway response can't blow up cost.
 *   - Caller (`/api/admin/market-report/insights`) caches results so the
 *     same (segment + scope + anchor + ADR filter) only bills once per TTL.
 */

import OpenAI from 'openai';
import type { MarketSummarySection } from '@/lib/market-report/types';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const DEFAULT_GATEWAY_MODEL = 'anthropic/claude-opus-4.6';
const MAX_OUTPUT_TOKENS = 380;
const MAX_BULLETS = 5;
const MIN_BULLETS = 3;

export interface MarketInsightsInput {
  segment: 'glamping' | 'rv_resort';
  scope: 'local' | 'national';
  addressLine: string;
  radiusMiles: number;
  adrMin: number | null;
  adrMax: number | null;
  summary: MarketSummarySection;
}

export interface MarketInsightsResult {
  bullets: string[];
  /** Resolved model id (after env precedence). Useful for the UI footnote. */
  model: string;
  /** Total tokens used (when reported by the gateway). */
  tokensUsed: number | null;
}

interface ResolvedClient {
  apiKey: string;
  baseURL?: string;
  model: string;
}

function resolveClient(env: NodeJS.ProcessEnv = process.env): ResolvedClient | null {
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();
  if (!gatewayKey && !openaiKey) return null;
  const modelId =
    env.MARKET_REPORT_INSIGHTS_MODEL?.trim() ||
    env.COMPS_V2_MODEL_DEFAULT?.trim() ||
    DEFAULT_GATEWAY_MODEL;
  if (gatewayKey) {
    return { apiKey: gatewayKey, baseURL: GATEWAY_BASE_URL, model: modelId };
  }
  // Direct OpenAI fallback — gateway-style ids won't work, normalize to gpt-4o-mini.
  const directModel = modelId.includes('/') ? 'gpt-4o-mini' : modelId;
  return { apiKey: openaiKey!, model: directModel };
}

/**
 * Strip the structured summary down to a small JSON blob the model can reason
 * over without bloating the context window or leaking sensitive fields.
 */
function buildSummarySnapshot(input: MarketInsightsInput): Record<string, unknown> {
  const s = input.summary;
  const drivers = s.demandDrivers ?? null;
  const county = s.countyMetrics ?? null;
  const score = s.opportunityScore ?? null;
  return {
    segment: input.segment,
    scope: input.scope,
    address: input.addressLine,
    radius_miles: input.scope === 'local' ? input.radiusMiles : null,
    ardr_filter: { min: input.adrMin, max: input.adrMax },
    properties: s.propertyCount,
    total_sites: s.totalSites,
    top_unit_types: s.topUnitTypesWithAdr.map((u) => ({
      unit_type: u.unit_type,
      count: u.count,
      mean_ardr: u.meanAdr,
      median_ardr: u.medianAdr,
    })),
    top_states: s.topStates.slice(0, 5),
    sources: s.sourceBreakdown.map((b) => ({
      source: b.sourceLabel,
      properties: b.propertyCount,
      avg_ardr: b.avgRetailDailyRate,
      avg_occupancy: b.avgOccupancy,
    })),
    demand_drivers: drivers
      ? {
          national_parks_count: drivers.nationalParks.count,
          ski_resorts_count: drivers.skiResorts.count,
          wineries_count: drivers.wineries.count,
          major_outdoor_count: drivers.majorOutdoorSites.count,
          top_parks: drivers.nationalParks.top.slice(0, 3).map((p) => p.name),
          top_ski: drivers.skiResorts.top.slice(0, 3).map((p) => p.name),
          top_wineries: drivers.wineries.top.slice(0, 3).map((p) => p.name),
          top_outdoor: drivers.majorOutdoorSites.top.slice(0, 3).map((p) => p.name),
        }
      : null,
    county: county
      ? {
          name: county.countyName,
          population_2020: county.population2020,
          pop_change_pct: county.populationChangePct,
          gdp_2023_million: county.gdp2023,
          gdp_growth_10yr_pct: county.gdpGrowthMaaPct,
        }
      : null,
    opportunity_score: score
      ? {
          score: score.score,
          grade: score.grade,
          headline: score.headline,
          components: score.components.map((c) => ({
            pillar: c.label,
            points: c.available ? c.points : null,
            max: c.maxPoints,
            detail: c.detail,
          })),
        }
      : null,
  };
}

const SYSTEM_PROMPT = `You are a hospitality feasibility analyst writing the executive bullet list for a Market Summary card.

Hard rules:
- Output exactly 4 to 5 bullet points, one per line, each prefixed with "- ".
- Each bullet is ONE sentence (max ~28 words).
- Cite specific numbers from the data (counts, $ARDR, %s). NEVER invent figures.
- Lead with the strongest signal (opportunity, gap, premium pricing, demand drivers, supply).
- No introductions, no headings, no closing line, no markdown beyond "- ".
- Use concrete operator language ("luxury safari tents median $480/night within 50 mi"), not buzzwords.
- If a data point is null/missing, do not mention it.
- Address the segment context: glamping vs RV park; local vs national.`;

function buildUserPrompt(input: MarketInsightsInput): string {
  const snapshot = buildSummarySnapshot(input);
  return [
    `Segment: ${input.segment === 'glamping' ? 'Glamping' : 'RV Resort'}`,
    `Scope: ${input.scope === 'local' ? `Local — ${input.addressLine} within ${input.radiusMiles} mi` : 'National (US-wide)'}`,
    '',
    'Structured summary (JSON):',
    '```json',
    JSON.stringify(snapshot, null, 2),
    '```',
    '',
    'Write 4-5 bullets following the system rules.',
  ].join('\n');
}

/** Parse the model output into a tidy bullet array, defensively. Exported for tests. */
export function parseBullets(raw: string): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    // Drop accidental headings or trailing punctuation-only lines
    .filter((l) => l.length > 0 && !/^#+\s/.test(l) && !/^[-—]+$/.test(l));
  // Cap at 5 bullets even if the model went over.
  return lines.slice(0, MAX_BULLETS);
}

export async function generateMarketSummaryInsights(
  input: MarketInsightsInput
): Promise<MarketInsightsResult | null> {
  // Skip entirely for empty cohorts — there is nothing meaningful to summarize.
  if (input.summary.propertyCount === 0) return null;

  const cfg = resolveClient();
  if (!cfg) {
    console.warn('[market-report:insights] no AI key configured (AI_GATEWAY_API_KEY / OPENAI_API_KEY)');
    return null;
  }

  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await client.chat.completions.create({
      model: cfg.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const bullets = parseBullets(raw);
    if (bullets.length < MIN_BULLETS) {
      console.warn('[market-report:insights] model returned fewer than minimum bullets', { bullets });
      return null;
    }
    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;
    const totalTokens = response.usage?.total_tokens ?? promptTokens + completionTokens;
    const tokensUsed = totalTokens > 0 ? totalTokens : null;
    return { bullets, model: cfg.model, tokensUsed };
  } catch (err) {
    console.warn('[market-report:insights] generation failed:', err);
    return null;
  }
}
