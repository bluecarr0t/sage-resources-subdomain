import { safeRvOverviewExportFileStem } from '@/lib/rv-industry-overview/jpeg-capture';

describe('jpeg export file stems', () => {
  it('normalizes unsafe characters', () => {
    expect(safeRvOverviewExportFileStem('rv industry/overview!!')).toBe('rv-industry-overview');
    expect(safeRvOverviewExportFileStem('---')).toBe('chart');
  });
});
