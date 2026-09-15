/**
 * Tests for /api/glamping-show-quiz/unlock.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/glamping-show-quiz/unlock/route';
import {
  GLAMPING_SHOW_QUIZ_PIN_COOKIE,
  boothCookieValue,
} from '@/lib/glamping-show-quiz-gate';

describe('glamping-show-quiz unlock', () => {
  const original = process.env.GLAMPING_SHOW_QUIZ_PIN;

  afterEach(() => {
    if (original === undefined) delete process.env.GLAMPING_SHOW_QUIZ_PIN;
    else process.env.GLAMPING_SHOW_QUIZ_PIN = original;
  });

  it('sets the booth cookie on a valid PIN', async () => {
    process.env.GLAMPING_SHOW_QUIZ_PIN = 'booth-pin';
    const res = await POST(
      new NextRequest('https://example.com/api/glamping-show-quiz/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: 'booth-pin' }),
      })
    );
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(GLAMPING_SHOW_QUIZ_PIN_COOKIE);
    expect(cookie?.value).toBe(boothCookieValue());
  });

  it('rejects a wrong PIN', async () => {
    process.env.GLAMPING_SHOW_QUIZ_PIN = 'booth-pin';
    const res = await POST(
      new NextRequest('https://example.com/api/glamping-show-quiz/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: 'nope' }),
      })
    );
    expect(res.status).toBe(403);
    expect(res.cookies.get(GLAMPING_SHOW_QUIZ_PIN_COOKIE)).toBeUndefined();
  });

  it('redirects and sets the cookie from GET ?pin=', async () => {
    process.env.GLAMPING_SHOW_QUIZ_PIN = 'booth-pin';
    const res = await GET(
      new NextRequest(
        'https://example.com/api/glamping-show-quiz/unlock?pin=booth-pin'
      )
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/glamping-show-quiz');
    expect(res.cookies.get(GLAMPING_SHOW_QUIZ_PIN_COOKIE)?.value).toBe(
      boothCookieValue()
    );
  });
});
