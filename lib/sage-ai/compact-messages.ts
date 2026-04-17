/**
 * Message-history compaction for Sage AI.
 *
 * Keeps the most recent `recentTurns` messages untouched, and aggressively
 * truncates tool-result payloads (`data`, `aggregates`, `pages`, ...) in older
 * turns to at most `maxRowsPerToolResult` rows. If the resulting transcript is
 * still very large, older assistant/tool turns are dropped.
 *
 * This is a conservative, model-free implementation: no extra AI calls are
 * made. It's deterministic so it plays nicely with caching and replays.
 */

export interface CompactMessagesOptions {
  /** Keep the last N messages verbatim (default 10). */
  recentTurns?: number;
  /** Max rows kept per tool result in older messages (default 5). */
  maxRowsPerToolResult?: number;
  /** Approx character budget (~4 chars/token). Default ~40K tokens. */
  charBudget?: number;
}

type Part = Record<string, unknown> & {
  type?: string;
  state?: string;
  output?: unknown;
  result?: unknown;
  text?: string;
};

type Message = Record<string, unknown> & {
  role?: string;
  parts?: Part[];
};

const DEFAULTS: Required<CompactMessagesOptions> = {
  recentTurns: 10,
  maxRowsPerToolResult: 5,
  charBudget: 160_000,
};

const ARRAY_FIELDS = [
  'data',
  'aggregates',
  'pages',
  'results',
  'values',
  'value_counts',
  'reviews',
] as const;

function truncateArrayField(
  obj: Record<string, unknown>,
  field: string,
  max: number
): boolean {
  const val = obj[field];
  if (!Array.isArray(val) || val.length <= max) return false;
  const kept = val.slice(0, max);
  const dropped = val.length - max;
  obj[field] = kept;
  obj[`${field}_truncated`] = `(+${dropped} rows truncated)`;
  return true;
}

function compactToolOutput(output: unknown, max: number): unknown {
  if (!output || typeof output !== 'object') return output;
  const clone: Record<string, unknown> = Array.isArray(output)
    ? { data: output.slice(0, max), _truncated: output.length > max ? `(+${output.length - max} rows truncated)` : undefined }
    : { ...(output as Record<string, unknown>) };

  for (const field of ARRAY_FIELDS) {
    truncateArrayField(clone, field, max);
  }

  return clone;
}

function compactMessage(msg: Message, max: number): Message {
  if (!Array.isArray(msg.parts)) return msg;
  const newParts = msg.parts.map((part) => {
    const isToolPart = typeof part.type === 'string' && part.type.startsWith('tool-');
    if (!isToolPart) return part;

    const next: Part = { ...part };
    if (next.output !== undefined) {
      next.output = compactToolOutput(next.output, max);
    }
    if (next.result !== undefined) {
      next.result = compactToolOutput(next.result, max);
    }
    return next;
  });
  return { ...msg, parts: newParts };
}

function estimateChars(messages: unknown): number {
  try {
    return JSON.stringify(messages).length;
  } catch {
    return 0;
  }
}

/**
 * Compact a message history to fit a rough context budget without losing
 * recent turns. Returns a new array; does not mutate inputs.
 */
export function compactMessages<T>(
  messages: readonly T[],
  options: CompactMessagesOptions = {}
): T[] {
  const { recentTurns, maxRowsPerToolResult, charBudget } = {
    ...DEFAULTS,
    ...options,
  };
  if (messages.length <= recentTurns) return [...messages];

  const list = messages as unknown as Message[];
  const cutoff = list.length - recentTurns;
  const older = list.slice(0, cutoff).map((m) => compactMessage(m, maxRowsPerToolResult));
  const recent = list.slice(cutoff);

  let result = [...older, ...recent];

  // If still over budget, drop the oldest non-system messages until we fit.
  while (estimateChars(result) > charBudget && result.length > recentTurns) {
    const firstNonSystemIdx = result.findIndex((m) => m.role !== 'system');
    if (firstNonSystemIdx === -1 || firstNonSystemIdx >= result.length - recentTurns) {
      break;
    }
    result = [
      ...result.slice(0, firstNonSystemIdx),
      ...result.slice(firstNonSystemIdx + 1),
    ];
  }

  return result as unknown as T[];
}
