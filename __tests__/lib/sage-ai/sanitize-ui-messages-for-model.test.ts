/**
 * @jest-environment node
 */
import { convertToModelMessages } from 'ai';
import {
  normalizeToolInput,
  sanitizeUiMessagesForModel,
  sanitizeModelMessagesForProvider,
} from '@/lib/sage-ai/sanitize-ui-messages-for-model';

describe('normalizeToolInput', () => {
  it('parses JSON object strings', () => {
    expect(
      normalizeToolInput('{"question":"x","options":["a"]}', 'clarifying_question')
    ).toEqual({ question: 'x', options: ['a'] });
  });

  it('rebuilds clarifying_question input from output', () => {
    expect(
      normalizeToolInput('not-json', 'clarifying_question', {
        type: 'clarifying_question',
        question: 'What geo?',
        options: ['TX', 'CA'],
      })
    ).toEqual({ question: 'What geo?', options: ['TX', 'CA'] });
  });

  it('coerces null to empty object', () => {
    expect(normalizeToolInput(null, 'query_properties')).toEqual({});
  });

  it('unwraps AI SDK json envelopes', () => {
    expect(
      normalizeToolInput(
        { type: 'json', value: { question: 'x', options: ['a'] } },
        'clarifying_question'
      )
    ).toEqual({ question: 'x', options: ['a'] });
  });
});

describe('sanitizeUiMessagesForModel', () => {
  it('produces valid tool-call inputs for convertToModelMessages', async () => {
    const messages = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'market report' }] },
      {
        id: '2',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Let me ask' },
          {
            type: 'tool-clarifying_question',
            toolCallId: 'c1',
            state: 'output-available',
            input: 'not json',
            output: {
              type: 'clarifying_question',
              question: 'What geographic focus?',
              options: ['A single US state', 'A city'],
            },
          },
        ],
      },
      { id: '3', role: 'user', parts: [{ type: 'text', text: 'A single US state' }] },
    ];

    const sanitized = sanitizeUiMessagesForModel(messages);
    const modelMessages = await convertToModelMessages(sanitized);

    const toolCall = modelMessages[1].content?.find(
      (c): c is { type: 'tool-call'; input: unknown } =>
        typeof c === 'object' && c !== null && 'type' in c && c.type === 'tool-call'
    );
    expect(toolCall?.input).toEqual({
      question: 'What geographic focus?',
      options: ['A single US state', 'A city'],
    });
  });

  it('fixes tool-call inputs after convertToModelMessages', async () => {
    const messages = [
      { role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool-clarifying_question',
            toolCallId: 'c1',
            state: 'output-available',
            input: { type: 'json', value: { question: 'q', options: ['a'] } },
            output: { type: 'clarifying_question', question: 'q', options: ['a'] },
          },
        ],
      },
    ];
    const converted = await convertToModelMessages(messages);
    const fixed = sanitizeModelMessagesForProvider(converted);
    const toolCall = fixed[1].content?.find(
      (c): c is { type: 'tool-call'; input: unknown } =>
        typeof c === 'object' && c !== null && 'type' in c && c.type === 'tool-call'
    );
    expect(toolCall?.input).toEqual({ question: 'q', options: ['a'] });
  });
});
