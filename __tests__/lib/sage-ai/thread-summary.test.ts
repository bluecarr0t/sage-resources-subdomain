/**
 * @jest-environment node
 */
import {
  buildSummarySourceMessages,
  injectThreadSummary,
  maybeUpdateThreadSummary,
  condenseMessagesForSummary,
} from '@/lib/sage-ai/thread-summary';

jest.mock('ai', () => ({
  generateText: jest.fn(),
  gateway: (id: string) => id,
}));

jest.mock('@/lib/sage-ai/vercel-ai-gateway', () => ({
  buildSageAiGatewayHeaders: () => ({}),
  buildSageAiGatewayTags: () => ['sage_ai'],
}));

const { generateText } = jest.requireMock('ai') as {
  generateText: jest.Mock;
};

function makeSupabase(sessionRow: Record<string, unknown> | null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: sessionRow, error: null }),
    update: jest.fn().mockReturnThis(),
  };
  chain.update.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });
  return {
    from: jest.fn(() => chain),
    _chain: chain,
  };
}

describe('thread-summary', () => {
  beforeEach(() => {
    generateText.mockReset();
    delete process.env.SAGE_AI_THREAD_SUMMARY_ENABLED;
  });

  it('injectThreadSummary prepends synthetic user message', () => {
    const out = injectThreadSummary(
      [{ role: 'user', content: 'hello' }],
      'Earlier: asked about TX glamping counts.'
    );
    expect(out).toHaveLength(2);
    expect(out[0].role).toBe('user');
    expect(JSON.stringify(out[0])).toContain('<prior_thread_summary>');
    expect(out[1].content).toBe('hello');
  });

  it('buildSummarySourceMessages respects keep-recent window', () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
    }));
    const slice = buildSummarySourceMessages(messages, 0, 3);
    expect(slice).toHaveLength(14);
    expect(slice[0].content).toBe('m0');
    expect(slice.at(-1)?.content).toBe('m13');
  });

  it('condenseMessagesForSummary includes role labels', () => {
    const text = condenseMessagesForSummary([
      { role: 'user', content: 'How many in TX?' },
      { role: 'assistant', content: '42 unique addresses.' },
    ]);
    expect(text).toContain('user: How many in TX?');
    expect(text).toContain('assistant: 42 unique addresses.');
  });

  it('maybeUpdateThreadSummary no-ops below threshold', async () => {
    const supabase = makeSupabase(null);
    await maybeUpdateThreadSummary({
      supabase: supabase as never,
      sessionId: 's1',
      userId: 'u1',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(generateText).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('maybeUpdateThreadSummary calls Haiku when thread is long enough', async () => {
    process.env.SAGE_AI_THREAD_SUMMARY_MIN_MESSAGES = '10';
    process.env.SAGE_AI_THREAD_SUMMARY_KEEP_TURNS = '2';
    generateText.mockResolvedValue({ text: 'User asked about Texas glamping supply.' });

    const supabase = makeSupabase({
      thread_summary: null,
      summary_through_message_count: 0,
    });

    const messages = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message ${i}`,
    }));

    await maybeUpdateThreadSummary({
      supabase: supabase as never,
      sessionId: 'sess-1',
      userId: 'u1',
      messages,
    });

    expect(generateText).toHaveBeenCalledTimes(1);
    expect(supabase._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_summary: 'User asked about Texas glamping supply.',
        summary_through_message_count: 8,
      })
    );
  });
});
