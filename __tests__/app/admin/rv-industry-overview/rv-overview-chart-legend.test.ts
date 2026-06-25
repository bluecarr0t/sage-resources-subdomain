import { sortRvOverviewLegendItems } from '@/lib/rv-industry-overview/chart-legend';

describe('sortRvOverviewLegendItems', () => {
  it('sorts alphabetically by label (Recharts itemSorter: value)', () => {
    const sorted = sortRvOverviewLegendItems([
      { label: '2025 Occupancy', kind: 'bar', color: '#dc2626' },
      { label: '2024 ARDR', kind: 'line', color: '#15803d' },
      { label: '2024 Occupancy', kind: 'bar', color: '#1d4ed8' },
      { label: '2025 ARDR', kind: 'line', color: '#7c3aed' },
    ]);
    expect(sorted.map((i) => i.label)).toEqual([
      '2024 ARDR',
      '2024 Occupancy',
      '2025 ARDR',
      '2025 Occupancy',
    ]);
  });
});
