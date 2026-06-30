import { resolveProjectPipelineSyncJobsAdded } from '@/lib/project-pipeline/sync-success-message';

describe('resolveProjectPipelineSyncJobsAdded', () => {
  it('reads single-sheet added counts', () => {
    expect(resolveProjectPipelineSyncJobsAdded({ jobsAdded: 12 })).toBe(12);
    expect(resolveProjectPipelineSyncJobsAdded({ jobsAdded: 0 })).toBe(0);
  });

  it('reads sync-all added counts', () => {
    expect(
      resolveProjectPipelineSyncJobsAdded({
        syncAll: true,
        totalJobsAdded: 7,
      })
    ).toBe(7);
  });
});
