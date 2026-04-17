/**
 * @jest-environment node
 */
import { compactMessages } from '@/lib/sage-ai/compact-messages';

function userMsg(text: string) {
  return { role: 'user', parts: [{ type: 'text', text }] };
}

function toolMsg(name: string, output: Record<string, unknown>) {
  return {
    role: 'assistant',
    parts: [{ type: `tool-${name}`, state: 'output-available', output }],
  };
}

describe('compactMessages', () => {
  it('returns input unchanged when under the recent-turn cutoff', () => {
    const msgs = [userMsg('a'), userMsg('b'), userMsg('c')];
    expect(compactMessages(msgs, { recentTurns: 10 })).toEqual(msgs);
  });

  it('truncates tool-output data arrays in older messages', () => {
    const bigRows = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const older = toolMsg('query_properties', { data: bigRows, total_count: 20 });
    const recent = Array.from({ length: 10 }, (_, i) => userMsg(`r${i}`));
    const out = compactMessages([older, ...recent], {
      recentTurns: 10,
      maxRowsPerToolResult: 5,
    });
    expect(out.length).toBe(11);
    const firstPart = (out[0] as unknown as { parts: Array<{ output: { data: unknown[]; data_truncated?: string } }> }).parts[0];
    expect(firstPart.output.data).toHaveLength(5);
    expect(firstPart.output.data_truncated).toMatch(/\+15 rows/);
  });

  it('keeps recent turns verbatim even if they have large tool outputs', () => {
    const recentBig = toolMsg('query_properties', {
      data: Array.from({ length: 50 }, (_, i) => ({ id: i })),
    });
    const older = Array.from({ length: 5 }, (_, i) => userMsg(`old${i}`));
    const out = compactMessages([...older, recentBig], {
      recentTurns: 3,
      maxRowsPerToolResult: 5,
    });
    const last = out[out.length - 1] as unknown as { parts: Array<{ output: { data: unknown[] } }> };
    expect(last.parts[0].output.data).toHaveLength(50);
  });

  it('drops oldest messages when char budget is exceeded', () => {
    const hugeText = 'x'.repeat(50_000);
    const older = Array.from({ length: 5 }, () => userMsg(hugeText));
    const recent = Array.from({ length: 3 }, (_, i) => userMsg(`r${i}`));
    const out = compactMessages([...older, ...recent], {
      recentTurns: 3,
      charBudget: 80_000,
    });
    expect(out.length).toBeLessThan(5 + 3);
    expect(out.slice(-3)).toEqual(recent);
  });
});
