/**
 * Sage AI admin chat: allowed Vercel AI Gateway models.
 * Order is most capable / typically highest cost first, down to most economical (UI list).
 * Keep in sync with POST /api/admin/sage-ai/chat validation.
 */

export const SAGE_AI_CHAT_MODELS = [
  { id: 'anthropic/claude-opus-4.7', tier: 'high' as const, uiDisabled: true as const },
  { id: 'anthropic/claude-sonnet-4.5', tier: 'medium' as const, uiDisabled: true as const },
  { id: 'anthropic/claude-haiku-4.5', tier: 'fast' as const },
  { id: 'openai/gpt-5.4-nano', tier: 'fast' as const },
] as const;

export type SageAiChatGatewayModelId = (typeof SAGE_AI_CHAT_MODELS)[number]['id'];

export const SAGE_AI_CHAT_DEFAULT_MODEL: SageAiChatGatewayModelId = 'anthropic/claude-haiku-4.5';

const ALLOWED = new Set<string>(SAGE_AI_CHAT_MODELS.map((m) => m.id));

/** Maps removed gateway ids so persisted client state still resolves. */
export function migrateLegacySageAiChatModelId(id: string): string {
  if (id === 'openai/gpt-5-mini') return 'openai/gpt-5.4-nano';
  if (id === 'openai/gpt-5-nano') return 'openai/gpt-5.4-nano';
  if (id === 'anthropic/claude-opus-4.6') return 'anthropic/claude-opus-4.7';
  if (id === 'anthropic/claude-sonnet-4.5') return SAGE_AI_CHAT_DEFAULT_MODEL;
  return id;
}

export function isAllowedSageAiChatModel(id: string): id is SageAiChatGatewayModelId {
  return ALLOWED.has(id);
}

export function parseSageAiChatModelId(value: unknown): SageAiChatGatewayModelId {
  if (typeof value !== 'string') return SAGE_AI_CHAT_DEFAULT_MODEL;
  const id = migrateLegacySageAiChatModelId(value);
  if (!isAllowedSageAiChatModel(id)) return SAGE_AI_CHAT_DEFAULT_MODEL;
  return id;
}

/** Picked model for Sage AI chat (no presets — only explicit gateway ids). */
export type SageAiModelSelection = { modelId: SageAiChatGatewayModelId };

export function resolveSageAiGatewayModelId(selection: SageAiModelSelection): SageAiChatGatewayModelId {
  return selection.modelId;
}
