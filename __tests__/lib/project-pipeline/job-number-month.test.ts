import {
  formatProjectPipelineJobNumberMonthLabel,
  parseProjectPipelineJobNumberMonth,
} from '@/lib/project-pipeline/job-number-month';

describe('parseProjectPipelineJobNumberMonth', () => {
  it('parses year and month from job numbers like 26-215A-06', () => {
    expect(parseProjectPipelineJobNumberMonth('26-215A-06')).toEqual({
      year: 2026,
      month: 6,
      sortKey: 202606,
    });
  });

  it('returns null for invalid month suffix', () => {
    expect(parseProjectPipelineJobNumberMonth('26-215A-13')).toBeNull();
    expect(parseProjectPipelineJobNumberMonth('')).toBeNull();
  });
});

describe('formatProjectPipelineJobNumberMonthLabel', () => {
  it('formats month labels', () => {
    expect(formatProjectPipelineJobNumberMonthLabel(2026, 6)).toBe('Jun 2026');
  });
});
