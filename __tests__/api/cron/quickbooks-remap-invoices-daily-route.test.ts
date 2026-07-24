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
    scanned: 10,
    matched: 2,
    updated: 2,
    skipped: 0,
    errors: 0,
    targetItemId: '4',
    targetItemName: 'Feasibility Study - Outdoor Resort',
    targetItems: [
      { id: '4', name: 'Feasibility Study - Outdoor Resort' },
      { id: '5', name: 'Appraisal Services - Outdoor Resort' },
    ],
    results: [],
  })),
}));

import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import {
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  remapMatchingInvoices,
} from '@/lib/quickbooks';
import { GET } from '@/app/api/cron/quickbooks-remap-invoices-daily/route';

describe('GET /api/cron/quickbooks-remap-invoices-daily', () => {
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
    const res = await GET(
      new NextRequest('http://localhost/api/cron/quickbooks-remap-invoices-daily')
    );
    expect(res.status).toBe(401);
  });

  it('runs a full-scan live remap without updatedSince', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/cron/quickbooks-remap-invoices-daily')
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe('daily-full-scan');
    expect(body.updated).toBe(2);
    expect(remapMatchingInvoices).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: false,
        source: 'cron',
        maxPages: 50,
      })
    );
    expect(remapMatchingInvoices).toHaveBeenCalledWith(
      expect.not.objectContaining({
        updatedSince: expect.anything(),
      })
    );
  });
});
