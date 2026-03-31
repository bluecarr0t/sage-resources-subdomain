/** @jest-environment node */

import { consumeCompsV2DiscoveryNdjson } from '@/lib/comps-v2/discovery-ndjson-client';
import type { CompsV2SearchStreamEvent } from '@/lib/comps-v2/search-stream-events';

describe('consumeCompsV2DiscoveryNdjson', () => {
  it('returns ok false when a line is not valid JSON', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"type":"meta","correlationId":"x"}\n'));
        controller.enqueue(encoder.encode('not-json\n'));
        controller.close();
      },
    });
    const res = new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
    const events: CompsV2SearchStreamEvent[] = [];
    const out = await consumeCompsV2DiscoveryNdjson(
      res,
      new AbortController().signal,
      (e) => events.push(e),
      { corruptLine: 'parse failed', unexpectedError: 'generic' }
    );
    expect(out).toEqual({ ok: false, message: 'parse failed' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'meta', correlationId: 'x' });
  });

  it('returns ok true for well-formed single-object stream', async () => {
    const line = JSON.stringify({ type: 'meta', correlationId: 'y' });
    const res = new Response(`${line}\n`, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
    const events: CompsV2SearchStreamEvent[] = [];
    const out = await consumeCompsV2DiscoveryNdjson(
      res,
      new AbortController().signal,
      (e) => events.push(e),
      { corruptLine: 'parse failed', unexpectedError: 'generic' }
    );
    expect(out).toEqual({ ok: true });
    expect(events).toHaveLength(1);
  });
});
