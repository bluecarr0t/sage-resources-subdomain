/**
 * Tests for /api/cron/discover-glamping (Vercel Cron uses GET).
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';

const mockSearchGlampingNews = jest.fn();
const mockGetRssArticleTasks = jest.fn();
const mockFetchArticleContent = jest.fn();
const mockGetDatabasePropertyNames = jest.fn();
const mockProcessDiscoveryArticle = jest.fn();

jest.mock('@/lib/glamping-discovery', () => ({
  searchGlampingNews: (...args: unknown[]) => mockSearchGlampingNews(...args),
  getRssArticleTasks: (...args: unknown[]) => mockGetRssArticleTasks(...args),
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

describe('vercel.json — glamping discovery cron', () => {
  it('schedules /api/cron/discover-glamping weekly on Mondays at 15:00 UTC', () => {
    const vercelPath = join(__dirname, '../../../vercel.json');
    const vercel = JSON.parse(readFileSync(vercelPath, 'utf8')) as {
      crons?: { path: string; schedule: string }[];
    };
    const entry = vercel.crons?.find((c) => c.path === '/api/cron/discover-glamping');
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe('0 15 * * 1');
  });
});

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
      { url: 'https://news.example.com/tavily-a' },
    ]);
    mockGetRssArticleTasks.mockResolvedValue([
      {
        url: 'https://news.example.com/rss-a',
        discoverySource: 'Google News RSS',
      },
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

  it('GET runs Tavily and RSS and persists two run metric rows', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.metrics.tavily.propertiesInserted).toBe(1);
    expect(body.metrics.rss.propertiesInserted).toBe(1);
    expect(mockSearchGlampingNews).toHaveBeenCalledTimes(1);
    expect(mockSearchGlampingNews).toHaveBeenCalledWith('tvly-test', 1, 'default');
    expect(mockGetRssArticleTasks).toHaveBeenCalledTimes(1);
    expect(mockGetRssArticleTasks).toHaveBeenCalledWith(10);
    expect(mockFetchArticleContent).toHaveBeenCalledTimes(2);
    expect(mockProcessDiscoveryArticle).toHaveBeenCalledTimes(2);
    expect(mockSupabaseInsert).toHaveBeenCalledTimes(2);
  });

  it('GET ?canada=1 uses Canada Tavily query set and insert defaults', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping?canada=1', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockSearchGlampingNews).toHaveBeenCalledWith('tvly-test', 1, 'canada');
    expect(mockProcessDiscoveryArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        insertDefaults: { defaultCountry: 'Canada' },
        discoverySource: 'Tavily Search (Canada)',
      })
    );
    expect(mockProcessDiscoveryArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        discoverySource: 'Google News RSS (Canada)',
      })
    );
  });

  it('GET ?rssOnly=1 skips Tavily and does not require TAVILY_API_KEY', async () => {
    delete process.env.TAVILY_API_KEY;
    const req = new NextRequest('https://example.com/api/cron/discover-glamping?rssOnly=1', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockSearchGlampingNews).not.toHaveBeenCalled();
    expect(mockGetRssArticleTasks).toHaveBeenCalledTimes(1);
    expect(mockSupabaseInsert).toHaveBeenCalledTimes(1);
  });

  it('GET ?tavilyOnly=1 skips RSS', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping?tavilyOnly=1', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockSearchGlampingNews).toHaveBeenCalledTimes(1);
    expect(mockGetRssArticleTasks).not.toHaveBeenCalled();
    expect(mockSupabaseInsert).toHaveBeenCalledTimes(1);
  });

  it('POST runs the same handler', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSearchGlampingNews).toHaveBeenCalledTimes(1);
    expect(mockGetRssArticleTasks).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when CRON_SECRET is set and request is not authorized', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockSearchGlampingNews).not.toHaveBeenCalled();
    expect(mockGetRssArticleTasks).not.toHaveBeenCalled();
  });

  it('returns 200 when CRON_SECRET is set but Vercel cron header is present (no Bearer)', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
      headers: { 'x-vercel-cron': '1' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockSearchGlampingNews).toHaveBeenCalled();
    expect(mockGetRssArticleTasks).toHaveBeenCalled();
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
    expect(mockGetRssArticleTasks).toHaveBeenCalledTimes(1);
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

  it('returns 500 when both Tavily and RSS passes fail', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSearchGlampingNews.mockRejectedValueOnce(new Error('Tavily down'));
    mockGetRssArticleTasks.mockRejectedValueOnce(new Error('RSS down'));
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Tavily down');
    expect(body.error).toContain('RSS down');
    expect(mockSupabaseInsert).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });

  it('returns 200 with warnings when only Tavily fails', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSearchGlampingNews.mockRejectedValueOnce(new Error('Tavily down'));
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.warnings).toEqual(expect.arrayContaining([expect.stringContaining('tavily')]));
    expect(body.metrics.rss.propertiesInserted).toBe(1);
    errSpy.mockRestore();
  });
});
