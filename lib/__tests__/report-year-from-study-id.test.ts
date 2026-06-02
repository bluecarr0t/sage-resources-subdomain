import { reportYearFromStudyId, resolveReportYear } from '../report-year-from-study-id';

describe('reportYearFromStudyId', () => {
  it('maps YY- prefix to 20YY', () => {
    expect(reportYearFromStudyId('25-101A-01')).toBe('2025');
    expect(reportYearFromStudyId('16-202A-10')).toBe('2016');
    expect(reportYearFromStudyId('24-212A-07__2')).toBe('2024');
  });

  it('returns null for non-matching study ids', () => {
    expect(reportYearFromStudyId('ARG-catskill-ny')).toBeNull();
    expect(reportYearFromStudyId(null)).toBeNull();
    expect(reportYearFromStudyId('')).toBeNull();
  });
});

describe('resolveReportYear', () => {
  it('prefers study-id prefix over report_date', () => {
    expect(resolveReportYear('25-101A-01', '2019-01-01')).toBe('2025');
  });

  it('falls back to report_date year', () => {
    expect(resolveReportYear('ARG-catskill-ny', '2023-06-15')).toBe('2023');
  });
});
