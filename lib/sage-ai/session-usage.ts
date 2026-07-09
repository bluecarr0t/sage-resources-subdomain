import { SAGE_AI_FEATURE } from '@/lib/sage-ai/log-usage';

export type SageAiUsageTurn = {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: string;
};

export type SageAiSessionUsageSummary = {
  lastTurn: SageAiUsageTurn | null;
  threadTotal: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    turnCount: number;
  };
};

type UsageRow = {
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
  request_meta: Record<string, unknown> | null;
};

function sessionIdFromMeta(meta: Record<string, unknown> | null): string | null {
  const id = meta?.session_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function summarizeSageAiSessionUsage(
  rows: UsageRow[],
  sessionId: string
): SageAiSessionUsageSummary {
  // Rows are already filtered to this session in the DB query; this defensive
  // filter keeps the function correct if ever passed a mixed set.
  const sessionRows = rows.filter(
    (r) => sessionIdFromMeta(r.request_meta) === sessionId
  );

  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  for (const row of sessionRows) {
    inputTokens += row.input_tokens ?? 0;
    outputTokens += row.output_tokens ?? 0;
    totalTokens += row.total_tokens ?? (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
  }

  const last = sessionRows[0];
  const lastTurn: SageAiUsageTurn | null = last
    ? {
        model: last.model,
        inputTokens: last.input_tokens,
        outputTokens: last.output_tokens,
        totalTokens: last.total_tokens,
        createdAt: last.created_at,
      }
    : null;

  return {
    lastTurn,
    threadTotal: {
      inputTokens,
      outputTokens,
      totalTokens,
      turnCount: sessionRows.length,
    },
  };
}

export const SAGE_AI_USAGE_SELECT =
  'model, input_tokens, output_tokens, total_tokens, created_at, request_meta' as const;

export const SAGE_AI_USAGE_FETCH_LIMIT = 500;

export { SAGE_AI_FEATURE };
