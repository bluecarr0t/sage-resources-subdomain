import {
  paintRvOverviewLegendOnCanvas,
  parseRvOverviewLegendItems,
} from '@/lib/rv-industry-overview/draw-chart-legend-on-canvas';

describe('parseRvOverviewLegendItems', () => {
  it('reads legend rows from data attributes', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <table>
        <tr>
          <td data-rv-legend-item data-rv-legend-kind="line" data-rv-legend-color="#15803d" data-rv-legend-label="2024 ARDR"></td>
          <td data-rv-legend-item data-rv-legend-kind="bar" data-rv-legend-color="#1d4ed8" data-rv-legend-label="2024 Occupancy" data-rv-legend-opacity="0.5"></td>
        </tr>
      </table>
    `;

    expect(parseRvOverviewLegendItems(root)).toEqual([
      { label: '2024 ARDR', kind: 'line', color: '#15803d', opacity: undefined },
      { label: '2024 Occupancy', kind: 'bar', color: '#1d4ed8', opacity: 0.5 },
    ]);
  });
});

describe('paintRvOverviewLegendOnCanvas', () => {
  it('draws without throwing when canvas context is available', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;

    expect(() =>
      paintRvOverviewLegendOnCanvas(
        canvas,
        [
          { label: '2024 ARDR', kind: 'line', color: '#15803d' },
          { label: '2024 Occupancy', kind: 'bar', color: '#1d4ed8' },
          { label: '2025 ARDR', kind: 'line', color: '#7c3aed' },
          { label: '2025 Occupancy', kind: 'bar', color: '#dc2626' },
        ],
        2
      )
    ).not.toThrow();
  });
});
