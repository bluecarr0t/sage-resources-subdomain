import type { SupabaseClient, User } from '@supabase/supabase-js';
import { checkGatedPageAccess } from '@/lib/check-gated-page-access';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';

jest.mock('@/lib/auth-helpers', () => ({
  isAllowedEmailDomain: jest.fn((email: string | null | undefined) =>
    Boolean(email?.endsWith('@sageoutdooradvisory.com'))
  ),
  isManagedUser: jest.fn(),
}));

import { isManagedUser } from '@/lib/auth-helpers';

const mockIsManagedUser = isManagedUser as jest.MockedFunction<typeof isManagedUser>;

function mockSupabase(rows: { id: string } | null) {
  const chain = {
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => chain),
    })),
    _chain: chain,
  } as unknown as SupabaseClient & { _chain: typeof chain };
}

describe('checkGatedPageAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsManagedUser.mockResolvedValue(false);
  });

  it('returns false without a user', async () => {
    const supabase = mockSupabase(null);
    await expect(
      checkGatedPageAccess(supabase, null, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(false);
  });

  it('returns true when a verified lead exists for user_id', async () => {
    const supabase = mockSupabase({ id: 'lead-1' });
    const user = { id: 'user-1', email: 'jane@example.com' } as User;
    await expect(
      checkGatedPageAccess(supabase, user, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(true);
  });

  it('returns true for active managed_users admin without a lead row', async () => {
    mockIsManagedUser.mockResolvedValue(true);
    const supabase = mockSupabase(null);
    const user = {
      id: 'admin-1',
      email: 'nick@sageoutdooradvisory.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
    } as User;
    await expect(
      checkGatedPageAccess(supabase, user, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns false for allowed-domain user not in managed_users', async () => {
    const supabase = mockSupabase(null);
    const user = {
      id: 'outsider-1',
      email: 'nick@sageoutdooradvisory.com',
    } as User;
    await expect(
      checkGatedPageAccess(supabase, user, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(false);
  });
});
