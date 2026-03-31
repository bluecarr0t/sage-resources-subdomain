import { buildVercelGatewayChatExtras } from '@/lib/comps-v2/vercel-gateway-chat-extras';

describe('buildVercelGatewayChatExtras', () => {
  const envKeys = ['COMPS_V2_GATEWAY_MODEL_FALLBACKS', 'COMPS_V2_GATEWAY_PROMPT_CACHING'] as const;

  afterEach(() => {
    for (const k of envKeys) delete process.env[k];
  });

  it('returns empty object when env unset', () => {
    expect(buildVercelGatewayChatExtras()).toEqual({});
  });

  it('parses fallbacks and caching', () => {
    process.env.COMPS_V2_GATEWAY_MODEL_FALLBACKS = ' openai/gpt-4o , anthropic/claude-sonnet-4.5 ';
    process.env.COMPS_V2_GATEWAY_PROMPT_CACHING = 'auto';
    expect(buildVercelGatewayChatExtras()).toEqual({
      providerOptions: {
        gateway: {
          models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4.5'],
          caching: 'auto',
        },
      },
    });
  });
});
