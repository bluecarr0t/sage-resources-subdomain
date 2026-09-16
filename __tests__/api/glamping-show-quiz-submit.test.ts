/**
 * Tests for POST /api/glamping-show-quiz/submit.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockUpsert = jest.fn();
const mockLimit = jest.fn();
const mockInsertResponse = jest.fn();
const mockMarkGhl = jest.fn();
const mockGhlUpsert = jest.fn();
const mockNotifyZapierNewsletterSignup = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: () => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  })),
}));

jest.mock('@/lib/upstash', () => ({
  limit: (...args: unknown[]) => mockLimit(...args),
}));

jest.mock('@/lib/glamping-show-quiz-responses', () => ({
  insertGlampingShowQuizResponse: (...args: unknown[]) => mockInsertResponse(...args),
  markGlampingShowQuizGhlSync: (...args: unknown[]) => mockMarkGhl(...args),
}));

jest.mock('@/lib/ghl/glamping-show-quiz-contact', () => ({
  upsertGhlGlampingShowQuizContact: (...args: unknown[]) => mockGhlUpsert(...args),
}));

jest.mock('@/lib/zapier-webhook', () => ({
  notifyZapierNewsletterSignup: (...args: unknown[]) =>
    mockNotifyZapierNewsletterSignup(...args),
}));

const mockCreateBoothToken = jest.fn();
const mockSendMarketOverviewEmail = jest.fn();

jest.mock('@/lib/gmo-booth-unlock', () => {
  const actual = jest.requireActual<typeof import('@/lib/gmo-booth-unlock')>(
    '@/lib/gmo-booth-unlock'
  );
  return {
    ...actual,
    createGmoBoothUnlockToken: (...args: unknown[]) => mockCreateBoothToken(...args),
  };
});

jest.mock('@/lib/glamping-show-quiz-gmo-email', () => ({
  sendQuizMarketOverviewMagicLink: (...args: unknown[]) =>
    mockSendMarketOverviewEmail(...args),
}));

import { POST } from '@/app/api/glamping-show-quiz/submit/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/glamping-show-quiz/submit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.5',
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'Jane@Example.com',
  company: 'Open Sky',
  region: 'UT',
  phone: '312-555-0199',
  role: 'developer_operator',
  stage: 'has_land',
  need: 'feasibility',
  timeline: '30_days',
};

const ghlPayload = {
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  company: 'Open Sky',
  region: 'UT',
  phone: '312-555-0199',
  answers: {
    role: 'developer_operator',
    stage: 'has_land',
    need: 'feasibility',
    timeline: '30_days',
  },
  outcome: 'ready_now',
};

describe('POST /api/glamping-show-quiz/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 });
    mockUpsert.mockResolvedValue({ error: null });
    mockInsertResponse.mockResolvedValue({ id: 'resp-1' });
    mockMarkGhl.mockResolvedValue(undefined);
    mockGhlUpsert.mockResolvedValue({ status: 'created', contactId: 'ghl-1' });
    mockCreateBoothToken.mockReturnValue('booth-token');
    mockSendMarketOverviewEmail.mockResolvedValue(undefined);
  });

  it('saves the response then awaits a GHL upsert', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, outcome: 'ready_now' });

    expect(mockInsertResponse).toHaveBeenCalledWith({
      ...ghlPayload,
      newsletterOptIn: false,
    });
    expect(mockGhlUpsert).toHaveBeenCalledWith(ghlPayload);
    expect(mockMarkGhl).toHaveBeenCalledWith('resp-1', 'created', {
      contactId: 'ghl-1',
    });
    expect(mockNotifyZapierNewsletterSignup).not.toHaveBeenCalled();
    expect(mockSendMarketOverviewEmail).not.toHaveBeenCalled();
    expect(mockCreateBoothToken).not.toHaveBeenCalled();
  });

  it('records a newsletter signup when opted in', async () => {
    const res = await POST(makeRequest({ ...validBody, newsletterOptIn: true }));
    expect(res.status).toBe(200);
    expect(mockInsertResponse).toHaveBeenCalledWith(
      expect.objectContaining({ newsletterOptIn: true })
    );
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [row] = mockUpsert.mock.calls[0];
    expect(row.email).toBe('jane@example.com');
    expect(row.source).toBe('glamping-show-quiz');
    expect(mockNotifyZapierNewsletterSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        source: 'glamping-show-quiz',
      })
    );
  });

  it('returns 500 when the response cannot be saved', async () => {
    mockInsertResponse.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect(mockGhlUpsert).not.toHaveBeenCalled();
  });

  it('still returns the result when GHL fails after the row is saved', async () => {
    mockGhlUpsert.mockRejectedValueOnce(new Error('GHL down'));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, outcome: 'ready_now' });
    expect(mockMarkGhl).toHaveBeenCalledWith('resp-1', 'failed', {
      error: 'GHL down',
    });
  });

  it('marks GHL skipped when auth config is missing', async () => {
    mockGhlUpsert.mockResolvedValueOnce({ status: 'skipped', contactId: null });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockMarkGhl).toHaveBeenCalledWith('resp-1', 'skipped', {
      error: 'Missing GHL_TOKEN or GHL_LOCATION_ID',
    });
  });

  it('rejects incomplete answers', async () => {
    const res = await POST(makeRequest({ ...validBody, stage: 'unknown' }));
    expect(res.status).toBe(400);
    expect(mockInsertResponse).not.toHaveBeenCalled();
    expect(mockGhlUpsert).not.toHaveBeenCalled();
  });

  it('rejects free-text regions and an empty company', async () => {
    const badRegion = await POST(makeRequest({ ...validBody, region: 'Utah' }));
    expect(badRegion.status).toBe(400);
    expect(mockInsertResponse).not.toHaveBeenCalled();

    const res = await POST(makeRequest({ ...validBody, company: '  ' }));
    expect(res.status).toBe(400);
    expect(mockInsertResponse).not.toHaveBeenCalled();
  });

  it('rejects a missing phone for every outcome', async () => {
    const missing = await POST(makeRequest({ ...validBody, phone: '' }));
    expect(missing.status).toBe(400);
    expect(mockInsertResponse).not.toHaveBeenCalled();

    const exploring = await POST(
      makeRequest({
        ...validBody,
        phone: '',
        role: 'landowner',
        stage: 'idea',
        need: 'exploring',
        timeline: 'no_timeline',
      })
    );
    expect(exploring.status).toBe(400);
    expect(mockInsertResponse).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    mockLimit.mockResolvedValueOnce({ success: false, limit: 5, remaining: 0, reset: 0 });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    expect(mockInsertResponse).not.toHaveBeenCalled();
    expect(mockGhlUpsert).not.toHaveBeenCalled();
  });

  it('emails the overview and returns a booth QR URL for market-data outcomes', async () => {
    const res = await POST(
      makeRequest({
        ...validBody,
        role: 'landowner',
        stage: 'idea',
        need: 'exploring',
        timeline: 'no_timeline',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.outcome).toBe('just_exploring');
    expect(json.marketOverviewUrl).toContain(
      '/api/glamping-show-quiz/open-market-overview'
    );
    expect(json.marketOverviewUrl).toContain('booth=booth-token');
    expect(json.marketOverviewUrl).toContain('utm_content=just_exploring');
    expect(mockSendMarketOverviewEmail).toHaveBeenCalledWith({
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      businessType: 'other',
    });
  });

  it('still returns the result when the magic link send throws', async () => {
    mockSendMarketOverviewEmail.mockRejectedValueOnce(new Error('otp down'));
    const res = await POST(
      makeRequest({
        ...validBody,
        need: 'market_data',
        timeline: '3_to_12_months',
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.outcome).toBe('getting_close');
    expect(json.marketOverviewUrl).toContain('booth=booth-token');
  });
});
