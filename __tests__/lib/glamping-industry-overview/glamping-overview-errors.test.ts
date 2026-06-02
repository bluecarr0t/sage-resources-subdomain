import {
  GlampingOverviewSnapshotMissingError,
  isGlampingOverviewSnapshotMissingError,
} from '@/lib/glamping-industry-overview/glamping-overview-errors';

describe('GlampingOverviewSnapshotMissingError', () => {
  it('is detected by isGlampingOverviewSnapshotMissingError', () => {
    const err = new GlampingOverviewSnapshotMissingError();
    expect(isGlampingOverviewSnapshotMissingError(err)).toBe(true);
    expect(err.code).toBe('GLAMPING_OVERVIEW_SNAPSHOT_MISSING');
  });

  it('is detected when only error.name matches (serialized boundary)', () => {
    const err = new Error('missing');
    err.name = 'GlampingOverviewSnapshotMissingError';
    expect(isGlampingOverviewSnapshotMissingError(err)).toBe(true);
  });
});
