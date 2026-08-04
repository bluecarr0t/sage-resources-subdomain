import { formatSubmissionTimestamp } from '@/lib/project-pipeline/format-submission-timestamp';

describe('formatSubmissionTimestamp', () => {
  it('formats summer DST as Mountain / Central on the same calendar day', () => {
    // 2026-08-03 06:48 UTC = 12:48 AM MDT / 1:48 AM CDT
    expect(formatSubmissionTimestamp('2026-08-03T06:48:00.000Z')).toBe(
      'Monday, August 3, 2026 at 12:48 AM MDT / 1:48 AM CDT'
    );
  });

  it('formats winter standard time as MST / CST', () => {
    // 2026-01-15 19:30 UTC = 12:30 PM MST / 1:30 PM CST
    expect(formatSubmissionTimestamp('2026-01-15T19:30:00.000Z')).toBe(
      'Thursday, January 15, 2026 at 12:30 PM MST / 1:30 PM CST'
    );
  });

  it('shows both full date labels when Mountain and Central fall on different days', () => {
    // 2026-08-04 05:30 UTC = Mon Aug 3 11:30 PM MDT / Tue Aug 4 12:30 AM CDT
    expect(formatSubmissionTimestamp('2026-08-04T05:30:00.000Z')).toBe(
      'Monday, August 3, 2026 at 11:30 PM MDT / Tuesday, August 4, 2026 at 12:30 AM CDT'
    );
  });

  it('returns the raw value for invalid dates', () => {
    expect(formatSubmissionTimestamp('not-a-date')).toBe('not-a-date');
  });
});
