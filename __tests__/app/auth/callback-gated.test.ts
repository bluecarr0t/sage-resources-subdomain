/**
 * Magic-link / gated-content behavior on GET /auth/callback.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockExchangeCodeForSession = jest.fn();
const mockUpsert = jest.fn();
const mockLogGatedContentEvent = jest.fn();

jest.mock('@/lib/gated-content-events', () => ({
  logGatedContentEvent: (...args: unknown[]) => mockLogGatedContentEvent(...args),
}));

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteHandlerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
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
  user_metadata: { full_name: 'Jane Doe' },
};

describe('GET /auth/callback — gated magic link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: { session: { user: mockUser } },
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockLogGatedContentEvent.mockResolvedValue(undefined);
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
    expect(mockLogGatedContentEvent).toHaveBeenCalledWith({
      eventType: 'auth_verified',
      email: 'jane@example.com',
      pageSlug: 'glamping-market-overview',
      userId: 'user-uuid-1',
      metadata: { name: 'Jane Doe' },
    });
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
    expect(mockLogGatedContentEvent).not.toHaveBeenCalled();
  });

  it('returns gated users to the gated page (not /login) when code exchange fails', async () => {
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
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockLogGatedContentEvent).not.toHaveBeenCalled();
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
  });

  it('admin OAuth flow without redirect param still goes to active jobs', async () => {
    const res = await GET(callbackUrl({ code: 'google-oauth-code' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/admin\/job-pipeline$/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns gated users with link-expired when callback has no code', async () => {
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
  });
});
