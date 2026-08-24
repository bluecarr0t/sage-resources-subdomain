/**
 * @jest-environment node
 */

import {
  acquireReportJobLock,
  releaseReportJobLock,
} from '@/lib/report-job-lock';

jest.mock('@/lib/redis', () => ({
  isRedisConnected: () => false,
  setIfNotExists: jest.fn(async () => false),
  deleteCache: jest.fn(async () => undefined),
}));

describe('acquireReportJobLock memory fallback', () => {
  const lockId = `jest-report-job-${Date.now()}`;

  afterEach(async () => {
    await releaseReportJobLock(lockId);
  });

  it('does not treat Redis-down as already locked, then blocks a second holder', async () => {
    const first = await acquireReportJobLock(lockId, 30);
    expect(first).toBe(true);

    const second = await acquireReportJobLock(lockId, 30);
    expect(second).toBe(false);

    await releaseReportJobLock(lockId);
    const third = await acquireReportJobLock(lockId, 30);
    expect(third).toBe(true);
  });
});
