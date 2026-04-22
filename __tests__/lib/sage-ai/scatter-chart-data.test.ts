import {
  buildScatterChartData,
  inferScatterXAxisType,
} from '@/lib/sage-ai/scatter-chart-data';

describe('inferScatterXAxisType', () => {
  it('uses category when x values are string labels', () => {
    const rows = [
      { t: 'Dome', y: 1 },
      { t: 'Safari tent', y: 2 },
    ];
    expect(inferScatterXAxisType(rows, 't')).toBe('category');
  });

  it('uses number when x values are numeric or numeric strings', () => {
    const rows = [
      { t: 1, y: 10 },
      { t: '2', y: 20 },
    ];
    expect(inferScatterXAxisType(rows, 't')).toBe('number');
  });
});

describe('buildScatterChartData', () => {
  it('coerces y from strings, filters null y, and infers category x', () => {
    const rows = [
      { unit_type: 'Dome', rate: '525.5' as string | number | null },
      { unit_type: 'Dome', rate: 300 as string | number | null },
      { unit_type: 'Cabin', rate: null },
    ];
    const { rows: out, xType } = buildScatterChartData(rows, 'unit_type', 'rate');
    expect(xType).toBe('category');
    expect(out).toEqual([
      { unit_type: 'Dome', rate: 525.5 },
      { unit_type: 'Dome', rate: 300 },
    ]);
  });
});
