/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';

jest.mock('@/lib/vercel-cron-auth', () => ({
  authorizeVercelCronRequest: jest.fn(() => true),
}));

const mockSyncAll = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({})),
}));

jest.mock('@/lib/project-pipeline/sync-to-supabase', () => ({
  syncAllProjectPipelineSheetsToSupabase: (...args: unknown[]) => mockSyncAll(...args),
}));

import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import { GET, POST } from '@/app/api/cron/sync-project-pipeline/route';

const successfulResult = {
  sheetId: 'sheet-1',
  sheets: [
    {
      syncRunId: 'run-1',
      sheetId: 'sheet-1',
      sheetName: '2026 Jobs',
      jobsFetched: 10,
      jobsUpserted: 10,
      jobsAdded: 1,
      jobsRemoved: 0,
      lastSyncedAt: '2026-08-24T20:00:00.000Z',
    },
  ],
  failedSheets: [],
  totalJobsFetched: 10,
  totalJobsUpserted: 10,
  totalJobsAdded: 1,
  totalJobsRemoved: 0,
};

describe('vercel.json — project pipeline hourly cron', () => {
  it('schedules /api/cron/sync-project-pipeline every hour', () => {
    const vercelPath = join(__dirname, '../../../vercel.json');
    const vercel = JSON.parse(readFileSync(vercelPath, 'utf8')) as {
      crons?: { path: string; schedule: string }[];
    };
    const entry = vercel.crons?.find((c) => c.path === '/api/cron/sync-project-pipeline');
    expect(entry).toBeDefined();
    expect(entry!.schedule).toBe('30 * * * *');
  });
});

describe('/api/cron/sync-project-pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeVercelCronRequest as jest.Mock).mockReturnValue(true);
    mockSyncAll.mockResolvedValue(successfulResult);
  });

  it('returns 401 when cron auth fails', async () => {
    (authorizeVercelCronRequest as jest.Mock).mockReturnValue(false);
    const res = await GET(new NextRequest('http://localhost/api/cron/sync-project-pipeline'));
    expect(res.status).toBe(401);
  });

  it('returns 200 when every sheet tab synced', async () => {
    const res = await GET(new NextRequest('http://localhost/api/cron/sync-project-pipeline'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.totalJobsUpserted).toBe(10);
    expect(body.failedSheets).toEqual([]);
    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when some year tabs still failed after retry', async () => {
    mockSyncAll.mockResolvedValue({
      ...successfulResult,
      failedSheets: [{ sheetName: '2020', error: 'Quota exceeded' }],
    });

    const res = await POST(new NextRequest('http://localhost/api/cron/sync-project-pipeline', { method: 'POST' }));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.message).toContain('2020: Quota exceeded');
    expect(body.totalJobsUpserted).toBe(10);
  });
});
