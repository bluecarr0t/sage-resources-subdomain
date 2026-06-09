import type { User } from '@supabase/supabase-js';
import { checkGatedPageAccess } from '@/lib/check-gated-page-access';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';

jest.mock('@/lib/auth-helpers', () => ({
  isAllowedEmailDomain: jest.fn((email: string | null | undefined) =>
    Boolean(email?.endsWith('@sageoutdooradvisory.com'))
  ),
  isManagedUser: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(),
}));

import { isManagedUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/lib/supabase';

const mockIsManagedUser = isManagedUser as jest.MockedFunction<typeof isManagedUser>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;

function mockAdminClient(rows: { id: string } | null) {
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
  };
}

describe('checkGatedPageAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsManagedUser.mockResolvedValue(false);
    mockCreateServerClient.mockReturnValue(mockAdminClient(null) as never);
  });

  it('returns false without a user', async () => {
    await expect(
      checkGatedPageAccess(null, null, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(false);
  });

  it('returns true when a verified lead exists for user_id', async () => {
    mockCreateServerClient.mockReturnValue(mockAdminClient({ id: 'lead-1' }) as never);
    const user = { id: 'user-1', email: 'jane@example.com' } as User;
    await expect(
      checkGatedPageAccess(null, user, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(true);
  });

  it('returns true for active managed_users admin without a lead row', async () => {
    mockIsManagedUser.mockResolvedValue(true);
    const user = {
      id: 'admin-1',
      email: 'nick@sageoutdooradvisory.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
    } as User;
    await expect(
      checkGatedPageAccess(null, user, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(true);
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it('returns false for allowed-domain user not in managed_users', async () => {
    const user = {
      id: 'outsider-1',
      email: 'nick@sageoutdooradvisory.com',
    } as User;
    await expect(
      checkGatedPageAccess(null, user, GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    ).resolves.toBe(false);
  });
});
