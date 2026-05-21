/** Query params for map routes (Next.js `searchParams`). */
export type MapSearchParams = Record<string, string | string[] | undefined>;

export function getMapEmbedParam(
  searchParams: MapSearchParams | undefined
): string | undefined {
  const raw = searchParams?.embed;
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

/** True when `?embed=1` (or `true` / `yes`) — WordPress homepage iframe and similar embeds. */
export function isMapEmbedMode(searchParams: MapSearchParams | undefined): boolean {
  const value = getMapEmbedParam(searchParams);
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function getMapLayerParam(
  searchParams: MapSearchParams | undefined
): string | undefined {
  const raw = searchParams?.layer;
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Client Work–only map view (`?layer=client-work`).
 * Use with `?embed=1` for a separate WordPress iframe; works on full `/map` too.
 */
export function isMapClientWorkOnlyLayer(searchParams: MapSearchParams | undefined): boolean {
  const value = getMapLayerParam(searchParams);
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  return normalized === 'client-work' || normalized === 'clientwork';
}
