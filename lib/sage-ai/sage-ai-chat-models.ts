/**
 * Sage AI admin chat: allowed Vercel AI Gateway models.
 * Order is most capable / typically highest cost first, down to most economical (UI list).
 * Keep in sync with POST /api/admin/sage-ai/chat validation.
 */

export const SAGE_AI_CHAT_MODELS = [
  { id: 'anthropic/claude-opus-4.6', tier: 'high' as const },
  { id: 'anthropic/claude-sonnet-4.5', tier: 'medium' as const },
  { id: 'anthropic/claude-haiku-4.5', tier: 'medium' as const },
  { id: 'openai/gpt-5-mini', tier: 'fast' as const },
  { id: 'openai/gpt-5-nano', tier: 'fast' as const },
] as const;

export type SageAiChatGatewayModelId = (typeof SAGE_AI_CHAT_MODELS)[number]['id'];

export const SAGE_AI_CHAT_DEFAULT_MODEL: SageAiChatGatewayModelId = 'anthropic/claude-sonnet-4.5';

const ALLOWED = new Set<string>(SAGE_AI_CHAT_MODELS.map((m) => m.id));

export function isAllowedSageAiChatModel(id: string): id is SageAiChatGatewayModelId {
  return ALLOWED.has(id);
}

export function parseSageAiChatModelId(value: unknown): SageAiChatGatewayModelId {
  if (typeof value !== 'string' || !isAllowedSageAiChatModel(value)) {
    return SAGE_AI_CHAT_DEFAULT_MODEL;
  }
  return value;
}

/** Picked model for Sage AI chat (no presets — only explicit gateway ids). */
export type SageAiModelSelection = { modelId: SageAiChatGatewayModelId };

export function resolveSageAiGatewayModelId(selection: SageAiModelSelection): SageAiChatGatewayModelId {
  return selection.modelId;
}
