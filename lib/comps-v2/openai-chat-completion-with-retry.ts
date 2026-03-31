import { APIError } from 'openai';
import type OpenAI from 'openai';
import { isLikelyTransientNetworkError, sleepBackoffMs } from '@/lib/comps-v2/retry-transient';

function llmMaxRetries(): number {
  const n = Number(process.env.COMPS_V2_LLM_MAX_RETRIES);
  if (Number.isFinite(n) && n >= 0) return Math.min(8, Math.floor(n));
  return 2;
}

function isRetriableLlmError(e: unknown): boolean {
  if (e instanceof APIError) {
    if (e.status === 429) return true;
    if (e.status != null && e.status >= 500 && e.status < 600) return true;
  }
  return isLikelyTransientNetworkError(e);
}

export type ChatCompletionParams = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
  providerOptions?: unknown;
  models?: string[];
};

/**
 * Bounded retries for rate limits and transient 5xx (gateway / OpenAI). Default 2 retries (3 attempts).
 * Override with `COMPS_V2_LLM_MAX_RETRIES` (0–8).
 */
export async function createChatCompletionWithRetry(
  openai: OpenAI,
  params: ChatCompletionParams,
  options?: { maxRetries?: number }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const maxRetries = options?.maxRetries ?? llmMaxRetries();
  const maxAttempts = 1 + maxRetries;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return (await openai.chat.completions.create(
        params as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
      )) as OpenAI.Chat.Completions.ChatCompletion;
    } catch (e) {
      lastError = e;
      if (attempt >= maxAttempts - 1 || !isRetriableLlmError(e)) {
        throw e;
      }
      await sleepBackoffMs(attempt, 750);
    }
  }
  throw lastError;
}
