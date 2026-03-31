/**
 * Comps-v2 LLM routing: one model per task, shared gateway vs direct-OpenAI auth.
 *
 * Tasks:
 * - `deep_enrich_extraction` — final structured JSON from scraped + Tavily + GBP context.
 * - `deep_enrich_condense` — optional long-context compression before extraction (set
 *   `COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL`; unset = skip).
 *
 * Env precedence (extraction): `COMPS_V2_DEEP_ENRICH_MODEL` → `OPENAI_DEEP_ENRICH_MODEL` →
 * `COMPS_V2_MODEL_DEFAULT` → `anthropic/claude-sonnet-4.6` (1M context on Vercel AI Gateway; strong
 * grounded extraction vs cost). Optional condense: set `COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL`, e.g.
 * `anthropic/claude-haiku-4.5` for fast cheap compression before extraction.
 *
 * Auth: `AI_GATEWAY_API_KEY` (base `https://ai-gateway.vercel.sh/v1`) preferred; else `OPENAI_API_KEY`
 * with OpenAI-native model ids (non-`openai/*` multi-provider ids fall back to `gpt-4o` on direct API).
 */

export const COMPS_V2_AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

export type CompsV2LlmTask = 'deep_enrich_extraction' | 'deep_enrich_condense';

const EXTRACTION_DEFAULT_GATEWAY_MODEL = 'anthropic/claude-sonnet-4.6';

export function resolveCompsV2ModelIdForTask(
  task: CompsV2LlmTask,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (task === 'deep_enrich_condense') {
    return env.COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL?.trim() ?? '';
  }
  return (
    env.COMPS_V2_DEEP_ENRICH_MODEL?.trim() ||
    env.OPENAI_DEEP_ENRICH_MODEL?.trim() ||
    env.COMPS_V2_MODEL_DEFAULT?.trim() ||
    EXTRACTION_DEFAULT_GATEWAY_MODEL
  );
}

export type CompsV2LlmClientConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
};

function toDirectOpenAIModel(gatewayStyleId: string): string {
  if (gatewayStyleId.startsWith('openai/')) return gatewayStyleId.slice('openai/'.length);
  if (gatewayStyleId.includes('/')) return 'gpt-4o';
  return gatewayStyleId || 'gpt-4o';
}

/**
 * Resolves API client fields for a task. Returns `null` if no API keys, or if condense is not configured
 * (`deep_enrich_condense` with empty model).
 */
export function resolveCompsV2LlmClientForTask(
  task: CompsV2LlmTask,
  env: NodeJS.ProcessEnv = process.env
): CompsV2LlmClientConfig | null {
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();
  if (!gatewayKey && !openaiKey) return null;

  const modelId = resolveCompsV2ModelIdForTask(task, env);
  if (task === 'deep_enrich_condense' && !modelId) return null;

  if (gatewayKey) {
    return { apiKey: gatewayKey, baseURL: COMPS_V2_AI_GATEWAY_BASE_URL, model: modelId };
  }
  return { apiKey: openaiKey!, model: toDirectOpenAIModel(modelId) };
}

/** Minimum raw context length before optional condense runs (default 45_000). */
export function deepEnrichCondenseMinChars(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.COMPS_V2_DEEP_ENRICH_CONDENSE_MIN_CHARS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 45_000;
}

export function shouldUseDeepEnrichCondense(bundleLength: number, env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    bundleLength >= deepEnrichCondenseMinChars(env) &&
    !!resolveCompsV2ModelIdForTask('deep_enrich_condense', env)
  );
}
