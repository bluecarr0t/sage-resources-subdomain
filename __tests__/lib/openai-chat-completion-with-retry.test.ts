/**
 * @jest-environment node
 */

import { InternalServerError, RateLimitError } from 'openai';
import { createChatCompletionWithRetry } from '@/lib/comps-v2/openai-chat-completion-with-retry';
import type OpenAI from 'openai';

describe('createChatCompletionWithRetry', () => {
  it('returns first successful completion', async () => {
    const completion = { id: '1', choices: [{ message: { content: '{}' } }], model: 'm' };
    const create = jest.fn().mockResolvedValue(completion);
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    const out = await createChatCompletionWithRetry(
      openai,
      { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
      { maxRetries: 2 }
    );

    expect(out).toBe(completion);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 then succeeds', async () => {
    const completion = { id: '2', choices: [{ message: { content: '{}' } }], model: 'm' };
    const create = jest
      .fn()
      .mockRejectedValueOnce(new RateLimitError(429, undefined, 'rate', undefined))
      .mockResolvedValueOnce(completion);
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    const out = await createChatCompletionWithRetry(
      openai,
      { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
      { maxRetries: 2 }
    );

    expect(out).toBe(completion);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 400', async () => {
    const { BadRequestError } = await import('openai');
    const create = jest.fn().mockRejectedValue(new BadRequestError(400, undefined, 'bad', undefined));
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    await expect(
      createChatCompletionWithRetry(
        openai,
        { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
        { maxRetries: 2 }
      )
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('stops after max retries on 503', async () => {
    const err = new InternalServerError(503, undefined, 'unavailable', undefined);
    const create = jest.fn().mockRejectedValue(err);
    const openai = { chat: { completions: { create } } } as unknown as OpenAI;

    await expect(
      createChatCompletionWithRetry(
        openai,
        { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
        { maxRetries: 1 }
      )
    ).rejects.toBe(err);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
