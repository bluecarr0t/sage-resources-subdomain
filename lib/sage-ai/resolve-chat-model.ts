/**
 * Per-turn model routing for Sage AI when the client sends `model: 'auto'`.
 *
 * Haiku handles simple data lookups; Sonnet handles multi-tool analysis,
 * web research, and anything ambiguous (safe default).
 */

import {
  migrateLegacySageAiChatModelId,
  SAGE_AI_CHAT_AUTO_SENTINEL,
  SAGE_AI_CHAT_ANALYSIS_MODEL,
  SAGE_AI_CHAT_FAST_MODEL,
  isAllowedSageAiChatModel,
  type SageAiChatGatewayModelId,
} from '@/lib/sage-ai/sage-ai-chat-models';

export type ResolveChatModelInput = {
  /** Raw `body.model` from the chat request (`'auto'` or a gateway id). */
  requestedModel: unknown;
  messages: unknown[];
  webResearchEnabled: boolean;
};

export type ResolveChatModelResult =
  | { ok: true; modelId: SageAiChatGatewayModelId; routed: 'explicit' | 'auto' }
  | { ok: false; error: string };

/** Patterns that suggest a heavier, multi-tool turn. */
const ANALYSIS_PATTERN =
  /\b(compare|comparison|feasibility|dashboard|aggregate|aggregat|analyze|analysis|competitor|brief|visualiz|chart|map\b|export|crawl|scrape|semantic|nearest|proximity|breakdown|grouped by|monthly rates|ota|web search|research competitor|python|pyodide|multi-?step|market report)\b/i;

/** Patterns for count / list / single-property style lookups. */
const SIMPLE_LOOKUP_PATTERN =
  /\b(how many|count unique|count\b|list\b|show me|get property|property details|lookup|find (the |a )?property|tell me about|what is the|column values|distinct values|unique propert|properties in|unit type|glamping in)\b/i;

function extractLatestUserText(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i] as { role?: string; content?: string; parts?: unknown[] };
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string' && m.content.trim()) return m.content.trim();
    if (Array.isArray(m.parts)) {
      const chunks: string[] = [];
      for (const p of m.parts) {
        if (
          typeof p === 'object' &&
          p !== null &&
          (p as { type?: string }).type === 'text' &&
          typeof (p as { text?: string }).text === 'string'
        ) {
          chunks.push((p as { text: string }).text);
        }
      }
      const joined = chunks.join('\n').trim();
      if (joined) return joined;
    }
  }
  return '';
}

/** True when the thread already contains tool calls (continuation turn). */
export function threadHasToolHistory(messages: unknown[]): boolean {
  for (const m of messages) {
    const parts = (m as { parts?: unknown[] }).parts;
    if (!Array.isArray(parts)) continue;
    for (const p of parts) {
      if (typeof p !== 'object' || p === null || !('type' in p)) continue;
      const type = String((p as { type: string }).type);
      if (type === 'dynamic-tool' || type.startsWith('tool-')) return true;
    }
  }
  return false;
}

/** True when the most recent assistant turn emitted `clarifying_question`. */
export function lastAssistantHadClarifyingQuestion(messages: unknown[]): boolean {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i] as { role?: string; parts?: unknown[] };
    if (m.role !== 'assistant') continue;
    if (!Array.isArray(m.parts)) return false;
    return m.parts.some((p) => {
      if (typeof p !== 'object' || p === null || !('type' in p)) return false;
      const part = p as { type: string; toolName?: string };
      if (part.type === 'tool-clarifying_question') return true;
      return part.type === 'dynamic-tool' && part.toolName === 'clarifying_question';
    });
  }
  return false;
}

function isShortClarificationAnswer(userText: string): boolean {
  const t = userText.trim();
  return t.length > 0 && t.length <= 120 && !ANALYSIS_PATTERN.test(t);
}

function routeAuto(input: Omit<ResolveChatModelInput, 'requestedModel'>): SageAiChatGatewayModelId {
  if (input.webResearchEnabled) return SAGE_AI_CHAT_ANALYSIS_MODEL;

  const { messages } = input;
  const userText = extractLatestUserText(messages);

  // Pill-click answers ("Colorado", "A single US state") after clarifying_question:
  // Haiku is enough for the data-tool pass and is much faster on Vertex.
  if (
    userText &&
    isShortClarificationAnswer(userText) &&
    lastAssistantHadClarifyingQuestion(messages)
  ) {
    return SAGE_AI_CHAT_FAST_MODEL;
  }

  if (threadHasToolHistory(messages)) return SAGE_AI_CHAT_ANALYSIS_MODEL;

  if (messages.length > 8) return SAGE_AI_CHAT_ANALYSIS_MODEL;

  if (!userText) return SAGE_AI_CHAT_ANALYSIS_MODEL;

  if (ANALYSIS_PATTERN.test(userText)) return SAGE_AI_CHAT_ANALYSIS_MODEL;

  if (SIMPLE_LOOKUP_PATTERN.test(userText) && userText.length <= 600) {
    return SAGE_AI_CHAT_FAST_MODEL;
  }

  if (userText.length <= 220 && !ANALYSIS_PATTERN.test(userText)) {
    return SAGE_AI_CHAT_FAST_MODEL;
  }

  return SAGE_AI_CHAT_ANALYSIS_MODEL;
}

/**
 * Resolve the gateway model for this chat turn.
 * Explicit gateway ids are honored; `'auto'` (or omitted) applies heuristics.
 */
export function resolveChatModelForTurn(input: ResolveChatModelInput): ResolveChatModelResult {
  const raw =
    typeof input.requestedModel === 'string' ? input.requestedModel.trim() : '';

  if (raw && raw !== SAGE_AI_CHAT_AUTO_SENTINEL) {
    const migrated = migrateLegacySageAiChatModelId(raw);
    if (!isAllowedSageAiChatModel(migrated)) {
      return { ok: false, error: 'Invalid model' };
    }
    return { ok: true, modelId: migrated, routed: 'explicit' };
  }

  return {
    ok: true,
    modelId: routeAuto(input),
    routed: 'auto',
  };
}
