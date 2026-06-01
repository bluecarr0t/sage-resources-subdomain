import {
  finalizeChartSourceBreakdown,
  finalizeChartTransparencyAccum,
  finalizeUnclassifiedAccum,
  createChartTransparencyAccum,
  createUnclassifiedAccum,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

describe('finalizeChartSourceBreakdown', () => {
  it('returns null percentages when no rows used', () => {
    expect(finalizeChartSourceBreakdown({ campspot: 0, roverpass: 0 })).toEqual({
      rowsUsed: 0,
      campspotRows: 0,
      roverpassRows: 0,
      campspotPct: null,
      roverpassPct: null,
    });
  });

  it('computes rounded one-decimal source mix', () => {
    const b = finalizeChartSourceBreakdown({ campspot: 7, roverpass: 3 });
    expect(b.rowsUsed).toBe(10);
    expect(b.campspotRows).toBe(7);
    expect(b.roverpassRows).toBe(3);
    expect(b.campspotPct).toBe(70);
    expect(b.roverpassPct).toBe(30);
  });

  it('percentages sum to 100 for uneven splits', () => {
    const b = finalizeChartSourceBreakdown({ campspot: 1, roverpass: 2 });
    expect(b.campspotPct! + b.roverpassPct!).toBe(100);
  });
});

describe('finalizeChartTransparencyAccum', () => {
  it('materializes every chart key', () => {
    const accum = createChartTransparencyAccum();
    accum.trends.campspot = 4;
    accum.trends.roverpass = 1;
    const map = finalizeChartTransparencyAccum(accum);
    expect(map.trends.rowsUsed).toBe(5);
    expect(map.regionalMap.rowsUsed).toBe(0);
  });
});

describe('finalizeUnclassifiedAccum', () => {
  it('totals excluded unclassified rows by source', () => {
    const a = createUnclassifiedAccum();
    a.campspot = 12;
    a.roverpass = 3;
    expect(finalizeUnclassifiedAccum(a)).toEqual({
      unclassifiedExcluded: { campspot: 12, roverpass: 3, total: 15 },
    });
  });
});
