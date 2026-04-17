/**
 * Sage AI — visualization tools.
 *
 * These tools emit pure-data payloads that the client renders with React
 * components (Recharts for dashboards, Leaflet for maps) instead of running
 * Python via Pyodide. They are lightweight — no DB calls, no external
 * network — because the model is expected to pass the rows/features it has
 * already gathered from other tools.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  dashboardCellSchema,
  dashboardPayloadSchema,
  mapLayerSchema,
  mapPayloadSchema,
  DASHBOARD_CHART_KINDS,
  MAP_MARKER_COLORS,
  DASHBOARD_SCHEMA_VERSION,
  MAP_SCHEMA_VERSION,
  type DashboardPayload,
  type MapPayload,
} from '@/lib/sage-ai/ui-parts';

// We re-use the cell/layer schemas for the tool inputs so the model can
// construct them directly. The output schema is stamped with schema_version
// server-side, so the model never has to remember that constant.
const generateDashboardInputSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(500).optional(),
  cells: z.array(dashboardCellSchema).min(1).max(8),
  footer_note: z.string().max(400).optional(),
});

const visualizeOnMapInputSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(500).optional(),
  layers: z.array(mapLayerSchema).min(1).max(5),
  focus: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      zoom: z.number().int().min(1).max(20).optional(),
    })
    .optional(),
});

export function createVisualizationTools() {
  return {
    generate_dashboard: tool({
      description: `Return a structured, interactive dashboard payload that the Sage UI renders with Recharts.

Use this INSTEAD of generate_python_code when the user wants charts, KPI tiles, or a multi-panel summary. It's much faster than Pyodide, interactive, and works on mobile.

Rules:
- Pass the rows you've already gathered via query_properties / aggregate_properties_v2. Do NOT invent numbers.
- Kinds available: ${DASHBOARD_CHART_KINDS.join(', ')}. Use \`stat\` for big-number KPI tiles.
- Keep \`cells.length\` <= 8. Aim for 2–4 cells for most asks.
- Each chart cell needs \`rows\` plus \`x_key\` and either \`y_keys\` (bar/line/area/scatter) or \`name_key\`+\`value_key\` (pie).
- \`span\` is on a 12-col grid; use 6 for two-up, 12 for full-width, 4 for triple KPI rows.
- Use \`value_format='currency_usd'\` when a series is money and \`'percent'\` when it's a ratio in [0,1].
- Do NOT include PII or raw URLs in cell payloads.`,
      inputSchema: generateDashboardInputSchema,
      execute: async (input) => {
        const payload: DashboardPayload = {
          type: 'dashboard',
          schema_version: DASHBOARD_SCHEMA_VERSION,
          title: input.title,
          description: input.description,
          cells: input.cells,
          footer_note: input.footer_note,
        };
        // Validate defensively — if the model somehow stuffs bad values past
        // the input schema refinements we won't crash the client renderer.
        const parsed = dashboardPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            error: `Invalid dashboard payload: ${parsed.error.message}`,
            data: null,
          };
        }
        return parsed.data;
      },
    }),

    visualize_on_map: tool({
      description: `Return a GeoJSON map payload that the Sage UI renders with Leaflet. Use this for proximity visualizations, multi-property location maps, or anything the user asks to "plot on a map".

Rules:
- Coordinates in each feature MUST be \`[longitude, latitude]\` per the GeoJSON spec — don't swap them.
- Pass results from nearest_attractions / query_properties (with \`near\`) / geocode_property — don't invent coordinates.
- Group features into layers (e.g. one for properties, one for ski resorts). Layers support per-layer color: ${MAP_MARKER_COLORS.join(', ')}.
- Keep total features <= 500.
- Supply \`focus\` only if you have a definite anchor (the property the user asked about); otherwise omit it and the UI will auto-fit to the features.`,
      inputSchema: visualizeOnMapInputSchema,
      execute: async (input) => {
        const payload: MapPayload = {
          type: 'geojson_map',
          schema_version: MAP_SCHEMA_VERSION,
          title: input.title,
          description: input.description,
          layers: input.layers,
          focus: input.focus,
        };
        const parsed = mapPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            error: `Invalid map payload: ${parsed.error.message}`,
            data: null,
          };
        }
        return parsed.data;
      },
    }),
  };
}
