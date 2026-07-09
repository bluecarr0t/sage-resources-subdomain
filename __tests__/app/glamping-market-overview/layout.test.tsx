/**
 * Server layout gate for /glamping-market-overview.
 * @jest-environment node
 */

import { Fragment, isValidElement, type ReactElement } from 'react';

const mockGetUser = jest.fn();
const mockCheckGatedPageAccess = jest.fn();

jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: (key: string) => (key === 'x-pathname' ? '/glamping-market-overview' : null),
  })),
}));

jest.mock('@/lib/supabase-server', () => ({
  createServerClientWithCookies: jest.fn(async () => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
}));

jest.mock('@/lib/check-gated-page-access', () => ({
  checkGatedPageAccess: (...args: unknown[]) => mockCheckGatedPageAccess(...args),
}));

jest.mock('@/components/glamping-industry/GlampingMarketOverviewGatedShell', () => ({
  GlampingMarketOverviewGatedShell: function MockGatedShell({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  },
}));

import GlampingMarketOverviewLayout from '@/app/glamping-market-overview/layout';
import { GlampingMarketOverviewGatedShell } from '@/components/glamping-industry/GlampingMarketOverviewGatedShell';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';

function fragmentChildren(result: ReactElement): ReactElement[] {
  expect(result.type).toBe(Fragment);
  const raw = result.props.children;
  return Array.isArray(raw) ? raw : [raw];
}

describe('GlampingMarketOverviewLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('wraps page in gated shell (real content + modal) when access is not verified', async () => {
    mockCheckGatedPageAccess.mockResolvedValue(false);

    const child = <span data-testid="metrics">secret metrics</span>;
    const result = await GlampingMarketOverviewLayout({ children: child });

    expect(isValidElement(result)).toBe(true);
    const [, shell] = fragmentChildren(result as ReactElement);
    expect(shell.type).toBe(GlampingMarketOverviewGatedShell);
    expect(shell.props.children).toEqual(child);
    expect(shell.props.pageSlug).toBe(GATED_PAGE_GLAMPING_MARKET_OVERVIEW);
    expect(shell.props.seoVariant).toBe('overview');
    expect(mockCheckGatedPageAccess).toHaveBeenCalledWith(
      expect.anything(),
      null,
      GATED_PAGE_GLAMPING_MARKET_OVERVIEW
    );
  });

  it('renders page children when magic-link access is verified', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'jane@example.com',
        },
      },
    });
    mockCheckGatedPageAccess.mockResolvedValue(true);

    const child = <span data-testid="metrics">secret metrics</span>;
    const result = await GlampingMarketOverviewLayout({ children: child });

    expect(isValidElement(result)).toBe(true);
    const [, content] = fragmentChildren(result as ReactElement);
    expect(content).toEqual(child);
  });

  it('renders children when checkGatedPageAccess grants admin bypass', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'admin-1',
          email: 'nick@sageoutdooradvisory.com',
          email_confirmed_at: '2026-01-01T00:00:00Z',
        },
      },
    });
    mockCheckGatedPageAccess.mockResolvedValue(true);

    const child = <span>metrics</span>;
    const result = await GlampingMarketOverviewLayout({ children: child });

    const [, content] = fragmentChildren(result as ReactElement);
    expect(content).toEqual(child);
  });
});
