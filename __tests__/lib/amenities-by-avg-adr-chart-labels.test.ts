import {
  amenityAdrDiffRounded,
  diffLabelCenterX,
  diffLabelFill,
  diffLabelTopY,
  formatAdrDiff,
} from '@/app/admin/rv-industry-overview/AmenitiesByAvgAdrChart';

describe('AmenitiesByAvgAdrChart diff labels', () => {
  it('formats positive and negative diffs', () => {
    expect(formatAdrDiff(96)).toBe('+$96');
    expect(formatAdrDiff(-3)).toBe('-$3');
    expect(formatAdrDiff(0)).toBe('$0');
  });

  it('uses green for positive and red for negative', () => {
    expect(diffLabelFill(1)).toBe('#15803d');
    expect(diffLabelFill(-1)).toBe('#dc2626');
    expect(diffLabelFill(0)).toBe('#111827');
  });

  it('centers between grouped bars', () => {
    expect(diffLabelCenterX(10, 40, 4)).toBe(52);
  });

  it('places y at the taller bar top', () => {
    const yWithout = 80;
    const hWithout = 100;
    const yTopHigherWithout = diffLabelTopY(yWithout, hWithout, 200, 150);
    expect(yTopHigherWithout).toBe(80);

    const yTopHigherWith = diffLabelTopY(yWithout, hWithout, 150, 200);
    expect(yTopHigherWith).toBeCloseTo(46.67, 1);
  });

  it('resolves diff from averages when diffRounded is null', () => {
    expect(
      amenityAdrDiffRounded({
        diffRounded: null,
        withNull: false,
        withoutNull: false,
        withAdr: 281,
        withoutAdr: 185,
      })
    ).toBe(96);
  });
});
