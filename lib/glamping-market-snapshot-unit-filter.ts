import { isExcludedGlampingUnitType } from '@/lib/market-report/load-cohort';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

/**
 * Canonical unit labels excluded from `/glamping-market-overview` (and Brands)
 * unit counts, property totals, ADR, and regional breakdowns (after
 * {@link normalizeGlampingUnitTypeForStorage}).
 *
 * Includes non-structure camping / lodging SKUs that are not glamping product
 * (tent pads, RV pads, hotel rooms, suites, property buyouts, generic trailers).
 * Glamping trailers such as Vintage Trailer / Airstream stay included.
 * Eco-suite stays included (not bare Suite).
 * "Property buyout" is not a canonical type — legacy strings still match PROPERTY_BUYOUT_RAW.
 */
const MARKET_SNAPSHOT_EXCLUDED_CANONICAL = new Set(
  [
    'Tent Site',
    'Campsite',
    'Camping',
    'RV',
    'Hotel Room',
    'Trailer',
    'Suite',
    /** Retired catch-all — exclude until remapped to Bell / Safari / Cabin Tent / Tipi. */
    'Canvas Tent',
  ].map((s) => s.toLowerCase())
);

const TENT_SITE_RAW = /\btent\s*site(s)?\b/i;
/** Legacy bare "Tent"/"Tents" rows — exclude from overview. */
const BARE_TENT_RAW = /^\s*tents?\s*$/i;
/** Retired catch-all label (also excluded when normalize returns null). */
const CANVAS_TENT_RAW = /^\s*canvas\s*tents?\s*$/i;
const CAMPSITE_RAW = /\bcamp\s*sites?\b|\bcamping\s*sites?\b/i;
const HOTEL_ROOM_RAW = /\bhotel\s*rooms?\b/i;
/** Bare "Suite" / "Suites" — not Eco-suite / Eco Suite. */
const BARE_SUITE_RAW = /^\s*suites?\s*$/i;
const PROPERTY_BUYOUT_RAW = /\bproperty\s*buy[- ]?outs?\b/i;
/** Bare "RV" / "RVs" — not "RV Site" (handled via {@link isExcludedGlampingUnitType}). */
const BARE_RV_RAW = /^\s*rvs?\s*$/i;
/** Bare "Trailer" — not Vintage Trailer / Teardrop trailer product labels. */
const BARE_TRAILER_RAW = /^\s*trailers?\s*$/i;

/**
 * True when a row's `unit_type` is RV pad, basic tent camping, hotel room,
 * suite, property buyout, generic trailer, or other non-glamping inventory —
 * not counted on the public glamping market overview or Brands rankings.
 */
export function isExcludedGlampingMarketSnapshotUnitType(
  unitTypeRaw: string | null | undefined
): boolean {
  if (unitTypeRaw != null) {
    const raw = String(unitTypeRaw);
    if (TENT_SITE_RAW.test(raw)) return true;
    if (BARE_TENT_RAW.test(raw)) return true;
    if (CANVAS_TENT_RAW.test(raw)) return true;
    if (CAMPSITE_RAW.test(raw)) return true;
    if (HOTEL_ROOM_RAW.test(raw)) return true;
    if (BARE_SUITE_RAW.test(raw)) return true;
    if (PROPERTY_BUYOUT_RAW.test(raw)) return true;
    if (BARE_RV_RAW.test(raw)) return true;
    if (BARE_TRAILER_RAW.test(raw)) return true;
  }
  if (isExcludedGlampingUnitType(unitTypeRaw)) {
    return true;
  }

  const canonical = normalizeGlampingUnitTypeForStorage(unitTypeRaw);
  if (!canonical) return false;

  return MARKET_SNAPSHOT_EXCLUDED_CANONICAL.has(canonical.toLowerCase());
}
