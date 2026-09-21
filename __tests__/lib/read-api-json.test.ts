/**
 * @jest-environment node
 */

import { readApiJson } from '@/lib/read-api-json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('readApiJson', () => {
  it('parses JSON success bodies', async () => {
    const body = await readApiJson<{ jobNumber: string }>(
      jsonResponse({ jobNumber: '26-100A-01' }),
      'Could not save'
    );
    expect(body.jobNumber).toBe('26-100A-01');
  });

  it('parses JSON error bodies without throwing', async () => {
    const res = jsonResponse({ message: 'A note is required when requesting changes' }, 400);
    const body = await readApiJson(res, 'Could not save');
    expect(body.message).toBe('A note is required when requesting changes');
  });

  it('throws the fallback when the server returns HTML', async () => {
    const res = new Response('<!DOCTYPE html><html><body>Internal Server Error</body></html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });

    await expect(readApiJson(res, 'Could not complete review action')).rejects.toThrow(
      'Could not complete review action'
    );
  });

  it('throws the fallback for an empty error response', async () => {
    const res = new Response('', { status: 500 });
    await expect(readApiJson(res, 'Could not save')).rejects.toThrow('Could not save');
  });
});
