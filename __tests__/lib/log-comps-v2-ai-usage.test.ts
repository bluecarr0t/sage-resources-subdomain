/**
 * @jest-environment node
 */

import { COMPS_V2_DEEP_ENRICH_FEATURE, logCompsV2DeepEnrichGatewayUsage } from '@/lib/comps-v2/log-comps-v2-ai-usage';

const insertMock = jest.fn(() => Promise.resolve({ error: null }));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: insertMock,
    })),
  })),
}));

describe('logCompsV2DeepEnrichGatewayUsage', () => {
  beforeEach(() => {
    insertMock.mockClear();
  });

  it('inserts admin_ai_usage_events with feature comps_v2_deep_enrich and task metadata', async () => {
    await logCompsV2DeepEnrichGatewayUsage({
      userId: 'user-1',
      userEmail: 'a@example.com',
      task: 'extraction',
      model: 'anthropic/claude-sonnet-4.6',
      requestedModel: 'anthropic/claude-sonnet-4.6',
      provider: 'vercel_ai_gateway',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      latencyMs: 1234,
      propertyName: 'Test Glamp',
      correlationId: 'corr-xyz',
      correlationSource: 'body',
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(row.feature).toBe(COMPS_V2_DEEP_ENRICH_FEATURE);
    expect(row.model).toBe('anthropic/claude-sonnet-4.6');
    expect(row.provider).toBe('vercel_ai_gateway');
    expect(row.input_tokens).toBe(10);
    expect(row.output_tokens).toBe(20);
    expect(row.total_tokens).toBe(30);
    expect(row.request_meta).toEqual({
      task: 'extraction',
      latency_ms: 1234,
      property_name: 'Test Glamp',
      correlation_id: 'corr-xyz',
      correlation_source: 'body',
      requested_model: 'anthropic/claude-sonnet-4.6',
    });
  });
});
