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

function isTruthyQueryFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function getQueryFlag(
  searchParams: MapSearchParams | undefined,
  ...keys: string[]
): string | undefined {
  if (!searchParams) return undefined;
  for (const key of keys) {
    const raw = searchParams[key];
    if (raw === undefined) continue;
    return Array.isArray(raw) ? raw[0] : raw;
  }
  return undefined;
}

/**
 * Glamping embed (`?embed=1`): national parks off unless `?parks=1` or `?nationalParks=1`.
 * Full map defaults to on; client-work-only view is always off.
 */
export function shouldShowNationalParksInMapView(
  searchParams: MapSearchParams | undefined,
  embedMode: boolean,
  clientWorkOnly: boolean
): boolean {
  if (clientWorkOnly) return false;
  if (!embedMode) return true;
  return isTruthyQueryFlag(getQueryFlag(searchParams, 'parks', 'nationalParks'));
}

/**
 * Glamping embed (`?embed=1`): client work off unless `?clientWork=1`.
 * Full map defaults to on; client-work-only view is always on.
 */
export function shouldShowClientWorkInMapView(
  searchParams: MapSearchParams | undefined,
  embedMode: boolean,
  clientWorkOnly: boolean
): boolean {
  if (clientWorkOnly) return true;
  if (!embedMode) return true;
  return isTruthyQueryFlag(getQueryFlag(searchParams, 'clientWork'));
}

/** Params that must survive filter URL sync (`useMapFilters` router.replace). */
export const MAP_VIEW_QUERY_KEYS = ['embed', 'layer', 'parks', 'nationalParks', 'clientWork'] as const;

export function appendPreservedMapViewParams(
  target: URLSearchParams,
  source: URLSearchParams | MapSearchParams
): void {
  for (const key of MAP_VIEW_QUERY_KEYS) {
    const raw =
      source instanceof URLSearchParams ? source.get(key) : source[key];
    if (raw === undefined) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) target.set(key, value);
  }
}
