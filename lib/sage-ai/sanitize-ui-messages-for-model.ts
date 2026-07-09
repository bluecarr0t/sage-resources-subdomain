/**
 * Normalize UI message tool parts before `convertToModelMessages`.
 *
 * Anthropic rejects `tool_use.input` unless it is a JSON object. The AI SDK
 * sometimes preserves tool `input` as a string (streamed JSON) or null; this
 * module coerces those shapes and rebuilds known UX-tool inputs from `output`
 * when possible.
 */

import { isToolUIPart } from 'ai';

type ToolPart = Record<string, unknown> & {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
};

function getToolNameFromPart(part: ToolPart): string {
  if (typeof part.toolName === 'string' && part.toolName.length > 0) {
    return part.toolName;
  }
  return part.type.replace(/^tool-/, '');
}

function unwrapToolInputEnvelope(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const o = input as Record<string, unknown>;
  if (o.type === 'json' && 'value' in o) {
    return o.value;
  }
  return input;
}

function parseJsonObjectString(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function inputFromToolOutput(
  toolName: string,
  output: unknown
): Record<string, unknown> | null {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return null;
  }
  const o = output as Record<string, unknown>;

  if (toolName === 'clarifying_question') {
    if (typeof o.question === 'string' && Array.isArray(o.options)) {
      return { question: o.question, options: o.options };
    }
    return null;
  }

  if (toolName === 'suggest_followups' && Array.isArray(o.suggestions)) {
    return { suggestions: o.suggestions };
  }

  if (toolName === 'generate_python_code') {
    const code = typeof o.code === 'string' ? o.code : '';
    const description = typeof o.description === 'string' ? o.description : '';
    const uses =
      typeof o.uses_query_data === 'boolean' ? o.uses_query_data : undefined;
    return uses === undefined
      ? { code, description }
      : { code, description, uses_query_data: uses };
  }

  return null;
}

/** Coerce any tool `input` into a plain object for provider APIs. */
export function normalizeToolInput(
  input: unknown,
  toolName: string,
  output?: unknown
): Record<string, unknown> {
  let raw = unwrapToolInputEnvelope(input);

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (typeof raw === 'string') {
    const parsed = parseJsonObjectString(raw);
    if (parsed) return parsed;
  }

  const fromOutput = inputFromToolOutput(toolName, output);
  if (fromOutput) return fromOutput;

  if (raw === undefined || raw === null || raw === '') {
    return {};
  }

  if (Array.isArray(raw)) {
    return { items: raw };
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { value: raw };
  }

  return {};
}

function shouldNormalizeToolInput(state: unknown): boolean {
  return state !== 'input-streaming';
}

/**
 * Returns a shallow-cloned message list with tool `input` fields normalized.
 */
export function sanitizeUiMessagesForModel<T extends { parts?: unknown[] }>(
  messages: readonly T[]
): T[] {
  return messages.map((message) => {
    if (!Array.isArray(message.parts)) return message;
    const parts = message.parts.map((part) => {
      if (!part || typeof part !== 'object') return part;
      if (!isToolUIPart(part as Parameters<typeof isToolUIPart>[0])) {
        return part;
      }
      const toolPart = part as ToolPart;
      if (!shouldNormalizeToolInput(toolPart.state)) {
        return part;
      }
      const toolName = getToolNameFromPart(toolPart);
      const output = toolPart.output ?? toolPart.result;
      const sourceInput =
        toolPart.input !== undefined && toolPart.input !== null
          ? toolPart.input
          : typeof toolPart.rawInput === 'string'
            ? toolPart.rawInput
            : toolPart.input;
      const input = normalizeToolInput(sourceInput, toolName, output);
      return { ...toolPart, input };
    });
    return { ...message, parts };
  });
}

type ModelContentPart = Record<string, unknown> & { type?: string };

type ModelMessageLike = {
  role?: string;
  content?: unknown;
};

/**
 * Second pass after `convertToModelMessages`: coerce `tool-call` content blocks
 * so Vertex / Anthropic always receive a plain object `input`.
 */
export function sanitizeModelMessagesForProvider<T extends ModelMessageLike>(
  messages: readonly T[]
): T[] {
  return messages.map((message) => {
    if (!Array.isArray(message.content)) return message;
    const content = (message.content as ModelContentPart[]).map((part) => {
      if (!part || part.type !== 'tool-call') return part;
      const toolName =
        typeof part.toolName === 'string' ? part.toolName : 'unknown_tool';
      const input = normalizeToolInput(part.input, toolName);
      return { ...part, input };
    });
    return { ...message, content };
  });
}
