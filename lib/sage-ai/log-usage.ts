/**
 * Sage AI usage logging - tracks AI chat interactions for auditing and cost monitoring.
 */

import { createServerClient } from '@/lib/supabase';

export const SAGE_AI_FEATURE = 'sage_ai_chat';

type CompletionUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export interface SageAiUsageLogParams {
  userId: string;
  userEmail: string | null;
  model: string;
  provider: 'vercel_ai_gateway';
  usage: CompletionUsage | null | undefined;
  latencyMs: number;
  messageCount: number;
  toolCallCount: number;
  correlationId?: string;
  /** Short machine-readable code when the request failed mid-stream. */
  errorCode?: string | null;
}

/**
 * Best-effort insert for admin usage panel. Never throws.
 */
export async function logSageAiUsage(params: SageAiUsageLogParams): Promise<void> {
  try {
    const u = params.usage;
    const supabase = createServerClient();
    await supabase.from('admin_ai_usage_events' as never).insert({
      user_id: params.userId,
      user_email: params.userEmail,
      feature: SAGE_AI_FEATURE,
      provider: params.provider,
      model: params.model,
      input_tokens: u?.promptTokens ?? null,
      output_tokens: u?.completionTokens ?? null,
      total_tokens: u?.totalTokens ?? null,
      raw_usage: u ? (u as Record<string, unknown>) : null,
      request_meta: {
        latency_ms: params.latencyMs,
        message_count: params.messageCount,
        tool_call_count: params.toolCallCount,
        correlation_id: params.correlationId ?? null,
        error_code: params.errorCode ?? null,
      },
    } as never);
  } catch (e) {
    console.warn('[sage-ai] admin_ai_usage_events insert failed:', e);
  }
}
