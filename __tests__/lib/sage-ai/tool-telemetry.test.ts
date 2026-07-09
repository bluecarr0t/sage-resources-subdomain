/**
 * @jest-environment node
 */
import { withToolTelemetry } from '@/lib/sage-ai/tool-telemetry';
import type { SupabaseClient } from '@supabase/supabase-js';

type Insert = { table: string; payload: Record<string, unknown> };

function makeSupabase() {
  const inserts: Insert[] = [];
  const supabase = {
    from(table: string) {
      return {
        insert(payload: Record<string, unknown>) {
          inserts.push({ table, payload });
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
  return { supabase, inserts };
}

const flush = () => new Promise((r) => setImmediate(r));

describe('withToolTelemetry', () => {
  it('returns the original execute untouched when no context is given', () => {
    const exec = async () => ({ ok: true });
    expect(withToolTelemetry('x', null, exec)).toBe(exec);
    expect(withToolTelemetry('x', undefined, exec)).toBe(exec);
  });

  it('records a success event with null error_code and identity fields', async () => {
    const { supabase, inserts } = makeSupabase();
    const wrapped = withToolTelemetry(
      'my_tool',
      { supabase, userId: 'u1', correlationId: 'c1' },
      async () => ({ ok: true })
    );

    const result = await wrapped({});
    await flush();

    expect(result).toEqual({ ok: true });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe('sage_ai_tool_events');
    expect(inserts[0].payload).toMatchObject({
      tool_name: 'my_tool',
      user_id: 'u1',
      correlation_id: 'c1',
      error_code: null,
    });
    expect(typeof inserts[0].payload.latency_ms).toBe('number');
  });

  it.each([
    ['Daily quota exceeded for crawl_website', 'quota_exceeded'],
    ['Rate limit hit, slow down', 'rate_limited'],
    ['Firecrawl API key not configured', 'missing_credentials'],
    ['column "foo" is not in the allowlist', 'invalid_input'],
    ['Request timed out', 'timeout'],
    ['Something else broke', 'tool_error'],
  ])('classifies error result "%s" as %s', async (error, expected) => {
    const { supabase, inserts } = makeSupabase();
    const wrapped = withToolTelemetry('t', { supabase }, async () => ({ error, data: null }));

    await wrapped({});
    await flush();

    expect(inserts[0].payload.error_code).toBe(expected);
  });

  it('records "thrown" and re-throws when execute throws', async () => {
    const { supabase, inserts } = makeSupabase();
    const boom = new Error('kaboom');
    const wrapped = withToolTelemetry('t', { supabase }, async () => {
      throw boom;
    });

    await expect(wrapped({})).rejects.toThrow('kaboom');
    await flush();

    expect(inserts[0].payload.error_code).toBe('thrown');
  });
});
