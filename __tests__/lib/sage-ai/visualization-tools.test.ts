/**
 * @jest-environment node
 */
import { createVisualizationTools } from '@/lib/sage-ai/visualization-tools';
import {
  isDashboardPayload,
  isMapPayload,
  DASHBOARD_SCHEMA_VERSION,
  MAP_SCHEMA_VERSION,
} from '@/lib/sage-ai/ui-parts';

const execCtx = { messages: [], toolCallId: 't', abortSignal: new AbortController().signal };

describe('generate_dashboard', () => {
  it('returns a stamped dashboard payload for valid cells', async () => {
    const { generate_dashboard } = createVisualizationTools();
    const res = (await generate_dashboard.execute!(
      {
        title: 'ADR by unit type',
        cells: [
          {
            kind: 'bar',
            title: 'Avg daily rate',
            x_key: 'unit_type',
            y_keys: ['avg_daily_rate'],
            rows: [
              { unit_type: 'Cabin', avg_daily_rate: 220 },
              { unit_type: 'Yurt', avg_daily_rate: 180 },
            ],
          },
        ],
      },
      execCtx
    )) as Record<string, unknown>;

    expect(isDashboardPayload(res)).toBe(true);
    expect(res.schema_version).toBe(DASHBOARD_SCHEMA_VERSION);
    expect((res as { footer_note?: string }).footer_note).toBeUndefined();
  });

  it('appends a "No data" hint when a chart cell has empty rows', async () => {
    const { generate_dashboard } = createVisualizationTools();
    const res = (await generate_dashboard.execute!(
      {
        title: 'Empty chart',
        cells: [{ kind: 'line', title: 'Trend', x_key: 'month', y_keys: ['v'], rows: [] }],
      },
      execCtx
    )) as { footer_note?: string };

    expect(res.footer_note).toMatch(/No data/i);
  });

  it('does not require rows for stat cells', async () => {
    const { generate_dashboard } = createVisualizationTools();
    const res = (await generate_dashboard.execute!(
      {
        title: 'KPI',
        cells: [{ kind: 'stat', title: 'Total units', value: 1234 }],
      },
      execCtx
    )) as { footer_note?: string };

    expect(res.footer_note).toBeUndefined();
  });
});

describe('visualize_on_map', () => {
  it('returns a stamped geojson_map payload for valid layers', async () => {
    const { visualize_on_map } = createVisualizationTools();
    const res = (await visualize_on_map.execute!(
      {
        title: 'Nearby properties',
        layers: [
          {
            id: 'props',
            label: 'Properties',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-97.74, 30.27] },
                properties: { name: 'Camp Example' },
              },
            ],
          },
        ],
      },
      execCtx
    )) as Record<string, unknown>;

    expect(isMapPayload(res)).toBe(true);
    expect(res.schema_version).toBe(MAP_SCHEMA_VERSION);
  });
});
