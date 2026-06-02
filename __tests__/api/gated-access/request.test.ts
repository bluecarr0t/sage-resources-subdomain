/**
 * Tests for POST /api/gated-access/request.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockSignInWithOtp = jest.fn();
const mockLimit = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServerClientWithCookies: jest.fn(async () => ({
    auth: { signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args) },
  })),
}));

jest.mock('@/lib/upstash', () => ({
  limit: (...args: unknown[]) => mockLimit(...args),
}));

import { POST } from '@/app/api/gated-access/request/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/gated-access/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/gated-access/request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLimit.mockResolvedValue({ success: true, limit: 3, remaining: 2, reset: 0 });
    mockSignInWithOtp.mockResolvedValue({ error: null });
  });

  it('sends a magic link for a valid name + email', async () => {
    const res = await POST(makeRequest({ name: 'Jane Doe', email: 'Jane@Example.com' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    const arg = mockSignInWithOtp.mock.calls[0][0];
    expect(arg.email).toBe('jane@example.com');
    expect(arg.options.shouldCreateUser).toBe(true);
    expect(arg.options.data.full_name).toBe('Jane Doe');
    expect(arg.options.emailRedirectTo).toContain('/auth/callback?redirect=');
  });

  it('rejects a missing/short name with 400 and does not send a link', async () => {
    const res = await POST(makeRequest({ name: 'J', email: 'jane@example.com' }));
    expect(res.status).toBe(400);
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('sends a magic link for email-only sign-in without a name', async () => {
    const res = await POST(
      makeRequest({ email: 'returning@example.com', emailOnly: true })
    );
    expect(res.status).toBe(200);
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    const arg = mockSignInWithOtp.mock.calls[0][0];
    expect(arg.email).toBe('returning@example.com');
    expect(arg.options.data.full_name).toBeUndefined();
    expect(arg.options.data.gated_page).toBe('glamping-market-overview');
  });

  it('rejects an invalid email with 400', async () => {
    const res = await POST(makeRequest({ name: 'Jane Doe', email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('returns 429 when the rate limiter denies the request', async () => {
    mockLimit.mockResolvedValueOnce({ success: false, limit: 3, remaining: 0, reset: 0 });
    const res = await POST(makeRequest({ name: 'Jane Doe', email: 'jane@example.com' }));
    expect(res.status).toBe(429);
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('returns generic success even when Supabase errors (no enumeration)', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: { message: 'rate limited' } });
    const res = await POST(makeRequest({ name: 'Jane Doe', email: 'jane@example.com' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('returns 400 for an unparseable body', async () => {
    const req = new NextRequest('https://example.com/api/gated-access/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
