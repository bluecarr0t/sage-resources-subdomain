'use client';

import {
  sortRvOverviewLegendItems,
  type RvOverviewLegendItem,
} from '@/lib/rv-industry-overview/chart-legend';

export type { RvOverviewLegendItem };
export { sortRvOverviewLegendItems };

const LEGEND_ITEM_GAP_PX = 32;
const SWATCH_LABEL_GAP_PX = 8;

function LineSwatch({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 20,
        height: 10,
        verticalAlign: 'middle',
        paddingRight: SWATCH_LABEL_GAP_PX,
        opacity,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: SWATCH_LABEL_GAP_PX,
          top: '50%',
          height: 3,
          marginTop: -1.5,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 8,
          height: 8,
          marginLeft: -4,
          marginTop: -4,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          border: `2px solid ${color}`,
          boxSizing: 'border-box',
        }}
      />
    </span>
  );
}

function BarSwatch({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        backgroundColor: color,
        borderRadius: 2,
        verticalAlign: 'middle',
        paddingRight: SWATCH_LABEL_GAP_PX,
        opacity,
      }}
    />
  );
}

/**
 * HTML legend below the chart (outside Recharts). Uses a table layout because html2canvas
 * collapses margins between inline-block legend items during JPEG export.
 */
export default function RvOverviewChartLegend({ items }: { items: RvOverviewLegendItem[] }) {
  if (items.length === 0) return null;

  const sorted = sortRvOverviewLegendItems(items);

  return (
    <div
      className="rv-overview-html-legend"
      style={{
        width: '100%',
        paddingTop: 12,
        textAlign: 'center',
      }}
    >
      <table
        aria-hidden
        className="rv-overview-html-legend-table"
        style={{
          display: 'inline-table',
          margin: '0 auto',
          borderCollapse: 'separate',
          borderSpacing: `${LEGEND_ITEM_GAP_PX}px 0`,
        }}
      >
        <tbody>
          <tr>
            {sorted.map((item) => (
              <td
                key={item.label}
                className="rv-overview-html-legend-item"
                data-rv-legend-item
                data-rv-legend-kind={item.kind}
                data-rv-legend-color={item.color}
                data-rv-legend-label={item.label}
                data-rv-legend-opacity={item.opacity ?? 1}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#1f2937',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'middle',
                  textAlign: 'left',
                }}
              >
                {item.kind === 'line' ? (
                  <LineSwatch color={item.color} opacity={item.opacity} />
                ) : (
                  <BarSwatch color={item.color} opacity={item.opacity} />
                )}
                <span style={{ verticalAlign: 'middle' }}>{item.label}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
