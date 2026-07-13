/**
 * Sage AI admin chat: allowed Vercel AI Gateway models.
 * Keep in sync with POST /api/admin/sage-ai/chat validation.
 */

export const SAGE_AI_CHAT_MODELS = [
  { id: 'anthropic/claude-haiku-4.5', tier: 'fast' as const },
  { id: 'anthropic/claude-sonnet-5', tier: 'medium' as const },
] as const;

export type SageAiChatGatewayModelId = (typeof SAGE_AI_CHAT_MODELS)[number]['id'];

/** Cheaper model for simple lookups (count / list / single property). */
export const SAGE_AI_CHAT_FAST_MODEL: SageAiChatGatewayModelId = 'anthropic/claude-haiku-4.5';

/** Default for multi-tool analysis and ambiguous auto-routing fallback. */
export const SAGE_AI_CHAT_ANALYSIS_MODEL: SageAiChatGatewayModelId = 'anthropic/claude-sonnet-5';

/** Legacy explicit default when auto is not used. */
export const SAGE_AI_CHAT_DEFAULT_MODEL: SageAiChatGatewayModelId = SAGE_AI_CHAT_ANALYSIS_MODEL;

/** Client sends this sentinel; the chat route resolves per turn. */
export const SAGE_AI_CHAT_AUTO_SENTINEL = 'auto' as const;

const ALLOWED = new Set<string>(SAGE_AI_CHAT_MODELS.map((m) => m.id));

/** Maps removed gateway ids so persisted client state still resolves. */
export function migrateLegacySageAiChatModelId(id: string): string {
  if (id === 'openai/gpt-5-mini') return SAGE_AI_CHAT_ANALYSIS_MODEL;
  if (id === 'openai/gpt-5-nano') return SAGE_AI_CHAT_FAST_MODEL;
  if (id === 'openai/gpt-5.4-nano') return SAGE_AI_CHAT_FAST_MODEL;
  if (id === 'anthropic/claude-opus-4.6') return SAGE_AI_CHAT_ANALYSIS_MODEL;
  if (id === 'anthropic/claude-opus-4.7') return SAGE_AI_CHAT_ANALYSIS_MODEL;
  if (id === 'anthropic/claude-sonnet-4.5') return SAGE_AI_CHAT_ANALYSIS_MODEL;
  if (id === 'anthropic/claude-haiku-4.5') return SAGE_AI_CHAT_FAST_MODEL;
  return id;
}

export function isAllowedSageAiChatModel(id: string): id is SageAiChatGatewayModelId {
  return ALLOWED.has(id);
}

export function parseSageAiChatModelId(value: unknown): SageAiChatGatewayModelId {
  if (value === SAGE_AI_CHAT_AUTO_SENTINEL) return SAGE_AI_CHAT_ANALYSIS_MODEL;
  if (typeof value !== 'string') return SAGE_AI_CHAT_DEFAULT_MODEL;
  const id = migrateLegacySageAiChatModelId(value);
  if (!isAllowedSageAiChatModel(id)) return SAGE_AI_CHAT_DEFAULT_MODEL;
  return id;
}

export type SageAiModelSelection =
  | { mode: 'auto' }
  | { mode: 'fixed'; modelId: SageAiChatGatewayModelId };

export const SAGE_AI_DEFAULT_MODEL_SELECTION: SageAiModelSelection = {
  mode: 'fixed',
  modelId: SAGE_AI_CHAT_FAST_MODEL,
};

/** Value sent in POST /api/admin/sage-ai/chat `body.model`. */
export function sageAiModelForChatRequest(selection: SageAiModelSelection): string {
  if (selection.mode === 'auto') return SAGE_AI_CHAT_AUTO_SENTINEL;
  return selection.modelId;
}

/** Label / feedback attribution when the resolved id is not known client-side. */
export function resolveSageAiGatewayModelId(selection: SageAiModelSelection): string {
  if (selection.mode === 'auto') return SAGE_AI_CHAT_AUTO_SENTINEL;
  return selection.modelId;
}
