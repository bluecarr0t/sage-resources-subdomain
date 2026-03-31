import { createServerClient } from '@/lib/supabase';
import type { CompsV2EnrichCorrelationSource } from '@/lib/comps-v2/resolve-enrich-correlation-id';

export const COMPS_V2_DEEP_ENRICH_FEATURE = 'comps_v2_deep_enrich';

export type CompsV2DeepEnrichUsageTask = 'condense' | 'extraction';

type CompletionUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

/**
 * Best-effort insert for admin usage panel (`/admin/usage-panel`). Never throws.
 */
export async function logCompsV2DeepEnrichGatewayUsage(params: {
  userId: string;
  userEmail: string | null;
  task: CompsV2DeepEnrichUsageTask;
  /** Model id returned by the API (e.g. after gateway fallbacks); falls back to requested. */
  model: string;
  requestedModel: string;
  provider: 'vercel_ai_gateway' | 'openai';
  usage: CompletionUsage | null | undefined;
  latencyMs: number;
  propertyName: string;
  correlationId?: string;
  correlationSource?: CompsV2EnrichCorrelationSource;
}): Promise<void> {
  try {
    const u = params.usage;
    const supabase = createServerClient();
    await supabase.from('admin_ai_usage_events' as never).insert({
      user_id: params.userId,
      user_email: params.userEmail,
      feature: COMPS_V2_DEEP_ENRICH_FEATURE,
      provider: params.provider,
      model: params.model,
      input_tokens: u?.prompt_tokens ?? null,
      output_tokens: u?.completion_tokens ?? null,
      total_tokens: u?.total_tokens ?? null,
      raw_usage: u ? (u as Record<string, unknown>) : null,
      request_meta: {
        task: params.task,
        latency_ms: params.latencyMs,
        property_name: params.propertyName,
        correlation_id: params.correlationId ?? null,
        correlation_source: params.correlationSource ?? null,
        requested_model: params.requestedModel,
      },
    } as never);
  } catch (e) {
    console.warn('[comps-v2] admin_ai_usage_events insert failed:', e);
  }
}
