import { reportYearFromStudyId } from '../report-year-from-study-id';

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
