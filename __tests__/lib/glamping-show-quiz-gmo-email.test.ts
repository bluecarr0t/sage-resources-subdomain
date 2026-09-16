/**
 * @jest-environment node
 */

const mockSignInWithOtp = jest.fn();
const mockCreateClient = jest.fn(() => ({
  auth: { signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args) },
}));
const mockLookupGatedLead = jest.fn();
const mockSyncContact = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock('@/lib/gated-access-lead', () => ({
  lookupGatedLead: (...args: unknown[]) => mockLookupGatedLead(...args),
}));

jest.mock('@/lib/ghl/contacts', () => ({
  syncGlampingMarketOverviewContactAsync: (...args: unknown[]) =>
    mockSyncContact(...args),
}));

import { sendQuizMarketOverviewMagicLink } from '@/lib/glamping-show-quiz-gmo-email';

describe('sendQuizMarketOverviewMagicLink', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    mockLookupGatedLead.mockResolvedValue({
      exists: false,
      name: null,
      firstName: null,
      lastName: null,
      businessType: null,
    });
    mockSignInWithOtp.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    if (originalPublishable === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishable;
    }
  });

  it('sends a cookie-less OTP without throwing on cooldown errors', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: 'For security purposes, you can only request this after 60 seconds.' },
    });

    await expect(
      sendQuizMarketOverviewMagicLink({
        email: 'Jane@Example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        businessType: 'developer',
      })
    ).resolves.toBeUndefined();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: { persistSession: false, autoRefreshToken: false },
      })
    );
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'jane@example.com',
      options: expect.objectContaining({
        shouldCreateUser: true,
        emailRedirectTo: expect.stringContaining('/auth/callback'),
        data: expect.objectContaining({
          source: 'glamping-show-quiz',
          gated_page: 'glamping-market-overview',
          business_type: 'developer',
        }),
      }),
    });
    expect(mockSyncContact).toHaveBeenCalledWith(
      'glamping-market-overview',
      expect.objectContaining({
        email: 'jane@example.com',
        businessType: 'developer',
      })
    );
  });

  it('prefers an existing gated lead business type', async () => {
    mockLookupGatedLead.mockResolvedValueOnce({
      exists: true,
      name: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      businessType: 'investor',
    });

    await sendQuizMarketOverviewMagicLink({
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      businessType: 'developer',
    });

    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ business_type: 'investor' }),
        }),
      })
    );
  });

  it('does not throw when lookup fails', async () => {
    mockLookupGatedLead.mockRejectedValueOnce(new Error('db down'));
    await expect(
      sendQuizMarketOverviewMagicLink({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        businessType: 'operator',
      })
    ).resolves.toBeUndefined();
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });
});
