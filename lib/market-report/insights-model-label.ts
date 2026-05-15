/**
 * Maps gateway / provider model ids (e.g. `anthropic/claude-opus-4.6`) to stable
 * operator-facing label keys. Raw ids stay available for engineer tooltips.
 */

export type MarketInsightsOperatorLabelKey =
  | 'insightsModelClaudeOpusViaGateway'
  | 'insightsModelClaudeSonnetViaGateway'
  | 'insightsModelClaudeHaikuViaGateway'
  | 'insightsModelClaudeViaGateway'
  | 'insightsModelOpenaiGpt4oMiniViaGateway'
  | 'insightsModelOpenaiGpt4oViaGateway'
  | 'insightsModelOpenaiOFamilyViaGateway'
  | 'insightsModelOpenaiViaGateway'
  | 'insightsModelGeminiViaGateway'
  | 'insightsModelMetaLlamaViaGateway'
  | 'insightsModelMistralViaGateway'
  | 'insightsModelXaiGrokViaGateway'
  | 'insightsModelOtherProviderViaGateway'
  | 'insightsModelOpenaiDirect'
  | 'insightsModelUnknown';

export type MarketInsightsModelLabelResolution = {
  rawModelId: string;
  operatorLabelKey: MarketInsightsOperatorLabelKey;
  /** Present when `operatorLabelKey` is `insightsModelOtherProviderViaGateway`. */
  otherProvider?: string;
};

function titleCaseSegment(seg: string): string {
  const s = seg.trim();
  if (!s) return 'Unknown';
  return s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Given a resolved model id from `insights-llm` (gateway `provider/model` or a
 * direct OpenAI id), returns an i18n key for the short operator label plus the
 * raw id for tooltips / debugging.
 */
export function resolveMarketInsightsModelLabel(
  modelId: string | null | undefined
): MarketInsightsModelLabelResolution | null {
  const raw = (modelId ?? '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const slash = lower.indexOf('/');
  if (slash === -1) {
    // Direct OpenAI (or other) id without gateway namespace.
    if (/^gpt-|^o[0-9]|^chatgpt-|^text-embedding-|^davinci|^babbage|^curie|^ada/i.test(raw)) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelOpenaiDirect' };
    }
    return { rawModelId: raw, operatorLabelKey: 'insightsModelUnknown' };
  }

  const provider = lower.slice(0, slash);
  const rest = lower.slice(slash + 1);

  if (provider === 'anthropic') {
    if (rest.includes('claude-opus') || rest.includes('opus')) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelClaudeOpusViaGateway' };
    }
    if (rest.includes('claude-sonnet') || rest.includes('sonnet')) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelClaudeSonnetViaGateway' };
    }
    if (rest.includes('claude-haiku') || rest.includes('haiku')) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelClaudeHaikuViaGateway' };
    }
    if (rest.includes('claude')) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelClaudeViaGateway' };
    }
    return { rawModelId: raw, operatorLabelKey: 'insightsModelClaudeViaGateway' };
  }

  if (provider === 'openai') {
    if (rest.includes('gpt-4o-mini') || rest.includes('4o-mini')) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelOpenaiGpt4oMiniViaGateway' };
    }
    if (rest.includes('gpt-4o') || rest.includes('4o')) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelOpenaiGpt4oViaGateway' };
    }
    if (/(^|[^a-z0-9])o[0-9]/.test(rest) || rest.includes('o1') || rest.includes('o3') || rest.includes('o4')) {
      return { rawModelId: raw, operatorLabelKey: 'insightsModelOpenaiOFamilyViaGateway' };
    }
    return { rawModelId: raw, operatorLabelKey: 'insightsModelOpenaiViaGateway' };
  }

  if (provider === 'google') {
    return { rawModelId: raw, operatorLabelKey: 'insightsModelGeminiViaGateway' };
  }

  if (provider === 'meta') {
    return { rawModelId: raw, operatorLabelKey: 'insightsModelMetaLlamaViaGateway' };
  }

  if (provider === 'mistral') {
    return { rawModelId: raw, operatorLabelKey: 'insightsModelMistralViaGateway' };
  }

  if (provider === 'xai' || provider === 'x-ai') {
    return { rawModelId: raw, operatorLabelKey: 'insightsModelXaiGrokViaGateway' };
  }

  return {
    rawModelId: raw,
    operatorLabelKey: 'insightsModelOtherProviderViaGateway',
    otherProvider: titleCaseSegment(provider),
  };
}
