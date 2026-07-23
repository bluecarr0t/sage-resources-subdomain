/**
 * Magic-link / gated-content behavior on GET /auth/callback.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockExchangeCodeForSession = jest.fn();
const mockVerifyOtp = jest.fn();
const mockUpsert = jest.fn();
const mockMaybeSingle = jest.fn();
const mockLogGatedContentEvent = jest.fn();
const mockNotifyMarketOverviewSignupSlack = jest.fn();
const mockNotifyMarketOverviewReturnSigninSlack = jest.fn();
const mockCountVerifiedGatedLeads = jest.fn();
const mockCountAuthVerifiedForEmail = jest.fn();

jest.mock('@/lib/gated-content-events', () => ({
  logGatedContentEvent: (...args: unknown[]) => mockLogGatedContentEvent(...args),
}));

jest.mock('@/lib/slack/website-slack-client', () => ({
  notifyMarketOverviewSignupSlack: (...args: unknown[]) =>
    mockNotifyMarketOverviewSignupSlack(...args),
  notifyMarketOverviewReturnSigninSlack: (...args: unknown[]) =>
    mockNotifyMarketOverviewReturnSigninSlack(...args),
}));

jest.mock('@/lib/gated-content-signup-count', () => ({
  countVerifiedGatedLeads: (...args: unknown[]) => mockCountVerifiedGatedLeads(...args),
  countAuthVerifiedForEmail: (...args: unknown[]) =>
    mockCountAuthVerifiedForEmail(...args),
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
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args),
          }),
        }),
      }),
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
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockCountVerifiedGatedLeads.mockResolvedValue({ count: 43, error: null });
    mockCountAuthVerifiedForEmail.mockResolvedValue(3);
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
      metadata: {
        name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        is_new_signup: true,
        is_return: false,
      },
    });
    expect(mockNotifyMarketOverviewSignupSlack).toHaveBeenCalledWith({
      signupNumber: 43,
      email: 'jane@example.com',
      name: 'Jane Doe',
    });
    expect(mockNotifyMarketOverviewReturnSigninSlack).not.toHaveBeenCalled();
  });

  it('posts a return sign-in Slack notice when lead was already verified', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { verified_at: '2026-01-01T00:00:00.000Z' },
      error: null,
    });

    const res = await GET(
      callbackUrl({
        token_hash: 'otp-token-hash',
        type: 'signup',
        redirect: '/glamping-market-overview',
      })
    );

    expect(res.status).toBe(307);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        verified_at: '2026-01-01T00:00:00.000Z',
      }),
      { onConflict: 'email,page_slug' }
    );
    expect(mockLogGatedContentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          is_new_signup: false,
          is_return: true,
        }),
      })
    );
    expect(mockNotifyMarketOverviewSignupSlack).not.toHaveBeenCalled();
    expect(mockNotifyMarketOverviewReturnSigninSlack).toHaveBeenCalledWith({
      email: 'jane@example.com',
      name: 'Jane Doe',
      signInCount: 3,
      firstVerifiedAt: '2026-01-01T00:00:00.000Z',
      totalVerifiedEmails: 43,
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
    expect(mockNotifyMarketOverviewSignupSlack).not.toHaveBeenCalled();
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
