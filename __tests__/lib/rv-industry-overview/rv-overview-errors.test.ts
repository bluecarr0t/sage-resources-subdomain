import {
  RvOverviewSnapshotMissingError,
  isRvOverviewSnapshotMissingError,
} from '@/lib/rv-industry-overview/rv-overview-errors';

describe('RvOverviewSnapshotMissingError', () => {
  it('is detected by isRvOverviewSnapshotMissingError', () => {
    const err = new RvOverviewSnapshotMissingError();
    expect(isRvOverviewSnapshotMissingError(err)).toBe(true);
    expect(err.code).toBe('RV_OVERVIEW_SNAPSHOT_MISSING');
  });
});
