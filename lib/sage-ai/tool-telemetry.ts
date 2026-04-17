/**
 * Per-tool telemetry HOF for Sage AI. Wraps a tool's `execute` function with
 * latency tracking + error classification and persists one row per call into
 * `sage_ai_tool_events`. Failures to write telemetry never propagate (we only
 * log), so a telemetry outage can't break chat.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ToolTelemetryContext {
  supabase: SupabaseClient;
  userId?: string;
  correlationId?: string;
}

type ExecFn<TArgs, TOut> = (args: TArgs, ...rest: unknown[]) => Promise<TOut>;

function classifyError(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const maybe = result as { error?: unknown };
  if (typeof maybe.error !== 'string' || maybe.error.length === 0) return null;
  const msg = maybe.error.toLowerCase();
  if (msg.includes('quota')) return 'quota_exceeded';
  if (msg.includes('rate') && msg.includes('limit')) return 'rate_limited';
  if (msg.includes('not configured')) return 'missing_credentials';
  if (msg.includes('not in the allowlist')) return 'invalid_input';
  if (msg.includes('timed out')) return 'timeout';
  return 'tool_error';
}

async function recordEvent(
  ctx: ToolTelemetryContext,
  toolName: string,
  latencyMs: number,
  errorCode: string | null
): Promise<void> {
  try {
    await ctx.supabase.from('sage_ai_tool_events').insert({
      user_id: ctx.userId ?? null,
      tool_name: toolName,
      latency_ms: latencyMs,
      error_code: errorCode,
      correlation_id: ctx.correlationId ?? null,
    });
  } catch (err) {
    console.warn('[sage-ai/tool-telemetry] insert failed', toolName, err);
  }
}

/**
 * Wrap an AI SDK tool's `execute` with telemetry. Returns a new function with
 * the same signature; errors thrown inside `execute` are re-thrown after being
 * recorded as `error_code='thrown'`.
 */
export function withToolTelemetry<TArgs, TOut>(
  toolName: string,
  ctx: ToolTelemetryContext | null | undefined,
  execute: ExecFn<TArgs, TOut>
): ExecFn<TArgs, TOut> {
  if (!ctx) return execute;
  return async (args, ...rest) => {
    const start = Date.now();
    try {
      const result = await execute(args, ...rest);
      const latency = Date.now() - start;
      void recordEvent(ctx, toolName, latency, classifyError(result));
      return result;
    } catch (err) {
      const latency = Date.now() - start;
      void recordEvent(ctx, toolName, latency, 'thrown');
      throw err;
    }
  };
}
