import { linkifyPastReportRefsInMarkdown } from '@/lib/sage-ai/linkify-past-report-refs';

describe('linkifyPastReportRefsInMarkdown', () => {
  it('wraps bare study ids in markdown links', () => {
    expect(linkifyPastReportRefsInMarkdown('See report 26-100A-01 for details.')).toBe(
      'See report [26-100A-01](/admin/reports/26-100A-01) for details.'
    );
  });

  it('wraps /admin/reports paths using the study id as link text', () => {
    expect(linkifyPastReportRefsInMarkdown('Open /admin/reports/26-100A-01 now.')).toBe(
      'Open [26-100A-01](/admin/reports/26-100A-01) now.'
    );
  });

  it('does not double-wrap ids inside URL paths', () => {
    const once = linkifyPastReportRefsInMarkdown('/admin/reports/26-100A-01');
    expect(once).toBe('[26-100A-01](/admin/reports/26-100A-01)');
    expect(linkifyPastReportRefsInMarkdown(once)).toBe(once);
  });

  it('does not wrap study id inside existing markdown link text', () => {
    const md = '[26-100A-01](/admin/reports/26-100A-01)';
    expect(linkifyPastReportRefsInMarkdown(md)).toBe(md);
  });
});
