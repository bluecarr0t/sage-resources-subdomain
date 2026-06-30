import { resolveProjectPipelineSyncSuccessCounts } from '@/lib/project-pipeline/sync-success-message';

describe('resolveProjectPipelineSyncSuccessCounts', () => {
  it('reads single-sheet sync counts', () => {
    expect(
      resolveProjectPipelineSyncSuccessCounts({
        jobsUpserted: 1000,
        jobsAdded: 12,
      })
    ).toEqual({ total: 1000, added: 12 });
  });

  it('reads sync-all counts', () => {
    expect(
      resolveProjectPipelineSyncSuccessCounts({
        syncAll: true,
        totalJobsUpserted: 1486,
        totalJobsAdded: 7,
      })
    ).toEqual({ total: 1486, added: 7 });
  });
});
