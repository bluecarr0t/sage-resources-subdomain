const DEFAULT_OVERVIEW_ZOOM = 4;

/** Stable key so marker sync can skip when idle fires without a meaningful viewport change. */
export function compsMapViewportRenderKey(
  map: google.maps.Map,
  overviewZoom = DEFAULT_OVERVIEW_ZOOM
): string | null {
  const bounds = map.getBounds();
  if (!bounds) return null;
  const zoom = Math.round(map.getZoom() ?? overviewZoom);
  const r = (n: number) => n.toFixed(4);
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return `${zoom}:${r(sw.lng())},${r(sw.lat())},${r(ne.lng())},${r(ne.lat())}`;
}
