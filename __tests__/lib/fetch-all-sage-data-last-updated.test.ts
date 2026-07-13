import {
  parseDateUpdatedMs,
  parseTimestampMs,
  resolveAllSageDataLastUpdatedIso,
} from '@/lib/fetch-all-sage-data-last-updated';

describe('all_sage_data last-updated helpers', () => {
  it('parses ISO timestamps', () => {
    expect(parseTimestampMs('2026-07-13T16:05:12.573Z')).toBe(
      Date.parse('2026-07-13T16:05:12.573Z')
    );
    expect(parseTimestampMs(null)).toBeNull();
    expect(parseTimestampMs('')).toBeNull();
  });

  it('parses YYYY-MM-DD date_updated as UTC midnight', () => {
    expect(parseDateUpdatedMs('2026-07-13')).toBe(Date.parse('2026-07-13T00:00:00.000Z'));
    expect(parseDateUpdatedMs('not-a-date')).toBeNull();
  });

  it('picks the newest of updated_at, created_at, and date_updated', () => {
    expect(
      resolveAllSageDataLastUpdatedIso({
        updatedAt: '2026-05-26T00:00:00.000Z',
        createdAt: '2026-06-01T00:00:00.000Z',
        dateUpdated: '2026-07-13',
        nowMs: Date.parse('2020-01-01T00:00:00.000Z'),
      })
    ).toBe('2026-07-13T00:00:00.000Z');

    expect(
      resolveAllSageDataLastUpdatedIso({
        updatedAt: '2026-07-13T16:05:12.573Z',
        createdAt: '2026-07-10T00:00:00.000Z',
        dateUpdated: '2026-07-12',
      })
    ).toBe('2026-07-13T16:05:12.573Z');
  });
});
