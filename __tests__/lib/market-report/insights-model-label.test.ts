import { resolveMarketInsightsModelLabel } from '@/lib/market-report/insights-model-label';

describe('resolveMarketInsightsModelLabel', () => {
  it('returns null for empty input', () => {
    expect(resolveMarketInsightsModelLabel(null)).toBeNull();
    expect(resolveMarketInsightsModelLabel(undefined)).toBeNull();
    expect(resolveMarketInsightsModelLabel('   ')).toBeNull();
  });

  it('classifies Anthropic gateway ids by family', () => {
    expect(resolveMarketInsightsModelLabel('anthropic/claude-opus-4.6')).toEqual({
      rawModelId: 'anthropic/claude-opus-4.6',
      operatorLabelKey: 'insightsModelClaudeOpusViaGateway',
    });
    expect(resolveMarketInsightsModelLabel('anthropic/claude-sonnet-4')).toEqual({
      rawModelId: 'anthropic/claude-sonnet-4',
      operatorLabelKey: 'insightsModelClaudeSonnetViaGateway',
    });
    expect(resolveMarketInsightsModelLabel('anthropic/claude-haiku-3')).toEqual({
      rawModelId: 'anthropic/claude-haiku-3',
      operatorLabelKey: 'insightsModelClaudeHaikuViaGateway',
    });
    expect(resolveMarketInsightsModelLabel('anthropic/claude-3-5-sonnet')).toEqual({
      rawModelId: 'anthropic/claude-3-5-sonnet',
      operatorLabelKey: 'insightsModelClaudeSonnetViaGateway',
    });
  });

  it('falls back to generic Claude gateway label for other anthropic routes', () => {
    expect(resolveMarketInsightsModelLabel('anthropic/unknown-model')).toEqual({
      rawModelId: 'anthropic/unknown-model',
      operatorLabelKey: 'insightsModelClaudeViaGateway',
    });
  });

  it('classifies OpenAI gateway ids', () => {
    expect(resolveMarketInsightsModelLabel('openai/gpt-4o-mini')).toEqual({
      rawModelId: 'openai/gpt-4o-mini',
      operatorLabelKey: 'insightsModelOpenaiGpt4oMiniViaGateway',
    });
    expect(resolveMarketInsightsModelLabel('openai/gpt-4o')).toEqual({
      rawModelId: 'openai/gpt-4o',
      operatorLabelKey: 'insightsModelOpenaiGpt4oViaGateway',
    });
    expect(resolveMarketInsightsModelLabel('openai/o3-mini')).toEqual({
      rawModelId: 'openai/o3-mini',
      operatorLabelKey: 'insightsModelOpenaiOFamilyViaGateway',
    });
  });

  it('uses provider label for unrecognized gateway namespaces', () => {
    expect(resolveMarketInsightsModelLabel('cohere/command-r-plus')).toEqual({
      rawModelId: 'cohere/command-r-plus',
      operatorLabelKey: 'insightsModelOtherProviderViaGateway',
      otherProvider: 'Cohere',
    });
  });

  it('treats slash-less OpenAI-style ids as direct API', () => {
    expect(resolveMarketInsightsModelLabel('gpt-4o-mini')).toEqual({
      rawModelId: 'gpt-4o-mini',
      operatorLabelKey: 'insightsModelOpenaiDirect',
    });
  });

  it('marks unknown slash-less ids', () => {
    expect(resolveMarketInsightsModelLabel('some-vendor-model')).toEqual({
      rawModelId: 'some-vendor-model',
      operatorLabelKey: 'insightsModelUnknown',
    });
  });

  it('preserves raw casing in rawModelId for tooltips', () => {
    expect(resolveMarketInsightsModelLabel('Anthropic/Claude-opus-test')).toEqual({
      rawModelId: 'Anthropic/Claude-opus-test',
      operatorLabelKey: 'insightsModelClaudeOpusViaGateway',
    });
  });
});
