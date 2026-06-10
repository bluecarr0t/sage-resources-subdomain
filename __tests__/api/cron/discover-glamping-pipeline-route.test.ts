/**
 * Tests for /api/cron/discover-glamping-pipeline (Vercel Cron uses GET).
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';

const mockRunWeeklyPipelineSync = jest.fn();

jest.mock('@/lib/glamping-pipeline', () => ({
  runWeeklyPipelineSync: (...args: unknown[]) => mockRunWeeklyPipelineSync(...args),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({})),
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({})),
}));

import { GET, POST } from '@/app/api/cron/discover-glamping-pipeline/route';

describe('vercel.json — glamping pipeline cron', () => {
  it('schedules /api/cron/discover-glamping-pipeline weekly on Mondays at 16:00 UTC', () => {
    const vercelPath = join(__dirname, '../../../vercel.json');
    const vercel = JSON.parse(readFileSync(vercelPath, 'utf8')) as {
      crons?: { path: string; schedule: string }[];
    };
    const entry = vercel.crons?.find(
      (c) => c.path === '/api/cron/discover-glamping-pipeline'
    );
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe('0 16 * * 1');
  });
});

describe('/api/cron/discover-glamping-pipeline', () => {
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

    mockRunWeeklyPipelineSync.mockResolvedValue({
      metrics: {
        dryRun: false,
        startedAt: '2026-06-10T16:00:00.000Z',
        completedAt: '2026-06-10T16:05:00.000Z',
        articlesFound: 3,
        articlesFetched: 2,
        articlesFailed: 0,
        propertiesExtracted: 1,
        propertiesNew: 1,
        propertiesInserted: 1,
        statusUpdatesDetected: 0,
        statusUpdatesApplied: 0,
        processedUrlsCount: 2,
      },
      error: null,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 without cron auth', async () => {
    process.env.CRON_SECRET = 'secret';
    const res = await GET(
      new NextRequest('http://localhost/api/cron/discover-glamping-pipeline')
    );
    expect(res.status).toBe(401);
  });

  it('runs pipeline sync on GET with vercel cron header', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/cron/discover-glamping-pipeline?limit=3', {
        headers: { 'x-vercel-cron': '1' },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRunWeeklyPipelineSync).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'tvly-test',
      expect.objectContaining({ limitPerQuery: 3, dryRun: false, force: false })
    );
  });

  it('supports dryRun via POST', async () => {
    const res = await POST(
      new NextRequest(
        'http://localhost/api/cron/discover-glamping-pipeline?dryRun=1&force=1',
        {
          method: 'POST',
          headers: { 'x-vercel-cron': '1' },
        }
      )
    );
    expect(res.status).toBe(200);
    expect(mockRunWeeklyPipelineSync).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'tvly-test',
      expect.objectContaining({ dryRun: true, force: true })
    );
  });

  it('returns 500 when sync reports an error', async () => {
    mockRunWeeklyPipelineSync.mockResolvedValue({
      metrics: { dryRun: false },
      error: 'Tavily failed',
    });

    const res = await GET(
      new NextRequest('http://localhost/api/cron/discover-glamping-pipeline', {
        headers: { 'x-vercel-cron': '1' },
      })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Tavily failed');
  });
});
