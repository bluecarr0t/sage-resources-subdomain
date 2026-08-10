/**
 * Tests for POST /api/gated-access/business-type.
 * @jest-environment node
 */

import type { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const mockGetUser = jest.fn();
const mockFindVerifiedGatedLead = jest.fn();
const mockLogGatedContentEvent = jest.fn();
const mockNotifyZapier = jest.fn();
const mockNotifySlack = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseRouteHandlerClient: jest.fn(() => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  })),
}));

jest.mock('@/lib/check-gated-page-access', () => ({
  findVerifiedGatedLead: (...args: unknown[]) => mockFindVerifiedGatedLead(...args),
}));

jest.mock('@/lib/gated-content-events', () => ({
  logGatedContentEvent: (...args: unknown[]) => mockLogGatedContentEvent(...args),
}));

jest.mock('@/lib/zapier-webhook', () => ({
  notifyZapierGatedLead: (...args: unknown[]) => mockNotifyZapier(...args),
}));

jest.mock('@/lib/slack/website-slack-client', () => ({
  notifyMarketOverviewBusinessTypeBackfillSlack: (...args: unknown[]) =>
    mockNotifySlack(...args),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

import { POST } from '@/app/api/gated-access/business-type/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/gated-access/business-type', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const user = {
  id: 'user-1',
  email: 'jane@example.com',
} as User;

const leadMissingType = {
  id: 'lead-1',
  email: 'jane@example.com',
  name: 'Jane Doe',
  firstName: 'Jane',
  lastName: 'Doe',
  businessType: null,
  verifiedAt: '2026-01-15T12:00:00.000Z',
};

describe('POST /api/gated-access/business-type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user } });
    mockFindVerifiedGatedLead.mockResolvedValue(leadMissingType);
    mockLogGatedContentEvent.mockResolvedValue(undefined);
    mockNotifySlack.mockResolvedValue(undefined);

    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'lead-1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        verified_at: '2026-01-15T12:00:00.000Z',
        business_type: 'investor',
      },
      error: null,
    });
    mockSelect.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockEq.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('returns 401 when there is no session', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeRequest({ businessType: 'investor' }));
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid business type', async () => {
    const res = await POST(makeRequest({ businessType: 'not-a-role' }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 when the user has no verified lead', async () => {
    mockFindVerifiedGatedLead.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ businessType: 'investor' }));
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns ok without writing when business_type is already set', async () => {
    mockFindVerifiedGatedLead.mockResolvedValueOnce({
      ...leadMissingType,
      businessType: 'operator',
    });
    const res = await POST(makeRequest({ businessType: 'investor' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, alreadySet: true });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockNotifyZapier).not.toHaveBeenCalled();
  });

  it('saves business_type and syncs Zapier + Slack', async () => {
    const res = await POST(makeRequest({ businessType: 'investor' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(mockUpdate).toHaveBeenCalledWith({ business_type: 'investor' });
    expect(mockEq).toHaveBeenCalledWith('id', 'lead-1');

    expect(mockLogGatedContentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'form_submit',
        email: 'jane@example.com',
        pageSlug: 'glamping-market-overview',
        metadata: expect.objectContaining({
          business_type: 'investor',
          business_type_backfill: true,
        }),
      })
    );

    expect(mockNotifyZapier).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        business_type: 'investor',
        update_source: 'business_type_backfill',
      })
    );

    expect(mockNotifySlack).toHaveBeenCalledWith({
      email: 'jane@example.com',
      name: 'Jane Doe',
      businessType: 'Investor',
    });
  });
});
