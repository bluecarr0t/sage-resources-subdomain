/**
 * @jest-environment node
 */
import {
  resolveChatModelForTurn,
  threadHasToolHistory,
} from '@/lib/sage-ai/resolve-chat-model';
import {
  SAGE_AI_CHAT_ANALYSIS_MODEL,
  SAGE_AI_CHAT_FAST_MODEL,
} from '@/lib/sage-ai/sage-ai-chat-models';

describe('resolveChatModelForTurn', () => {
  it('honors explicit Haiku', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'anthropic/claude-haiku-4.5',
      messages: [],
      webResearchEnabled: false,
    });
    expect(res).toEqual({
      ok: true,
      modelId: SAGE_AI_CHAT_FAST_MODEL,
      routed: 'explicit',
    });
  });

  it('honors explicit Sonnet', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'anthropic/claude-sonnet-5',
      messages: [],
      webResearchEnabled: false,
    });
    expect(res).toEqual({
      ok: true,
      modelId: SAGE_AI_CHAT_ANALYSIS_MODEL,
      routed: 'explicit',
    });
  });

  it('rejects unknown explicit models', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'anthropic/claude-unknown-99',
      messages: [],
      webResearchEnabled: false,
    });
    expect(res).toEqual({ ok: false, error: 'Invalid model' });
  });

  it('routes auto simple count questions to Haiku', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'auto',
      messages: [
        {
          role: 'user',
          parts: [{ type: 'text', text: 'How many glamping properties are in Colorado?' }],
        },
      ],
      webResearchEnabled: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.modelId).toBe(SAGE_AI_CHAT_FAST_MODEL);
      expect(res.routed).toBe('auto');
    }
  });

  it('routes auto feasibility/compare to Sonnet', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'auto',
      messages: [
        {
          role: 'user',
          parts: [{ type: 'text', text: 'Build a feasibility brief for Austin TX glamping' }],
        },
      ],
      webResearchEnabled: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.modelId).toBe(SAGE_AI_CHAT_ANALYSIS_MODEL);
    }
  });

  it('routes auto to Sonnet when web research is on', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'auto',
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'How many in TX?' }] }],
      webResearchEnabled: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.modelId).toBe(SAGE_AI_CHAT_ANALYSIS_MODEL);
  });

  it('routes auto to Sonnet when the thread already has tool history', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'auto',
      messages: [
        { role: 'user', parts: [{ type: 'text', text: 'List cabins' }] },
        {
          role: 'assistant',
          parts: [{ type: 'tool-query_properties', state: 'output-available', output: {} }],
        },
        { role: 'user', parts: [{ type: 'text', text: 'Now filter to yurts' }] },
      ],
      webResearchEnabled: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.modelId).toBe(SAGE_AI_CHAT_ANALYSIS_MODEL);
  });

  it('routes short clarifying-question answers to Haiku even with tool history', () => {
    const res = resolveChatModelForTurn({
      requestedModel: 'auto',
      messages: [
        { role: 'user', parts: [{ type: 'text', text: 'Help with a market report' }] },
        {
          role: 'assistant',
          parts: [
            {
              type: 'tool-clarifying_question',
              state: 'output-available',
              output: {
                type: 'clarifying_question',
                question: 'Which state?',
                options: ['Colorado', 'Texas'],
              },
            },
          ],
        },
        { role: 'user', parts: [{ type: 'text', text: 'Colorado' }] },
      ],
      webResearchEnabled: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.modelId).toBe(SAGE_AI_CHAT_FAST_MODEL);
    }
  });
});

describe('threadHasToolHistory', () => {
  it('detects tool parts', () => {
    expect(
      threadHasToolHistory([
        { role: 'assistant', parts: [{ type: 'tool-foo', state: 'output-available' }] },
      ])
    ).toBe(true);
    expect(threadHasToolHistory([{ role: 'user', parts: [{ type: 'text', text: 'hi' }] }])).toBe(
      false
    );
  });
});
