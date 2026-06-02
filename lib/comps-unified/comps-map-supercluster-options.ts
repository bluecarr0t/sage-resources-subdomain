/**
 * Supercluster tuning for admin comps maps. Keep in sync with map UX expectations.
 * Do not change these values when optimizing performance — use marker pooling / workers instead.
 */
export const COMPS_MAP_SUPERCLUSTER_OPTIONS = {
  radius: 60,
  maxZoom: 12,
  minPoints: 3,
} as const;

/** Max cluster/leaf markers instantiated per viewport (safety cap). */
export const COMPS_MAP_MAX_MARKERS_PER_VIEWPORT = 4_000;

/** Debounce marker sync while the map is moving (ms). */
export const COMPS_MAP_RENDER_DEBOUNCE_MS = 72;
