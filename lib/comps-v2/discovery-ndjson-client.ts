import type { CompsV2SearchStreamEvent } from '@/lib/comps-v2/search-stream-events';

export type ConsumeCompsV2NdjsonResult = { ok: true } | { ok: false; message: string };

export type ConsumeCompsV2NdjsonMessages = {
  /** Shown when a line is not valid JSON or the body is missing. */
  corruptLine: string;
  /** Shown when decoding or the read loop throws unexpectedly. */
  unexpectedError: string;
};

function parseNdjsonLine(line: string): CompsV2SearchStreamEvent | null {
  try {
    return JSON.parse(line) as CompsV2SearchStreamEvent;
  } catch {
    return null;
  }
}

/**
 * Reads NDJSON discovery stream. Per-line JSON parse failures return `corruptLine`; other errors return `unexpectedError`.
 */
export async function consumeCompsV2DiscoveryNdjson(
  res: Response,
  signal: AbortSignal,
  onEvent: (ev: CompsV2SearchStreamEvent) => void,
  messages: ConsumeCompsV2NdjsonMessages
): Promise<ConsumeCompsV2NdjsonResult> {
  const body = res.body;
  if (!body) {
    return { ok: false, message: messages.corruptLine };
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (signal.aborted) {
          await reader.cancel().catch(() => {});
          throw new DOMException('Aborted', 'AbortError');
        }
        if (done) break;
        try {
          buffer += decoder.decode(value, { stream: true });
        } catch {
          return { ok: false, message: messages.unexpectedError };
        }
        const parts = buffer.split('\n');
        buffer = parts.pop() ?? '';
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let ev: CompsV2SearchStreamEvent | null;
          try {
            ev = parseNdjsonLine(trimmed);
          } catch {
            return { ok: false, message: messages.unexpectedError };
          }
          if (!ev) return { ok: false, message: messages.corruptLine };
          try {
            onEvent(ev);
          } catch {
            return { ok: false, message: messages.unexpectedError };
          }
        }
      }
      const tail = buffer.trim();
      if (tail) {
        let ev: CompsV2SearchStreamEvent | null;
        try {
          ev = parseNdjsonLine(tail);
        } catch {
          return { ok: false, message: messages.unexpectedError };
        }
        if (!ev) return { ok: false, message: messages.corruptLine };
        try {
          onEvent(ev);
        } catch {
          return { ok: false, message: messages.unexpectedError };
        }
      }
      return { ok: true };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      return { ok: false, message: messages.unexpectedError };
    }
  } finally {
    reader.releaseLock();
  }
}
