/**
 * Tests for /api/cron/discover-glamping (Vercel Cron uses GET).
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockSearchGlampingNews = jest.fn();
const mockFetchArticleContent = jest.fn();
const mockGetDatabasePropertyNames = jest.fn();
const mockProcessDiscoveryArticle = jest.fn();

jest.mock('@/lib/glamping-discovery', () => ({
  searchGlampingNews: (...args: unknown[]) => mockSearchGlampingNews(...args),
  fetchArticleContent: (...args: unknown[]) => mockFetchArticleContent(...args),
  getDatabasePropertyNames: (...args: unknown[]) => mockGetDatabasePropertyNames(...args),
  processDiscoveryArticle: (...args: unknown[]) => mockProcessDiscoveryArticle(...args),
}));

const mockSupabaseInsert = jest.fn().mockResolvedValue({ error: null });
const mockSupabaseSelect = jest.fn().mockResolvedValue({ data: [], error: null });

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: () => ({
      insert: (...args: unknown[]) => mockSupabaseInsert(...args),
      select: (...args: unknown[]) => mockSupabaseSelect(...args),
    }),
  })),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({})),
}));

import { GET, POST } from '@/app/api/cron/discover-glamping/route';

describe('/api/cron/discover-glamping', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      OPENAI_API_KEY: 'sk-test',
      TAVILY_API_KEY: 'tvly-test',
    };
    delete process.env.CRON_SECRET;

    mockSearchGlampingNews.mockResolvedValue([
      { url: 'https://news.example.com/a' },
    ]);
    mockFetchArticleContent.mockResolvedValue('article body');
    mockGetDatabasePropertyNames.mockResolvedValue(new Set<string>());
    mockProcessDiscoveryArticle.mockResolvedValue({
      propertiesExtracted: 1,
      propertiesNew: 1,
      propertiesInserted: 1,
      queuedInsertRows: [],
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('GET runs the discovery library and persists run metrics', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.metrics.propertiesInserted).toBe(1);
    expect(mockSearchGlampingNews).toHaveBeenCalledTimes(1);
    expect(mockFetchArticleContent).toHaveBeenCalledTimes(1);
    expect(mockProcessDiscoveryArticle).toHaveBeenCalledTimes(1);
    expect(mockSupabaseInsert).toHaveBeenCalled();
  });

  it('POST runs the same handler', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSearchGlampingNews).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when CRON_SECRET is set and Authorization is missing', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockSearchGlampingNews).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token does not match CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'expected';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
      headers: { Authorization: 'Bearer wrong' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockSearchGlampingNews).not.toHaveBeenCalled();
  });

  it('returns 200 when Bearer token matches CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'expected';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
      headers: { Authorization: 'Bearer expected' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockSearchGlampingNews).toHaveBeenCalledTimes(1);
  });

  it('returns 500 with the missing env vars when keys are not configured', async () => {
    delete process.env.TAVILY_API_KEY;
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('TAVILY_API_KEY');
    expect(mockSearchGlampingNews).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('returns 500 and persists run metrics when the library throws', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSearchGlampingNews.mockRejectedValueOnce(new Error('Tavily down'));
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Tavily down');
    expect(mockSupabaseInsert).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
