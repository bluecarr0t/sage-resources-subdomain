import type { AnchorType, InsightsData, PropertyTypeFilter } from '@/app/admin/proximity-insights/types';

/** Align with server `CACHE_TTL_SECONDS` (5 minutes). */
export const PROXIMITY_INSIGHTS_SESSION_CACHE_MS = 5 * 60 * 1000;

const STORAGE_KEY_PREFIX = 'proximity-insights-v1:';

/** Minimal surface used from `useSearchParams()` for building cache keys. */
export type SearchParamsLike = Pick<URLSearchParams, 'get'>;

export type ProximityInsightsSessionPayload =
  | { mode: 'single'; insights: InsightsData }
  | { mode: 'compare'; insights_a: InsightsData; insights_b: InsightsData };

export type ProximityInsightsSessionEntry = { savedAt: number } & ProximityInsightsSessionPayload;

export function buildProximityInsightsApiQueryString(opts: {
  searchParams: SearchParamsLike;
  compareMode: boolean;
  anchorType: AnchorType;
  propertyTypeFilter: PropertyTypeFilter;
  stateFilter: string | null;
  anchorFilter: { id?: number; slug?: string } | null;
}): string {
  const { searchParams, compareMode, anchorType, propertyTypeFilter, stateFilter, anchorFilter } = opts;
  const params = new URLSearchParams();
  params.set('type', propertyTypeFilter);
  if (stateFilter) params.set('state', stateFilter);
  const appliedBands = searchParams.get('distance_bands')?.trim();
  if (appliedBands) params.set('distance_bands', appliedBands);

  if (compareMode) {
    params.set('compare', 'true');
    params.set('anchor_a_type', searchParams.get('anchor_a_type') || 'ski');
    params.set('anchor_b_type', searchParams.get('anchor_b_type') || 'national-parks');
    const aId = searchParams.get('anchor_a_id');
    const aSlug = searchParams.get('anchor_a_slug');
    const bId = searchParams.get('anchor_b_id');
    const bSlug = searchParams.get('anchor_b_slug');
    if (aId) params.set('anchor_a_id', aId);
    if (aSlug) params.set('anchor_a_slug', aSlug);
    if (bId) params.set('anchor_b_id', bId);
    if (bSlug) params.set('anchor_b_slug', bSlug);
  } else {
    params.set('anchor_type', anchorType);
    if (anchorFilter?.id != null) params.set('anchor_id', String(anchorFilter.id));
    if (anchorFilter?.slug) params.set('anchor_slug', anchorFilter.slug);
  }

  return params.toString();
}

function storageKey(queryString: string): string {
  return `${STORAGE_KEY_PREFIX}${queryString}`;
}

export function readProximityInsightsSessionCache(
  queryString: string,
  maxAgeMs: number
): ProximityInsightsSessionEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(queryString));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProximityInsightsSessionEntry;
    if (!parsed || typeof parsed.savedAt !== 'number' || !parsed.mode) return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) return null;
    if (parsed.mode === 'single' && parsed.insights) return parsed;
    if (parsed.mode === 'compare' && parsed.insights_a && parsed.insights_b) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeProximityInsightsSessionCache(
  queryString: string,
  payload: ProximityInsightsSessionPayload
): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: ProximityInsightsSessionEntry = { savedAt: Date.now(), ...payload };
    sessionStorage.setItem(storageKey(queryString), JSON.stringify(entry));
  } catch {
    // Quota or private mode — ignore
  }
}
