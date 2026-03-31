import {
  COMPS_V2_AI_GATEWAY_BASE_URL,
  deepEnrichCondenseMinChars,
  resolveCompsV2LlmClientForTask,
  resolveCompsV2ModelIdForTask,
  shouldUseDeepEnrichCondense,
} from '@/lib/comps-v2/comps-v2-llm-config';

describe('comps-v2-llm-config', () => {
  const baseEnv: NodeJS.ProcessEnv = {};

  beforeEach(() => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('COMPS_V2_') || k === 'AI_GATEWAY_API_KEY' || k === 'OPENAI_API_KEY' || k === 'OPENAI_DEEP_ENRICH_MODEL') {
        delete process.env[k];
      }
    }
  });

  describe('resolveCompsV2ModelIdForTask', () => {
    it('uses COMPS_V2_DEEP_ENRICH_MODEL for extraction', () => {
      const env = {
        ...baseEnv,
        COMPS_V2_DEEP_ENRICH_MODEL: 'openai/gpt-5.4',
        COMPS_V2_MODEL_DEFAULT: 'openai/gpt-4.1',
        OPENAI_DEEP_ENRICH_MODEL: 'openai/o3',
      };
      expect(resolveCompsV2ModelIdForTask('deep_enrich_extraction', env)).toBe('openai/gpt-5.4');
    });

    it('falls back OPENAI_DEEP_ENRICH_MODEL then COMPS_V2_MODEL_DEFAULT then default', () => {
      expect(resolveCompsV2ModelIdForTask('deep_enrich_extraction', { ...baseEnv })).toBe(
        'anthropic/claude-sonnet-4.6'
      );
      expect(
        resolveCompsV2ModelIdForTask('deep_enrich_extraction', {
          ...baseEnv,
          OPENAI_DEEP_ENRICH_MODEL: 'openai/gpt-4.1',
        })
      ).toBe('openai/gpt-4.1');
      expect(
        resolveCompsV2ModelIdForTask('deep_enrich_extraction', {
          ...baseEnv,
          COMPS_V2_MODEL_DEFAULT: 'google/gemini-2.5-flash',
        })
      ).toBe('google/gemini-2.5-flash');
    });

    it('returns empty condense model unless COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL is set', () => {
      expect(resolveCompsV2ModelIdForTask('deep_enrich_condense', { ...baseEnv })).toBe('');
      expect(
        resolveCompsV2ModelIdForTask('deep_enrich_condense', {
          ...baseEnv,
          COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL: 'google/gemini-2.5-flash',
        })
      ).toBe('google/gemini-2.5-flash');
    });
  });

  describe('resolveCompsV2LlmClientForTask', () => {
    it('returns null without any API key', () => {
      expect(resolveCompsV2LlmClientForTask('deep_enrich_extraction', { ...baseEnv })).toBeNull();
    });

    it('uses gateway URL and model for extraction when AI_GATEWAY_API_KEY is set', () => {
      const env = {
        ...baseEnv,
        AI_GATEWAY_API_KEY: 'gw-secret',
        COMPS_V2_DEEP_ENRICH_MODEL: 'openai/gpt-5.1-thinking',
      };
      expect(resolveCompsV2LlmClientForTask('deep_enrich_extraction', env)).toEqual({
        apiKey: 'gw-secret',
        baseURL: COMPS_V2_AI_GATEWAY_BASE_URL,
        model: 'openai/gpt-5.1-thinking',
      });
    });

    it('returns null for condense task when condense model unset', () => {
      expect(
        resolveCompsV2LlmClientForTask('deep_enrich_condense', {
          ...baseEnv,
          AI_GATEWAY_API_KEY: 'k',
        })
      ).toBeNull();
    });

    it('resolves condense client when model and gateway key present', () => {
      const env = {
        ...baseEnv,
        AI_GATEWAY_API_KEY: 'gw',
        COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL: 'google/gemini-3-flash',
      };
      expect(resolveCompsV2LlmClientForTask('deep_enrich_condense', env)).toEqual({
        apiKey: 'gw',
        baseURL: COMPS_V2_AI_GATEWAY_BASE_URL,
        model: 'google/gemini-3-flash',
      });
    });

    it('strips openai/ prefix for direct OpenAI extraction', () => {
      const env = {
        ...baseEnv,
        OPENAI_API_KEY: 'sk',
        COMPS_V2_DEEP_ENRICH_MODEL: 'openai/gpt-4o',
      };
      expect(resolveCompsV2LlmClientForTask('deep_enrich_extraction', env)).toEqual({
        apiKey: 'sk',
        model: 'gpt-4o',
      });
    });

    it('uses gpt-4o for direct API when model is non-openai provider id', () => {
      const env = {
        ...baseEnv,
        OPENAI_API_KEY: 'sk',
        COMPS_V2_DEEP_ENRICH_MODEL: 'anthropic/claude-sonnet-4',
      };
      expect(resolveCompsV2LlmClientForTask('deep_enrich_extraction', env)).toEqual({
        apiKey: 'sk',
        model: 'gpt-4o',
      });
    });
  });

  describe('deepEnrichCondenseMinChars / shouldUseDeepEnrichCondense', () => {
    it('defaults min chars to 45000', () => {
      expect(deepEnrichCondenseMinChars({ ...baseEnv })).toBe(45_000);
    });

    it('respects COMPS_V2_DEEP_ENRICH_CONDENSE_MIN_CHARS', () => {
      expect(
        deepEnrichCondenseMinChars({
          ...baseEnv,
          COMPS_V2_DEEP_ENRICH_CONDENSE_MIN_CHARS: '1000',
        })
      ).toBe(1000);
    });

    it('shouldUseDeepEnrichCondense requires model and length threshold', () => {
      const env = { ...baseEnv, COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL: 'anthropic/claude-haiku-4.5' };
      expect(shouldUseDeepEnrichCondense(44_999, env)).toBe(false);
      expect(shouldUseDeepEnrichCondense(45_000, env)).toBe(true);
      expect(shouldUseDeepEnrichCondense(45_000, { ...baseEnv })).toBe(false);
    });
  });
});
