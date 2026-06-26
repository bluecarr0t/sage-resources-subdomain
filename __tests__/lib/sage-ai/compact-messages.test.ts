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
  it('returns equivalent messages when there is no tool payload to shrink', () => {
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
    const firstPart = (
      out[0] as unknown as {
        parts: Array<{ output: { data: unknown[]; data_truncated?: string } }>;
      }
    ).parts[0];
    expect(firstPart.output.data).toHaveLength(5);
    expect(firstPart.output.data_truncated).toMatch(/\+15 rows/);
  });

  it('caps recent tool output rows with maxRowsPerToolResultRecent', () => {
    const recentBig = toolMsg('query_properties', {
      data: Array.from({ length: 100 }, (_, i) => ({ id: i })),
    });
    const older = Array.from({ length: 5 }, (_, i) => userMsg(`old${i}`));
    const out = compactMessages([...older, recentBig], {
      recentTurns: 3,
      maxRowsPerToolResult: 5,
      maxRowsPerToolResultRecent: 60,
    });
    const last = out[out.length - 1] as unknown as {
      parts: Array<{ output: { data: unknown[]; data_truncated?: string } }>;
    };
    expect(last.parts[0].output.data).toHaveLength(60);
    expect(last.parts[0].output.data_truncated).toMatch(/\+40 rows/);
  });

  it('truncates dashboard cell rows in recent tool output', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ unit_type: `t${i}`, total_units: i }));
    const dash = toolMsg('generate_dashboard', {
      type: 'dashboard',
      schema_version: 1,
      title: 'Test',
      cells: [
        {
          kind: 'bar',
          title: 'By type',
          span: 12,
          x_key: 'unit_type',
          y_keys: ['total_units'],
          rows,
        },
      ],
    });
    const out = compactMessages([dash], {
      recentTurns: 10,
      maxRowsPerToolResultRecent: 25,
    });
    const part = (out[0] as unknown as { parts: Array<{ output: { cells: Array<{ rows: unknown[]; rows_truncated?: string }> } }> })
      .parts[0];
    expect(part.output.cells[0].rows).toHaveLength(25);
    expect(part.output.cells[0].rows_truncated).toMatch(/\+75 rows/);
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

  it('clamps long string fields inside tool JSON', () => {
    const out = compactMessages([toolMsg('query_properties', { note: 'z'.repeat(500) })], {
      recentTurns: 1,
      hardPayloadCharCap: 1_000_000,
    });
    const note = (out[0] as unknown as { parts: Array<{ output: { note: string } }> }).parts[0]
      .output.note;
    expect(note.length).toBeLessThan(400);
    expect(note).toMatch(/\+\d+ chars\)$/);
  });

  it('strips full OTA export rows when export_fetch is present', () => {
    const heavy = toolMsg('export_ota_property_monthly_rates', {
      total_row_count: 1656,
      export_fetch: { zip: '34205', radius_miles: 50, years: [2025, 2026], sources: ['hipcamp'] },
      data: Array.from({ length: 100 }, (_, i) => ({ id: i })),
      export_sheets: [{ name: 'combined', data: Array.from({ length: 100 }, (_, i) => ({ id: i })) }],
      sample_rows: [{ property_id: '1' }],
    });
    const out = compactMessages([heavy], { recentTurns: 1, maxRowsPerToolResultRecent: 16 });
    const part = (out[0] as unknown as { parts: Array<{ output: Record<string, unknown> }> }).parts[0];
    expect(part.output.data).toBeUndefined();
    expect(part.output.export_sheets).toBeUndefined();
    expect(part.output.sample_rows).toHaveLength(1);
    expect(part.output.export_fetch).toBeDefined();
  });

  it('tightens row caps until hard payload budget is met', () => {
    const long = 'a'.repeat(400);
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i, blob: long }));
    const heavy = toolMsg('query_properties', { data: rows });
    const out = compactMessages([heavy], {
      recentTurns: 1,
      maxRowsPerToolResultRecent: 24,
      hardPayloadCharCap: 6_000,
      charBudget: 6_000,
      minMessages: 1,
    });
    const data = (out[0] as unknown as { parts: Array<{ output: { data: unknown[] } }> }).parts[0]
      .output.data as unknown[];
    expect(data.length).toBeLessThanOrEqual(24);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(6_000 + 500);
  });
});
