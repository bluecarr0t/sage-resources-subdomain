/**
 * Tests for POST /api/gated-access/request.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockSignInWithOtp = jest.fn();
const mockSignOut = jest.fn();
const mockLimit = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteHandlerClient: jest.fn(() => ({
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  })),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args),
          }),
        }),
      }),
    }),
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
    mockSignOut.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: null });
  });

  it('sends a magic link for a valid name + email', async () => {
    const res = await POST(makeRequest({ name: 'Jane Doe', email: 'Jane@Example.com' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(mockSignOut).toHaveBeenCalled();
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

  it('sends a magic link for email-only sign-in (returning user, no auto-signup)', async () => {
    const res = await POST(
      makeRequest({ email: 'returning@example.com', emailOnly: true })
    );
    expect(res.status).toBe(200);
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    const arg = mockSignInWithOtp.mock.calls[0][0];
    expect(arg.email).toBe('returning@example.com');
    expect(arg.options.shouldCreateUser).toBe(false);
    expect(arg.options.data.full_name).toBeUndefined();
    expect(arg.options.data.gated_page).toBe('glamping-market-overview');
  });

  it('retries email-only with shouldCreateUser when the address is new', async () => {
    mockSignInWithOtp
      .mockResolvedValueOnce({ error: { message: 'User not found' } })
      .mockResolvedValueOnce({ error: null });

    const res = await POST(
      makeRequest({ email: 'new@example.com', emailOnly: true })
    );
    expect(res.status).toBe(200);
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(2);
    expect(mockSignInWithOtp.mock.calls[0][0].options.shouldCreateUser).toBe(false);
    expect(mockSignInWithOtp.mock.calls[1][0].options.shouldCreateUser).toBe(true);
  });

  it('includes stored lead name on email-only resend when available', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { name: 'Jane Doe' } });

    const res = await POST(
      makeRequest({ email: 'returning@example.com', emailOnly: true })
    );
    expect(res.status).toBe(200);
    expect(mockSignInWithOtp.mock.calls[0][0].options.data.full_name).toBe('Jane Doe');
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

  it('returns 429 when Supabase email rate limit is hit', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: '429: email rate limit exceeded' },
    });
    const res = await POST(makeRequest({ name: 'Jane Doe', email: 'jane@example.com' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe('email_rate_limited');
    expect(body.error).toMatch(/Too many sign-in emails/i);
  });

  it('returns generic success for non-rate-limit Supabase errors (no enumeration)', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: { message: 'unexpected provider error' } });
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
