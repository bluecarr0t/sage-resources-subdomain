/**
 * Message-history compaction for Sage AI.
 *
 * Truncates large tool-result payloads (`data`, `aggregates`, dashboard chart
 * `rows`, map `features`, …), clamps very long strings inside tool JSON, and
 * optionally trims huge assistant `text` parts so the chat request stays under
 * model context limits (e.g. Claude 200k-token windows).
 *
 * Uses a **hard character cap** on the JSON-serialized messages array: if the
 * first pass is still too large, row caps are halved down to 3, then oldest
 * non-system messages are dropped until the cap is met or only `minMessages`
 * remain.
 */

export interface CompactMessagesOptions {
  /** Last N turns use `maxRowsPerToolResultRecent` (default 10). */
  recentTurns?: number;
  /** Max rows per tool payload outside the recent window (default 5). */
  maxRowsPerToolResult?: number;
  /** Initial max rows for recent tool payloads (default 16). */
  maxRowsPerToolResultRecent?: number;
  /** Soft cap: drop oldest messages until under this OR only `recentTurns` left. */
  charBudget?: number;
  /** Hard cap on JSON.stringify(messages). If exceeded, tighten rows / drop history. */
  hardPayloadCharCap?: number;
  /** Do not shrink below this many messages when dropping oldest (default 2). */
  minMessages?: number;
  /** Max characters kept per `text` part (default 36_000). */
  maxTextPartChars?: number;
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
  maxRowsPerToolResultRecent: 16,
  charBudget: 100_000,
  hardPayloadCharCap: 160_000,
  minMessages: 2,
  maxTextPartChars: 36_000,
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

/** Long property descriptions blow up token counts; clamp leaf strings in tool JSON. */
const MAX_TOOL_STRING_CHARS = 260;
const MAX_TOOL_STRING_DEPTH = 7;

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

function compactNestedVisualizationRows(
  clone: Record<string, unknown>,
  max: number
): void {
  if (clone.type === 'dashboard' && Array.isArray(clone.cells)) {
    clone.cells = clone.cells.map((cell) => {
      if (!cell || typeof cell !== 'object') return cell;
      const c = { ...(cell as Record<string, unknown>) };
      truncateArrayField(c, 'rows', max);
      return c;
    });
  }
  if (clone.type === 'geojson_map' && Array.isArray(clone.layers)) {
    clone.layers = clone.layers.map((layer) => {
      if (!layer || typeof layer !== 'object') return layer;
      const L = { ...(layer as Record<string, unknown>) };
      truncateArrayField(L, 'features', max);
      return L;
    });
  }
}

function clampLongStringsInToolJson(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length <= MAX_TOOL_STRING_CHARS) return value;
    return `${value.slice(0, MAX_TOOL_STRING_CHARS)}… (+${value.length - MAX_TOOL_STRING_CHARS} chars)`;
  }
  if (typeof value !== 'object') return value;
  if (depth > MAX_TOOL_STRING_DEPTH) return '[nested value truncated]';
  if (Array.isArray(value)) {
    return value.map((v) => clampLongStringsInToolJson(v, depth + 1));
  }
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) {
    out[k] = clampLongStringsInToolJson(o[k], depth + 1);
  }
  return out;
}

function compactToolOutput(output: unknown, max: number): unknown {
  if (!output || typeof output !== 'object') return output;
  const clone: Record<string, unknown> = Array.isArray(output)
    ? {
        data: output.slice(0, max),
        _truncated:
          output.length > max ? `(+${output.length - max} rows truncated)` : undefined,
      }
    : { ...(output as Record<string, unknown>) };

  for (const field of ARRAY_FIELDS) {
    truncateArrayField(clone, field, max);
  }

  compactNestedVisualizationRows(clone, max);

  if (Array.isArray(clone.export_sheets)) {
    clone.export_sheets = clone.export_sheets.map((sheet) => {
      if (!sheet || typeof sheet !== 'object') return sheet;
      const s = { ...(sheet as Record<string, unknown>) };
      truncateArrayField(s, 'data', max);
      return s;
    });
  }

  return clampLongStringsInToolJson(clone, 0);
}

function compactMessage(msg: Message, max: number, maxTextPartChars: number): Message {
  if (!Array.isArray(msg.parts)) return msg;
  const newParts = msg.parts.map((part) => {
    if (part.type === 'text' && typeof part.text === 'string' && part.text.length > maxTextPartChars) {
      return {
        ...part,
        text: `${part.text.slice(0, maxTextPartChars)}\n… [message text truncated]`,
      };
    }

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

function applyCharBudgetDrop(result: Message[], charBudget: number, recentTurns: number): Message[] {
  let r = result;
  while (estimateChars(r) > charBudget && r.length > recentTurns) {
    const firstNonSystemIdx = r.findIndex((m) => m.role !== 'system');
    if (firstNonSystemIdx === -1 || firstNonSystemIdx >= r.length - recentTurns) {
      break;
    }
    r = [...r.slice(0, firstNonSystemIdx), ...r.slice(firstNonSystemIdx + 1)];
  }
  return r;
}

/**
 * Compact a message history to fit model / gateway context limits.
 * Returns a new array; does not mutate inputs.
 */
export function compactMessages<T>(
  messages: readonly T[],
  options: CompactMessagesOptions = {}
): T[] {
  const {
    recentTurns,
    maxRowsPerToolResult,
    maxRowsPerToolResultRecent,
    charBudget,
    hardPayloadCharCap,
    minMessages,
    maxTextPartChars,
  } = {
    ...DEFAULTS,
    ...options,
  };
  if (messages.length === 0) return [];

  let source = [...(messages as unknown as Message[])];
  let rowRecent = maxRowsPerToolResultRecent;

  const buildFromSource = (list: Message[], rowR: number): Message[] => {
    const mapped = list.map((m, idx) => {
      const isRecent = idx >= list.length - recentTurns;
      return compactMessage(m, isRecent ? rowR : maxRowsPerToolResult, maxTextPartChars);
    });
    return applyCharBudgetDrop(mapped, charBudget, recentTurns);
  };

  while (true) {
    let result = buildFromSource(source, rowRecent);

    if (estimateChars(result) <= hardPayloadCharCap) {
      return result as unknown as T[];
    }

    if (rowRecent > 3) {
      rowRecent = Math.max(3, Math.floor(rowRecent / 2));
      continue;
    }

    if (source.length <= minMessages) {
      return result as unknown as T[];
    }

    const dropIdx = source.findIndex((m) => m.role !== 'system');
    if (dropIdx === -1) {
      return result as unknown as T[];
    }
    source = [...source.slice(0, dropIdx), ...source.slice(dropIdx + 1)];
    rowRecent = maxRowsPerToolResultRecent;
  }
}
