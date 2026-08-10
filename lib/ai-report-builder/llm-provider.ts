/**
 * LLM provider for Report Builder narrative generation.
 *
 * Default: Vercel AI Gateway + anthropic/claude-opus-5 (USE_REPORT_CLAUDE !== 'false').
 * Auth: AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN. Do not call Anthropic with a raw
 * ANTHROPIC_API_KEY that bypasses the Gateway.
 *
 * Uses the OpenAI-compatible Gateway chat completions API (same pattern as
 * comps-v2 / market-report insights) so Jest and Node runtimes stay polyfill-free.
 */

import { OpenAI } from 'openai';

export type LLMProvider = 'gateway' | 'openai' | 'anthropic';

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object';
  /** Optional override model id for this call (shadow eval). */
  model?: string;
  /** Disable prompt cache for this call. */
  disableCache?: boolean;
}

const GATEWAY_BASE = 'https://ai-gateway.vercel.sh/v1';
const DEFAULT_CLAUDE_MODEL = 'anthropic/claude-opus-5';
const DEFAULT_FALLBACK_MODEL = 'anthropic/claude-sonnet-4.5';
const DEFAULT_OPENAI_MODEL = 'openai/gpt-4o';

export function isReportClaudeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.USE_REPORT_CLAUDE?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (flag === 'true' || flag === '1' || flag === 'on') return true;
  return !!(env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL_OIDC_TOKEN?.trim());
}

export function resolveReportLlmModel(env: NodeJS.ProcessEnv = process.env): string {
  if (env.REPORT_LLM_MODEL?.trim()) return env.REPORT_LLM_MODEL.trim();
  if (isReportClaudeEnabled(env)) return DEFAULT_CLAUDE_MODEL;
  return DEFAULT_OPENAI_MODEL;
}

export function resolveReportLlmFallbackModel(
  env: NodeJS.ProcessEnv = process.env
): string {
  return env.REPORT_LLM_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
}

export function hasGatewayAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL_OIDC_TOKEN?.trim());
}

export function assertReportLlmConfigured(env: NodeJS.ProcessEnv = process.env): void {
  if (hasGatewayAuth(env)) return;
  if (env.OPENAI_API_KEY?.trim()) return;
  throw new Error(
    'Report generation requires AI_GATEWAY_API_KEY (preferred) or OPENAI_API_KEY'
  );
}

function createClient(env: NodeJS.ProcessEnv = process.env): {
  client: OpenAI;
  model: string;
  useGateway: boolean;
} {
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL_OIDC_TOKEN?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();
  const model = resolveReportLlmModel(env);

  if (gatewayKey) {
    return {
      client: new OpenAI({ apiKey: gatewayKey, baseURL: GATEWAY_BASE }),
      model,
      useGateway: true,
    };
  }
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY is required when AI Gateway is not configured');
  }
  const directModel = model.startsWith('openai/')
    ? model.slice('openai/'.length)
    : model.includes('/')
      ? 'gpt-4o'
      : model;
  return {
    client: new OpenAI({ apiKey: openaiKey }),
    model: directModel,
    useGateway: false,
  };
}

/**
 * Generate text for a report section via AI Gateway (preferred) or OpenAI.
 */
export async function chatCompletion(
  systemMessage: string,
  userMessage: string,
  options: ChatCompletionOptions = {}
): Promise<string> {
  assertReportLlmConfigured();

  const { client, model: defaultModel, useGateway } = createClient();
  const model = options.model
    ? useGateway
      ? options.model
      : options.model.startsWith('openai/')
        ? options.model.slice('openai/'.length)
        : options.model.includes('/')
          ? 'gpt-4o'
          : options.model
    : defaultModel;

  const maxTokens = options.maxTokens ?? 1200;
  const temperature = options.temperature ?? 0.3;

  let userContent = userMessage;
  if (options.responseFormat === 'json_object') {
    userContent = `${userMessage}\n\nReturn ONLY valid JSON. No markdown code fences.`;
  }

  const fallback = resolveReportLlmFallbackModel();

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userContent },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(options.responseFormat === 'json_object' &&
        !useGateway && {
          response_format: { type: 'json_object' as const },
        }),
    });

    const content = res.choices[0]?.message?.content?.trim();
    if (!content) throw new Error(`LLM (${model}) returned empty response`);
    return content;
  } catch (err) {
    // One retry on fallback model when Gateway primary fails
    if (useGateway && model !== fallback) {
      console.warn(
        `[llm-provider] primary ${model} failed, retrying ${fallback}:`,
        err instanceof Error ? err.message : err
      );
      const res = await client.chat.completions.create({
        model: fallback,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userContent },
        ],
        temperature,
        max_tokens: maxTokens,
      });
      const content = res.choices[0]?.message?.content?.trim();
      if (!content) throw new Error(`LLM (${fallback}) returned empty response`);
      return content;
    }
    throw err;
  }
}

/** @deprecated Prefer resolveReportLlmModel */
export function getLegacyLlmProviderLabel(
  env: NodeJS.ProcessEnv = process.env
): LLMProvider {
  if (hasGatewayAuth(env)) return 'gateway';
  if (env.LLM_PROVIDER?.toLowerCase() === 'anthropic') return 'anthropic';
  return 'openai';
}

export { GATEWAY_BASE, DEFAULT_CLAUDE_MODEL, DEFAULT_FALLBACK_MODEL, DEFAULT_OPENAI_MODEL };
