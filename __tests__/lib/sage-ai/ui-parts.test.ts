/**
 * @jest-environment node
 */
import {
  dashboardPayloadSchema,
  mapPayloadSchema,
  isDashboardPayload,
  isMapPayload,
  DASHBOARD_SCHEMA_VERSION,
  MAP_SCHEMA_VERSION,
} from '@/lib/sage-ai/ui-parts';
import { createSageAiTools } from '@/lib/sage-ai/tools';

const fakeSupabase = {
  from: () => ({
    insert: async () => ({ data: null, error: null }),
  }),
} as unknown as Parameters<typeof createSageAiTools>[0];

describe('visualizationToolsEnabled registration', () => {
  it('is off by default', () => {
    const tools = createSageAiTools(fakeSupabase, { userId: 'u1' });
    expect(Object.keys(tools)).not.toContain('generate_dashboard');
    expect(Object.keys(tools)).not.toContain('visualize_on_map');
  });

  it('registers both tools when enabled', () => {
    const tools = createSageAiTools(fakeSupabase, {
      userId: 'u1',
      visualizationToolsEnabled: true,
    });
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining(['generate_dashboard', 'visualize_on_map'])
    );
  });
});

describe('isDashboardPayload / isMapPayload type guards', () => {
  it('accepts valid dashboard payloads', () => {
    const payload = {
      type: 'dashboard',
      schema_version: DASHBOARD_SCHEMA_VERSION,
      title: 'TX Glamping',
      cells: [
        {
          kind: 'stat',
          title: 'Total properties',
          value: 42,
          span: 4,
        },
      ],
    };
    expect(isDashboardPayload(payload)).toBe(true);
    expect(isDashboardPayload({ type: 'not-a-dashboard' })).toBe(false);
    expect(isDashboardPayload(null)).toBe(false);
    expect(isDashboardPayload(undefined)).toBe(false);
  });

  it('accepts valid map payloads', () => {
    const payload = {
      type: 'geojson_map',
      schema_version: MAP_SCHEMA_VERSION,
      title: 'Properties near Fredericksburg',
      layers: [
        {
          id: 'props',
          label: 'Properties',
          color: 'sage' as const,
          features: [
            {
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [-98.87, 30.27] },
              properties: { name: 'Example Ranch' },
            },
          ],
        },
      ],
    };
    expect(isMapPayload(payload)).toBe(true);
    expect(isMapPayload({ type: 'dashboard' })).toBe(false);
  });
});

describe('generate_dashboard tool', () => {
  it('returns the payload with a stamped schema_version', async () => {
    const tools = createSageAiTools(fakeSupabase, {
      userId: 'u1',
      visualizationToolsEnabled: true,
    }) as unknown as Record<
      string,
      { execute: (args: unknown, ctx: unknown) => Promise<unknown> }
    >;
    const out = (await tools.generate_dashboard.execute(
      {
        title: 'Dashboard',
        cells: [
          {
            kind: 'stat',
            title: 'Total',
            value: 10,
            span: 6,
            value_format: 'number',
          },
        ],
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as unknown;
    expect(isDashboardPayload(out)).toBe(true);
    const parsed = dashboardPayloadSchema.safeParse(out);
    expect(parsed.success).toBe(true);
  });
});

describe('visualize_on_map tool', () => {
  it('returns a GeoJSON payload with properly ordered coords', async () => {
    const tools = createSageAiTools(fakeSupabase, {
      userId: 'u1',
      visualizationToolsEnabled: true,
    }) as unknown as Record<
      string,
      { execute: (args: unknown, ctx: unknown) => Promise<unknown> }
    >;
    const out = (await tools.visualize_on_map.execute(
      {
        title: 'Map',
        layers: [
          {
            id: 'props',
            label: 'Properties',
            color: 'sage',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-98.87, 30.27] },
                properties: { name: 'Example' },
              },
            ],
          },
        ],
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as unknown;
    expect(isMapPayload(out)).toBe(true);
    const parsed = mapPayloadSchema.safeParse(out);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.layers[0].features[0].geometry.coordinates).toEqual([
        -98.87, 30.27,
      ]);
    }
  });
});
