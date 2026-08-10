/**
 * Parse Report Builder NDJSON progress stream (mirrors comps-v2 consumer).
 */

import type { DraftProgressEvent } from './draft-progress-events';

export type ConsumeDraftNdjsonResult = { ok: true } | { ok: false; message: string };

function parseLine(line: string): DraftProgressEvent | null {
  try {
    return JSON.parse(line) as DraftProgressEvent;
  } catch {
    return null;
  }
}

export async function consumeDraftProgressNdjson(
  res: Response,
  signal: AbortSignal,
  onEvent: (ev: DraftProgressEvent) => void
): Promise<ConsumeDraftNdjsonResult> {
  const body = res.body;
  if (!body) return { ok: false, message: 'Empty response body' };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (signal.aborted) {
        await reader.cancel().catch(() => {});
        throw new DOMException('Aborted', 'AbortError');
      }
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const ev = parseLine(trimmed);
        if (!ev) return { ok: false, message: 'Corrupt NDJSON line' };
        onEvent(ev);
      }
    }
    const tail = buffer.trim();
    if (tail) {
      const ev = parseLine(tail);
      if (!ev) return { ok: false, message: 'Corrupt NDJSON line' };
      onEvent(ev);
    }
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, message: e instanceof Error ? e.message : 'Stream error' };
  }
}
