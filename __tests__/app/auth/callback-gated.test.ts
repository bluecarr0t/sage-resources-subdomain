/**
 * Magic-link / gated-content behavior on GET /auth/callback.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockExchangeCodeForSession = jest.fn();
const mockGetUser = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServerClientWithCookies: jest.fn(async () => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: () => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  })),
}));

import { GET } from '@/app/auth/callback/route';

function callbackUrl(params: Record<string, string>): NextRequest {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`https://resources.sageoutdooradvisory.com/auth/callback?${qs}`);
}

describe('GET /auth/callback — gated magic link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-uuid-1',
          email: 'jane@example.com',
          user_metadata: { full_name: 'Jane Doe' },
        },
      },
    });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('exchanges code, upserts lead, and redirects to glamping market overview', async () => {
    const res = await GET(
      callbackUrl({
        code: 'pkce-auth-code',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toMatch(/\/glamping-market-overview$/);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('pkce-auth-code');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        page_slug: 'glamping-market-overview',
        verified_at: expect.any(String),
      }),
      { onConflict: 'email,page_slug' }
    );
  });

  it('still redirects to overview when lead upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'db error' } });

    const res = await GET(
      callbackUrl({
        code: 'pkce-auth-code',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/glamping-market-overview$/);
  });

  it('redirects to login when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'invalid code' },
    });

    const res = await GET(
      callbackUrl({
        code: 'bad-code',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?error=');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('blocks open redirects and uses admin dashboard default', async () => {
    const res = await GET(callbackUrl({ redirect: 'https://evil.example/phish' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/admin\/dashboard$/);
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('admin OAuth flow without redirect param still goes to dashboard', async () => {
    const res = await GET(callbackUrl({ code: 'google-oauth-code' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/admin\/dashboard$/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
