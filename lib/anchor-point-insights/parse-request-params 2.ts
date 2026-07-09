import { parseDistanceBandsParam } from '@/lib/proximity-utils';
import {
  defaultAreaRadiusMi,
  parseRadiusMiParam,
  resolveProximityAreaFilter,
  type ProximityAreaFilter,
} from './area-filter';

export interface AnchorInsightsRequestFilters {
  stateFilter: string | null;
  distanceBandThresholds: number[] | null;
  areaFilter: ProximityAreaFilter | null;
}

export type ParseAnchorInsightsRequestResult =
  | { ok: true; filters: AnchorInsightsRequestFilters }
  | { ok: false; message: string };

/**
 * Parse shared query params for insights + export routes.
 * When `location` is set, geocodes and builds an area filter (requires resolvable place).
 */
export async function parseAnchorInsightsRequestFilters(searchParams: URLSearchParams): Promise<ParseAnchorInsightsRequestResult> {
  const stateFilter = searchParams.get('state')?.trim().toUpperCase() || null;
  const distanceBandsParam = searchParams.get('distance_bands')?.trim() || null;
  const distanceBandThresholds = parseDistanceBandsParam(distanceBandsParam);

  const location = searchParams.get('location')?.trim() || null;
  if (!location) {
    return {
      ok: true,
      filters: { stateFilter, distanceBandThresholds, areaFilter: null },
    };
  }

  const radiusFromParam = parseRadiusMiParam(searchParams.get('radius_mi'));
  const radiusMi = radiusFromParam ?? defaultAreaRadiusMi(distanceBandThresholds);

  const areaFilter = await resolveProximityAreaFilter(location, radiusMi);
  if (!areaFilter) {
    return {
      ok: false,
      message: `Could not find coordinates for "${location}". Try "City, ST" or a 5-digit ZIP code.`,
    };
  }

  return {
    ok: true,
    filters: { stateFilter, distanceBandThresholds, areaFilter },
  };
}
