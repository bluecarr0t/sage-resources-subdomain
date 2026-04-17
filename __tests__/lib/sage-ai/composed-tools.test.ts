/**
 * @jest-environment node
 */
import { createSageAiTools } from '@/lib/sage-ai/tools';

function makeSupabase() {
  let lastReportsInsert: unknown = null;
  const supabase = {
    from(table: string) {
      if (table === 'reports') {
        return {
          insert: (payload: unknown) => {
            lastReportsInsert = payload;
            return {
              select: () => ({
                single: async () => ({
                  data: { id: 'draft-report-123' },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      // sage_ai_tool_events (telemetry) and any other table — silent no-op.
      return {
        insert: async () => ({ data: null, error: null }),
      };
    },
  };
  return {
    supabase,
    getLastReportsInsert: () => lastReportsInsert,
  };
}

describe('composedToolsEnabled registration', () => {
  it('is not registered by default', () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1' }
    );
    expect(Object.keys(tools)).not.toContain('competitor_comparison');
    expect(Object.keys(tools)).not.toContain('build_feasibility_brief');
  });

  it('registers both composed tools when enabled', () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', composedToolsEnabled: true }
    );
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'competitor_comparison',
        'build_feasibility_brief',
      ])
    );
  });
});

describe('build_feasibility_brief', () => {
  it('denies non-admin users with an error envelope', async () => {
    const { supabase, getLastReportsInsert } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', userRole: 'user', composedToolsEnabled: true }
    );

    const res = (await tools.build_feasibility_brief.execute!(
      {
        client_id: 'c-1',
        report_name: 'Test Brief',
        state: 'TX',
        city: 'Austin',
        project_type: 'glamping',
        template: 'glamping_feasibility',
        sections: [
          { key: 'market_overview', body: 'Some analysis goes here. '.repeat(3) },
        ],
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as { error?: string; data?: null };

    expect(res.error).toMatch(/requires role=admin/i);
    expect(getLastReportsInsert()).toBeNull();
  });

  it('drops invalid section keys and inserts draft when admin', async () => {
    const { supabase, getLastReportsInsert } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', userRole: 'admin', composedToolsEnabled: true }
    );

    const res = (await tools.build_feasibility_brief.execute!(
      {
        client_id: 'client-42',
        report_name: 'Austin Glamping Brief',
        state: 'TX',
        city: 'Austin',
        project_type: 'glamping',
        template: 'glamping_feasibility',
        sections: [
          { key: 'market_overview', body: 'Solid supply of cabins and yurts in Hill Country.' },
          { key: 'not_a_real_section', body: 'Should be dropped by the template filter.' },
        ],
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as {
      type: string;
      report_id: string;
      sections_written: number;
      view_url: string;
    };

    expect(res.type).toBe('feasibility_brief_draft');
    expect(res.report_id).toBe('draft-report-123');
    expect(res.sections_written).toBe(1);
    expect(res.view_url).toMatch(/\/admin\/reports\//);

    const payload = getLastReportsInsert() as {
      status: string;
      source: string;
      draft_content: { sections: Array<{ key: string; filled: boolean }> };
    };
    expect(payload.status).toBe('draft');
    expect(payload.source).toBe('sage_ai');
    const filledKeys = payload.draft_content.sections
      .filter((s) => s.filled)
      .map((s) => s.key);
    expect(filledKeys).toEqual(['market_overview']);
  });
});
