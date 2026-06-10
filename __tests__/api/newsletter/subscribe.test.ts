/**
 * Tests for POST /api/newsletter/subscribe.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockUpsert = jest.fn();
const mockLimit = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: () => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  })),
}));

jest.mock('@/lib/upstash', () => ({
  limit: (...args: unknown[]) => mockLimit(...args),
}));

const mockNotifyZapierNewsletterSignup = jest.fn();

jest.mock('@/lib/zapier-webhook', () => ({
  notifyZapierNewsletterSignup: (...args: unknown[]) => mockNotifyZapierNewsletterSignup(...args),
}));

import { POST } from '@/app/api/newsletter/subscribe/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLimit.mockResolvedValue({ success: true, limit: 3, remaining: 2, reset: 0 });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('stores a valid signup with first and last name', async () => {
    const res = await POST(
      makeRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'Jane@Example.com',
        source: 'footer',
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [row, options] = mockUpsert.mock.calls[0];
    expect(row.email).toBe('jane@example.com');
    expect(row.first_name).toBe('Jane');
    expect(row.last_name).toBe('Doe');
    expect(row.name).toBe('Jane Doe');
    expect(row.source).toBe('footer');
    expect(row.subscribed_at).toEqual(expect.any(String));
    expect(options).toEqual({ onConflict: 'email', ignoreDuplicates: false });
    expect(mockNotifyZapierNewsletterSignup).toHaveBeenCalledWith({
      email: 'jane@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      source: 'footer',
      subscribed_at: row.subscribed_at,
    });
  });

  it('normalizes an invalid source to footer', async () => {
    await POST(
      makeRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        source: 'Not Valid!',
      })
    );
    expect(mockUpsert.mock.calls[0][0].source).toBe('footer');
  });

  it('rejects missing names with 400', async () => {
    const res = await POST(makeRequest({ email: 'jane@example.com' }));
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('rejects an invalid email with 400', async () => {
    const res = await POST(
      makeRequest({ firstName: 'Jane', lastName: 'Doe', email: 'not-an-email' })
    );
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns 429 when the rate limiter denies the request', async () => {
    mockLimit.mockResolvedValueOnce({ success: false, limit: 3, remaining: 0, reset: 0 });
    const res = await POST(
      makeRequest({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' })
    );
    expect(res.status).toBe(429);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns generic success when the database upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'db unavailable' } });
    const res = await POST(
      makeRequest({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(mockNotifyZapierNewsletterSignup).not.toHaveBeenCalled();
  });

  it('returns 400 for an unparseable body', async () => {
    const req = new NextRequest('https://example.com/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
