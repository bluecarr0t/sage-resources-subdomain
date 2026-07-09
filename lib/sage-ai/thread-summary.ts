/**
 * Rolling thread summarization for Sage AI long conversations.
 *
 * At save time, older turns (everything before the last N turns) are condensed
 * and summarized via Haiku. At chat time, the summary is injected as a single
 * synthetic user message before compaction.
 */

import { generateText, gateway } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildSageAiGatewayHeaders,
  buildSageAiGatewayTags,
} from '@/lib/sage-ai/vercel-ai-gateway';
import { SAGE_AI_CHAT_FAST_MODEL } from '@/lib/sage-ai/sage-ai-chat-models';

export type ThreadSummaryMessage = {
  role?: string;
  content?: string;
  parts?: unknown[];
};

const DEFAULT_MIN_MESSAGES = 14;
const DEFAULT_KEEP_TURNS = 3;
const MAX_SUMMARY_OUTPUT_TOKENS = 400;

function isThreadSummaryEnabled(): boolean {
  const raw = process.env.SAGE_AI_THREAD_SUMMARY_ENABLED;
  if (raw == null || raw === '') return true;
  return raw === 'true' || raw === '1';
}

function parseEnvPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.replace(/_/g, '');
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function textFromMessage(message: ThreadSummaryMessage): string {
  if (typeof message.content === 'string' && message.content.trim()) {
    return message.content.trim();
  }
  if (!Array.isArray(message.parts)) return '';
  const chunks: string[] = [];
  for (const part of message.parts) {
    if (!part || typeof part !== 'object') continue;
    const p = part as Record<string, unknown>;
    if (p.type === 'text' && typeof p.text === 'string') {
      chunks.push(p.text.trim());
      continue;
    }
    if (
      (p.type === 'tool-invocation' || p.type === 'dynamic-tool') &&
      typeof p.toolName === 'string'
    ) {
      const output = p.output ?? p.result;
      chunks.push(summarizeToolOutput(p.toolName, output));
    }
  }
  return chunks.filter(Boolean).join('\n');
}

function summarizeToolOutput(toolName: string, output: unknown): string {
  if (!output || typeof output !== 'object') {
    return `[tool ${toolName}]`;
  }
  const o = output as Record<string, unknown>;
  const bits: string[] = [`[tool ${toolName}]`];
  for (const key of [
    'unique_properties',
    'total_units',
    'total_count',
    'count',
    'avg_retail_daily_rate',
    'median_retail_daily_rate',
    'filters',
    'applied_filters',
    'source',
    'table',
    'error',
  ]) {
    if (o[key] != null) {
      bits.push(`${key}=${JSON.stringify(o[key])}`);
    }
  }
  if (Array.isArray(o.data)) {
    bits.push(`rows=${o.data.length}`);
  }
  if (Array.isArray(o.aggregates)) {
    bits.push(`groups=${o.aggregates.length}`);
  }
  return bits.join(' ');
}

/**
 * Messages to fold into the next summary chunk: from `summaryThrough` up to
 * (but not including) the recent window at the tail.
 */
export function buildSummarySourceMessages(
  messages: ThreadSummaryMessage[],
  summaryThrough: number,
  keepRecentTurns: number
): ThreadSummaryMessage[] {
  const keepCount = keepRecentTurns * 2;
  const start = Math.max(0, summaryThrough);
  const end = Math.max(start, messages.length - keepCount);
  if (end <= start) return [];
  return messages.slice(start, end);
}

export function condenseMessagesForSummary(messages: ThreadSummaryMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role ?? 'unknown';
      const body = textFromMessage(m);
      if (!body) return null;
      return `${role}: ${body.slice(0, 1200)}`;
    })
    .filter((line): line is string => Boolean(line))
    .join('\n\n');
}

export function injectThreadSummary<T extends ThreadSummaryMessage>(
  messages: T[],
  summary: string
): T[] {
  const trimmed = summary.trim();
  if (!trimmed) return messages;
  const injected = {
    role: 'user' as const,
    parts: [
      {
        type: 'text',
        text: `<prior_thread_summary>\n${trimmed}\n</prior_thread_summary>`,
      },
    ],
  };
  return [injected as T, ...messages];
}

export async function generateThreadSummary(opts: {
  priorSummary: string | null;
  condensed: string;
  userId?: string;
}): Promise<string> {
  const priorBlock = opts.priorSummary?.trim()
    ? `Prior summary:\n${opts.priorSummary.trim()}\n\n`
    : '';

  const { text } = await generateText({
    model: gateway(SAGE_AI_CHAT_FAST_MODEL),
    maxOutputTokens: MAX_SUMMARY_OUTPUT_TOKENS,
    headers: buildSageAiGatewayHeaders(),
    providerOptions: {
      gateway: {
        user: opts.userId,
        tags: [...buildSageAiGatewayTags(), 'sage_ai_thread_summary'],
      },
    },
    system:
      'You compress Sage AI admin chat history into a factual brief. ' +
      'Preserve: user questions, geographic/product filters, counts, rates, tool names used, decisions, and open questions. ' +
      'Do NOT invent numbers. Use short bullets or tight paragraphs. Max ~350 words.',
    prompt:
      `${priorBlock}New turns to merge:\n${opts.condensed}\n\n` +
      'Write an updated rolling summary incorporating the new turns.',
  });

  return text.trim();
}

export interface MaybeUpdateThreadSummaryParams {
  supabase: SupabaseClient;
  sessionId: string;
  userId: string;
  messages: ThreadSummaryMessage[];
}

/**
 * Idempotent save-time hook: summarize leading messages when the thread is
 * long enough and new content exists beyond the recent window.
 */
export async function maybeUpdateThreadSummary(
  params: MaybeUpdateThreadSummaryParams
): Promise<void> {
  if (!isThreadSummaryEnabled()) return;

  const minMessages = parseEnvPositiveInt(
    'SAGE_AI_THREAD_SUMMARY_MIN_MESSAGES',
    DEFAULT_MIN_MESSAGES
  );
  const keepTurns = parseEnvPositiveInt(
    'SAGE_AI_THREAD_SUMMARY_KEEP_TURNS',
    DEFAULT_KEEP_TURNS
  );

  const { supabase, sessionId, userId, messages } = params;
  const messageCount = messages.length;
  if (messageCount < minMessages) return;

  const { data: session, error: loadError } = await supabase
    .from('sage_ai_sessions')
    .select('thread_summary, summary_through_message_count')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (loadError) {
    console.error('[sage-ai/thread-summary] load failed', loadError.message);
    return;
  }

  const summaryThrough = session?.summary_through_message_count ?? 0;
  const keepWindow = keepTurns * 2;
  if (messageCount <= summaryThrough + keepWindow) return;

  const toSummarize = buildSummarySourceMessages(messages, summaryThrough, keepTurns);
  if (toSummarize.length === 0) return;

  const condensed = condenseMessagesForSummary(toSummarize);
  if (!condensed.trim()) return;

  let summary: string;
  try {
    summary = await generateThreadSummary({
      priorSummary: session?.thread_summary ?? null,
      condensed,
      userId,
    });
  } catch (err) {
    console.error('[sage-ai/thread-summary] generate failed', err);
    return;
  }

  if (!summary) return;

  const newThrough = messageCount - keepWindow;
  const { error: updateError } = await supabase
    .from('sage_ai_sessions')
    .update({
      thread_summary: summary,
      summary_through_message_count: newThrough,
    })
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('[sage-ai/thread-summary] update failed', updateError.message);
  }
}

export async function loadThreadSummaryForSession(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('sage_ai_sessions')
    .select('thread_summary')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[sage-ai/thread-summary] load for chat failed', error.message);
    return null;
  }
  const summary = data?.thread_summary;
  return typeof summary === 'string' && summary.trim() ? summary.trim() : null;
}
