import { industryOverviewSnapshotMetaFromRow } from '@/lib/industry-overview/industry-overview-cache-row';

describe('industryOverviewSnapshotMetaFromRow', () => {
  it('returns absent when row is null', () => {
    expect(industryOverviewSnapshotMetaFromRow(null)).toEqual({
      present: false,
      computedAt: null,
      rowsScanned: null,
    });
  });

  it('returns present when payload exists', () => {
    expect(
      industryOverviewSnapshotMetaFromRow({
        payload: { rowsScannedTotal: 1 },
        computed_at: '2026-06-01T00:00:00.000Z',
        rows_scanned: 42,
      })
    ).toEqual({
      present: true,
      computedAt: '2026-06-01T00:00:00.000Z',
      rowsScanned: 42,
    });
  });

  it('returns present when only computed_at exists', () => {
    expect(
      industryOverviewSnapshotMetaFromRow({
        payload: null,
        computed_at: '2026-06-01T00:00:00.000Z',
        rows_scanned: null,
      })
    ).toEqual({
      present: true,
      computedAt: '2026-06-01T00:00:00.000Z',
      rowsScanned: null,
    });
  });
});
