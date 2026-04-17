/**
 * Sage AI — typed UI payloads returned by rich-rendering tools.
 *
 * These shapes are shared between server-side tools (generate_dashboard,
 * visualize_on_map) and the client-side renderers (CanvasDashboard, SageAiMap).
 * Keeping them in one module prevents drift and gives us a single place to
 * evolve the contract.
 *
 * Each payload carries a `type` discriminator that the client uses to pick a
 * renderer, and a `schema_version` so we can evolve shapes without breaking
 * historical messages in the database.
 */
import { z } from 'zod';

export const DASHBOARD_SCHEMA_VERSION = 1 as const;
export const MAP_SCHEMA_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Dashboard (Recharts-backed canvas)
// ---------------------------------------------------------------------------

export const DASHBOARD_CHART_KINDS = [
  'bar',
  'line',
  'area',
  'pie',
  'scatter',
  'stat',
] as const;
export type DashboardChartKind = (typeof DASHBOARD_CHART_KINDS)[number];

/**
 * One cell on the dashboard grid. Cells are laid out left-to-right, top-to-
 * bottom; `span` is the column width on a 12-column grid. `kind='stat'` is a
 * single big number + label (no chart).
 */
export const dashboardCellSchema = z.object({
  kind: z.enum(DASHBOARD_CHART_KINDS),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  span: z.number().int().min(3).max(12).default(6),
  // `stat` cells
  value: z.union([z.string(), z.number()]).optional(),
  delta: z
    .object({
      value: z.number(),
      label: z.string().max(60).optional(),
      direction: z.enum(['up', 'down', 'neutral']).default('neutral'),
    })
    .optional(),
  // chart cells
  x_key: z.string().max(80).optional(),
  y_keys: z.array(z.string().max(80)).max(6).optional(),
  series: z
    .array(
      z.object({
        key: z.string().max(80),
        label: z.string().max(120).optional(),
        color: z.string().max(32).optional(),
      })
    )
    .max(6)
    .optional(),
  rows: z
    .array(z.record(z.string(), z.union([z.string(), z.number(), z.null()])))
    .max(500)
    .optional(),
  // pie
  name_key: z.string().max(80).optional(),
  value_key: z.string().max(80).optional(),
  // formatting hints
  value_format: z
    .enum(['number', 'currency_usd', 'percent', 'count'])
    .default('number')
    .optional(),
});

export type DashboardCell = z.infer<typeof dashboardCellSchema>;

export const dashboardPayloadSchema = z.object({
  type: z.literal('dashboard'),
  schema_version: z.literal(DASHBOARD_SCHEMA_VERSION),
  title: z.string().min(1).max(140),
  description: z.string().max(500).optional(),
  cells: z.array(dashboardCellSchema).min(1).max(8),
  footer_note: z.string().max(400).optional(),
});

export type DashboardPayload = z.infer<typeof dashboardPayloadSchema>;

// ---------------------------------------------------------------------------
// Map (GeoJSON-backed Leaflet canvas)
// ---------------------------------------------------------------------------

export const MAP_MARKER_COLORS = [
  'sage',
  'blue',
  'orange',
  'red',
  'purple',
  'gray',
] as const;
export type MapMarkerColor = (typeof MAP_MARKER_COLORS)[number];

/**
 * A point feature in a Sage map layer. Coordinates are `[lng, lat]` per the
 * GeoJSON spec — do NOT swap them to Leaflet's `[lat, lng]` order here; the
 * renderer will convert.
 */
export const mapFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: z.object({
    type: z.literal('Point'),
    // `z.tuple` emits JSON Schema OpenAI rejects for tools; length-2 array is equivalent.
    coordinates: z.array(z.number()).length(2),
  }),
  properties: z
    .object({
      name: z.string().max(200),
      subtitle: z.string().max(300).optional(),
      url: z.string().url().optional(),
      color: z.enum(MAP_MARKER_COLORS).optional(),
      value: z.union([z.string(), z.number()]).optional(),
    })
    .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export type MapFeature = z.infer<typeof mapFeatureSchema>;

export const mapLayerSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  color: z.enum(MAP_MARKER_COLORS).default('sage'),
  features: z.array(mapFeatureSchema).max(500),
});

export type MapLayer = z.infer<typeof mapLayerSchema>;

export const mapPayloadSchema = z.object({
  type: z.literal('geojson_map'),
  schema_version: z.literal(MAP_SCHEMA_VERSION),
  title: z.string().min(1).max(140),
  description: z.string().max(500).optional(),
  layers: z.array(mapLayerSchema).min(1).max(5),
  // If set, the map centers and zooms on this point; otherwise the renderer
  // auto-fits to feature bounds.
  focus: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      zoom: z.number().int().min(1).max(20).default(6).optional(),
    })
    .optional(),
});

export type MapPayload = z.infer<typeof mapPayloadSchema>;

// ---------------------------------------------------------------------------
// Type guards for client-side narrowing of unknown tool outputs.
// ---------------------------------------------------------------------------

export function isDashboardPayload(value: unknown): value is DashboardPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'dashboard' &&
    (value as { schema_version?: unknown }).schema_version ===
      DASHBOARD_SCHEMA_VERSION
  );
}

export function isMapPayload(value: unknown): value is MapPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'geojson_map' &&
    (value as { schema_version?: unknown }).schema_version ===
      MAP_SCHEMA_VERSION
  );
}
