/**
 * Vercel AI Gateway extensions on OpenAI-compatible chat completions (see Vercel docs:
 * model fallbacks, prompt caching). Only applied when the client uses the gateway base URL.
 */

export type VercelGatewayChatExtras = {
  providerOptions?: { gateway: { models?: string[]; caching?: 'auto' } };
};

function parseCommaSeparatedModels(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Reads env:
 * - `COMPS_V2_GATEWAY_MODEL_FALLBACKS` — comma-separated gateway model ids tried after the primary `model` fails.
 * - `COMPS_V2_GATEWAY_PROMPT_CACHING` — set to `auto`, `true`, or `1` to enable `caching: 'auto'` (Anthropic-friendly).
 */
export function buildVercelGatewayChatExtras(): VercelGatewayChatExtras {
  const fallbacks = parseCommaSeparatedModels(process.env.COMPS_V2_GATEWAY_MODEL_FALLBACKS);
  const cachingRaw = process.env.COMPS_V2_GATEWAY_PROMPT_CACHING?.trim().toLowerCase() ?? '';
  const cachingAuto = cachingRaw === 'auto' || cachingRaw === 'true' || cachingRaw === '1';

  if (!fallbacks.length && !cachingAuto) return {};

  const gateway: { models?: string[]; caching?: 'auto' } = {};
  if (fallbacks.length) gateway.models = fallbacks;
  if (cachingAuto) gateway.caching = 'auto';

  return { providerOptions: { gateway } };
}
