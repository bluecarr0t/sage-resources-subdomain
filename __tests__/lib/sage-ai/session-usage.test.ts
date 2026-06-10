import {
  formatTokenCount,
  formatSageAiModelLabel,
} from '@/lib/sage-ai/format-usage';
import { summarizeSageAiSessionUsage } from '@/lib/sage-ai/session-usage';

describe('summarizeSageAiSessionUsage', () => {
  it('aggregates rows for one session and picks latest turn', () => {
    const summary = summarizeSageAiSessionUsage(
      [
        {
          model: 'openai/gpt-5',
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          created_at: '2026-06-01T12:00:00Z',
          request_meta: { session_id: 'sess-a' },
        },
        {
          model: 'openai/gpt-5',
          input_tokens: 200,
          output_tokens: 80,
          total_tokens: 280,
          created_at: '2026-06-01T11:00:00Z',
          request_meta: { session_id: 'sess-a' },
        },
        {
          model: 'openai/gpt-5',
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15,
          created_at: '2026-06-01T10:00:00Z',
          request_meta: { session_id: 'sess-b' },
        },
      ],
      'sess-a'
    );

    expect(summary.threadTotal.turnCount).toBe(2);
    expect(summary.threadTotal.totalTokens).toBe(430);
    expect(summary.lastTurn?.totalTokens).toBe(150);
  });
});

describe('formatTokenCount', () => {
  it('formats thousands compactly', () => {
    expect(formatTokenCount(12400)).toBe('12.4k');
    expect(formatTokenCount(999)).toBe('999');
  });
});

describe('formatSageAiModelLabel', () => {
  it('strips provider prefix', () => {
    expect(formatSageAiModelLabel('openai/gpt-5.4-nano')).toBe('gpt-5.4-nano');
  });
});
