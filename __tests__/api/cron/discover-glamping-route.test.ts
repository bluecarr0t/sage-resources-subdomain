/**
 * Tests for /api/cron/discover-glamping (Vercel Cron uses GET).
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cron/discover-glamping/route';
import { spawnSync } from 'child_process';

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

function successSpawnResult(): ReturnType<typeof spawnSync> {
  return {
    status: 0,
    stdout: 'Glamping Discovery Pipeline\nDiscovery run complete',
    stderr: '',
    signal: null,
    output: [],
    pid: 12345,
    error: undefined,
  } as ReturnType<typeof spawnSync>;
}

describe('/api/cron/discover-glamping', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.CRON_SECRET;
    mockSpawnSync.mockReturnValue(successSpawnResult());
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it('GET returns 200 and runs discovery script (Vercel cron)', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Tavily');
    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
    expect(mockSpawnSync.mock.calls[0][0]).toBe('npx');
    expect(mockSpawnSync.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['tsx', expect.stringMatching(/discover-glamping-from-news\.ts$/), '--tavily', '--limit', '1'])
    );
  });

  it('POST returns 200 and runs the same script', async () => {
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when CRON_SECRET is set and Authorization is missing', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token does not match CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'expected';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
      headers: { Authorization: 'Bearer wrong' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it('returns 200 when Bearer token matches CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'expected';
    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
      headers: { Authorization: 'Bearer expected' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the script exits with non-zero status', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSpawnSync.mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'Missing TAVILY_API_KEY',
      signal: null,
      output: [],
      pid: 12345,
      error: undefined,
    } as ReturnType<typeof spawnSync>);

    const req = new NextRequest('https://example.com/api/cron/discover-glamping', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    errSpy.mockRestore();
  });
});
