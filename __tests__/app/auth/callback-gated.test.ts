/**
 * Magic-link / gated-content behavior on GET /auth/callback.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockExchangeCodeForSession = jest.fn();
const mockVerifyOtp = jest.fn();
const mockUpsert = jest.fn();
const mockLogGatedContentEvent = jest.fn();

jest.mock('@/lib/gated-content-events', () => ({
  logGatedContentEvent: (...args: unknown[]) => mockLogGatedContentEvent(...args),
}));

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteHandlerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  })),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: () => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  })),
}));

import { GET } from '@/app/auth/callback/route';
import { DEFAULT_ADMIN_PATH } from '@/lib/admin-ui';

function callbackUrl(params: Record<string, string>): NextRequest {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`https://resources.sageoutdooradvisory.com/auth/callback?${qs}`);
}

const mockUser = {
  id: 'user-uuid-1',
  email: 'jane@example.com',
  user_metadata: {
    full_name: 'Jane Doe',
    first_name: 'Jane',
    last_name: 'Doe',
  },
};

describe('GET /auth/callback — gated magic link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: { session: { user: mockUser } },
    });
    mockVerifyOtp.mockResolvedValue({
      error: null,
      data: { session: { user: mockUser } },
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockLogGatedContentEvent.mockResolvedValue(undefined);
  });

  it('verifies token_hash, upserts lead, and redirects to glamping market overview', async () => {
    const res = await GET(
      callbackUrl({
        token_hash: 'otp-token-hash',
        type: 'signup',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toMatch(/\/glamping-market-overview$/);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: 'signup',
      token_hash: 'otp-token-hash',
    });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        page_slug: 'glamping-market-overview',
        verified_at: expect.any(String),
      }),
      { onConflict: 'email,page_slug' }
    );
    expect(mockLogGatedContentEvent).toHaveBeenCalledWith({
      eventType: 'auth_verified',
      email: 'jane@example.com',
      pageSlug: 'glamping-market-overview',
      userId: 'user-uuid-1',
      metadata: { name: 'Jane Doe', first_name: 'Jane', last_name: 'Doe' },
    });
  });

  it('prefers token_hash over PKCE code when both are present', async () => {
    const res = await GET(
      callbackUrl({
        token_hash: 'otp-token-hash',
        type: 'magiclink',
        code: 'pkce-auth-code',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: 'magiclink',
      token_hash: 'otp-token-hash',
    });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('exchanges PKCE code when token_hash is absent (admin OAuth / legacy links)', async () => {
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
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-1',
        email: 'jane@example.com',
        page_slug: 'glamping-market-overview',
      }),
      { onConflict: 'email,page_slug' }
    );
  });

  it('still redirects to overview when lead upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'db error' } });

    const res = await GET(
      callbackUrl({
        token_hash: 'otp-token-hash',
        type: 'signup',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/glamping-market-overview$/);
    expect(mockLogGatedContentEvent).not.toHaveBeenCalled();
  });

  it('returns gated users to the gated page (not /login) when OTP verify fails', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      error: { message: 'invalid token' },
      data: { session: null },
    });

    const res = await GET(
      callbackUrl({
        token_hash: 'bad-hash',
        type: 'signup',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/glamping-market-overview');
    expect(location).toContain('access=link-expired');
    expect(location).not.toContain('/login');
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockLogGatedContentEvent).not.toHaveBeenCalled();
  });

  it('returns gated users to the gated page when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'invalid code' },
      data: { session: null },
    });

    const res = await GET(
      callbackUrl({
        code: 'bad-code',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/glamping-market-overview');
    expect(location).toContain('access=link-expired');
    expect(location).not.toContain('/login');
  });

  it('redirects admin flows to /login when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'invalid code' },
      data: { session: null },
    });

    const res = await GET(
      callbackUrl({
        code: 'bad-code',
        redirect: DEFAULT_ADMIN_PATH,
      })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?error=');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('blocks open redirects and uses admin default path', async () => {
    const res = await GET(callbackUrl({ redirect: 'https://evil.example/phish' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/admin\/job-pipeline$/);
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('admin OAuth flow without redirect param still goes to active jobs', async () => {
    const res = await GET(callbackUrl({ code: 'google-oauth-code' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/admin\/job-pipeline$/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns gated users with link-expired when callback has no token or code', async () => {
    const res = await GET(
      callbackUrl({
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/glamping-market-overview');
    expect(location).toContain('access=link-expired');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('returns link-expired when token_hash is present without a valid type', async () => {
    const res = await GET(
      callbackUrl({
        token_hash: 'otp-token-hash',
        type: 'not-a-real-type',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('access=link-expired');
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
