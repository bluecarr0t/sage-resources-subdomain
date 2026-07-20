/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/vercel-cron-auth', () => ({
  authorizeVercelCronRequest: jest.fn(() => true),
}));

jest.mock('@/lib/quickbooks', () => ({
  isQuickbooksAppConfigured: jest.fn(() => true),
  loadQuickbooksConnection: jest.fn(async () => ({
    realmId: 'realm-1',
    refreshToken: 'refresh',
    accessToken: 'access',
    accessTokenExpiresAt: null,
    connectedAt: null,
    updatedAt: null,
    source: 'env',
  })),
  remapMatchingInvoices: jest.fn(async () => ({
    dryRun: false,
    scanned: 3,
    matched: 1,
    updated: 1,
    skipped: 0,
    errors: 0,
    targetItemId: '42',
    targetItemName: 'Feasibility Study - Outdoor Report',
    results: [],
  })),
}));

import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import {
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  remapMatchingInvoices,
} from '@/lib/quickbooks';
import { GET } from '@/app/api/cron/quickbooks-remap-invoices/route';

describe('GET /api/cron/quickbooks-remap-invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeVercelCronRequest as jest.Mock).mockReturnValue(true);
    (isQuickbooksAppConfigured as jest.Mock).mockReturnValue(true);
    (loadQuickbooksConnection as jest.Mock).mockResolvedValue({
      realmId: 'realm-1',
      refreshToken: 'refresh',
      accessToken: 'access',
      accessTokenExpiresAt: null,
      connectedAt: null,
      updatedAt: null,
      source: 'env',
    });
  });

  it('returns 401 when cron auth fails', async () => {
    (authorizeVercelCronRequest as jest.Mock).mockReturnValue(false);
    const res = await GET(new NextRequest('http://localhost/api/cron/quickbooks-remap-invoices'));
    expect(res.status).toBe(401);
  });

  it('skips when app is not configured', async () => {
    (isQuickbooksAppConfigured as jest.Mock).mockReturnValue(false);
    const res = await GET(new NextRequest('http://localhost/api/cron/quickbooks-remap-invoices'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(remapMatchingInvoices).not.toHaveBeenCalled();
  });

  it('runs live remap for recently updated invoices', async () => {
    const res = await GET(new NextRequest('http://localhost/api/cron/quickbooks-remap-invoices'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.updated).toBe(1);
    expect(remapMatchingInvoices).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: false,
        source: 'cron',
        updatedSince: expect.any(Date),
      })
    );
  });
});
