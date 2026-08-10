/**
 * @jest-environment node
 */

import type { User } from '@supabase/supabase-js';

const mockGetUser = jest.fn();
const mockIsManagedUser = jest.fn();
const mockFindVerifiedGatedLead = jest.fn();

jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

jest.mock('@/lib/supabase-server', () => ({
  createServerClientWithCookies: jest.fn(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  })),
}));

jest.mock('@/lib/auth-helpers', () => ({
  isAllowedEmailDomain: jest.fn((email: string | null | undefined) =>
    Boolean(email?.endsWith('@sageoutdooradvisory.com'))
  ),
  isManagedUser: (...args: unknown[]) => mockIsManagedUser(...args),
}));

jest.mock('@/lib/check-gated-page-access', () => ({
  findVerifiedGatedLead: (...args: unknown[]) => mockFindVerifiedGatedLead(...args),
}));

import { getGlampingMarketOverviewAccessState } from '@/lib/glamping-market-overview-access';

describe('getGlampingMarketOverviewAccessState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsManagedUser.mockResolvedValue(false);
    mockFindVerifiedGatedLead.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('returns locked when there is no session', async () => {
    await expect(getGlampingMarketOverviewAccessState()).resolves.toEqual({
      unlocked: false,
      needsBusinessType: false,
    });
  });

  it('unlocks managed admins without prompting for business type', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'admin-1',
          email: 'nick@sageoutdooradvisory.com',
        } as User,
      },
    });
    mockIsManagedUser.mockResolvedValue(true);

    await expect(getGlampingMarketOverviewAccessState()).resolves.toEqual({
      unlocked: true,
      needsBusinessType: false,
    });
    expect(mockFindVerifiedGatedLead).not.toHaveBeenCalled();
  });

  it('requires business type when a verified lead is missing it', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'jane@example.com' } as User,
      },
    });
    mockFindVerifiedGatedLead.mockResolvedValue({
      id: 'lead-1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      businessType: null,
      verifiedAt: '2026-01-15T12:00:00.000Z',
    });

    await expect(getGlampingMarketOverviewAccessState()).resolves.toEqual({
      unlocked: true,
      needsBusinessType: true,
    });
  });

  it('does not prompt when business type is already set', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'jane@example.com' } as User,
      },
    });
    mockFindVerifiedGatedLead.mockResolvedValue({
      id: 'lead-1',
      email: 'jane@example.com',
      name: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      businessType: 'investor',
      verifiedAt: '2026-01-15T12:00:00.000Z',
    });

    await expect(getGlampingMarketOverviewAccessState()).resolves.toEqual({
      unlocked: true,
      needsBusinessType: false,
    });
  });
});
