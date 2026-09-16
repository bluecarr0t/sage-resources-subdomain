/**
 * Server layout gate for /glamping-market-overview.
 * @jest-environment node
 */

import { Fragment, isValidElement, type ReactElement } from 'react';

const mockGetAccessState = jest.fn();

jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: (key: string) => (key === 'x-pathname' ? '/glamping-market-overview' : null),
  })),
}));

jest.mock('@/lib/glamping-market-overview-access', () => ({
  getGlampingMarketOverviewAccessState: (...args: unknown[]) =>
    mockGetAccessState(...args),
}));

jest.mock('@/components/glamping-industry/GlampingMarketOverviewGatedShell', () => ({
  GlampingMarketOverviewGatedShell: function MockGatedShell() {
    return <div data-testid="gated-shell" />;
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
  });

  it('renders gated shell without page children when access is not verified', async () => {
    mockGetAccessState.mockResolvedValue({
      unlocked: false,
      needsBusinessType: false,
    });

    const child = <span data-testid="metrics">secret metrics</span>;
    const result = await GlampingMarketOverviewLayout({ children: child });

    expect(isValidElement(result)).toBe(true);
    const [, shell] = fragmentChildren(result as ReactElement);
    expect(shell.type).toBe(GlampingMarketOverviewGatedShell);
    expect(shell.props.children).toBeUndefined();
    expect(shell.props.pageSlug).toBe(GATED_PAGE_GLAMPING_MARKET_OVERVIEW);
    expect(shell.props.seoVariant).toBe('overview');
    expect(mockGetAccessState).toHaveBeenCalled();
  });

  it('renders page children when magic-link access is verified', async () => {
    mockGetAccessState.mockResolvedValue({
      unlocked: true,
      needsBusinessType: false,
    });

    const child = <span data-testid="metrics">secret metrics</span>;
    const result = await GlampingMarketOverviewLayout({ children: child });

    expect(isValidElement(result)).toBe(true);
    const parts = fragmentChildren(result as ReactElement);
    expect(parts.at(-1)).toEqual(child);
  });

  it('renders children when access check grants admin bypass', async () => {
    mockGetAccessState.mockResolvedValue({
      unlocked: true,
      needsBusinessType: false,
    });

    const child = <span>metrics</span>;
    const result = await GlampingMarketOverviewLayout({ children: child });

    const parts = fragmentChildren(result as ReactElement);
    expect(parts.at(-1)).toEqual(child);
  });
});
