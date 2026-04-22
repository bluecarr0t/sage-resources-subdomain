import { iqrFences, robustGlampingRateStats } from '@/lib/sage-ai/robust-rate-stats';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

describe('iqrFences', () => {
  it('returns null when there are fewer than 4 values', () => {
    expect(iqrFences([10, 20, 30])).toBeNull();
  });

  it('returns null when IQR is zero (identical values)', () => {
    expect(iqrFences([100, 100, 100, 100])).toBeNull();
  });

  it('returns fences when n>=4 and spread is positive', () => {
    const f = iqrFences([100, 120, 140, 200, 500]);
    expect(f).not.toBeNull();
    expect(f!.low).toBeLessThan(100);
    expect(f!.high).toBeGreaterThan(200);
  });
});

describe('robustGlampingRateStats', () => {
  it('skips IQR and matches plain unit weighting when n<4', () => {
    const r = robustGlampingRateStats([
      { eff: 100, w: 2 },
      { eff: 200, w: 1 },
    ]);
    expect(r.ratedCount).toBe(2);
    expect(r.droppedAsOutliers).toBe(0);
    expect(r.outlierFilterSkipped).toBe(true);
    const exp = (100 * 2 + 200) / 3;
    expect(round2(r.avg!)).toBe(round2(exp));
  });

  it('drops extreme eff values when IQR applies (>=4, spread)', () => {
    const r = robustGlampingRateStats([
      { eff: 150, w: 1 },
      { eff: 160, w: 1 },
      { eff: 170, w: 1 },
      { eff: 10_000, w: 1 },
    ]);
    expect(r.droppedAsOutliers).toBe(1);
    expect(r.outlierFilterSkipped).toBe(false);
    expect(r.avg).toBe(160);
    expect(r.median).toBe(160);
  });

  it('returns nulls for an empty set', () => {
    const r = robustGlampingRateStats([]);
    expect(r.avg).toBeNull();
    expect(r.median).toBeNull();
    expect(r.ratedCount).toBe(0);
  });
});
