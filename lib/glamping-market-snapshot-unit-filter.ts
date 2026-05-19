import { isExcludedGlampingUnitType } from '@/lib/market-report/load-cohort';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

/**
 * Canonical unit labels excluded from `/glamping-market-overview` unit counts,
 * property totals, ADR, and regional breakdowns (after {@link normalizeGlampingUnitTypeForStorage}).
 */
const MARKET_SNAPSHOT_EXCLUDED_CANONICAL = new Set(
  ['Tent Site', 'Tent'].map((s) => s.toLowerCase())
);

const TENT_SITE_RAW = /\btent\s*site(s)?\b/i;

/**
 * True when a row's `unit_type` is RV pad, basic tent camping, or vehicle inventory —
 * not counted on the public glamping market overview.
 */
export function isExcludedGlampingMarketSnapshotUnitType(
  unitTypeRaw: string | null | undefined
): boolean {
  if (unitTypeRaw != null && TENT_SITE_RAW.test(String(unitTypeRaw))) {
    return true;
  }
  if (isExcludedGlampingUnitType(unitTypeRaw)) {
    return true;
  }

  const canonical = normalizeGlampingUnitTypeForStorage(unitTypeRaw);
  if (!canonical) return false;

  return MARKET_SNAPSHOT_EXCLUDED_CANONICAL.has(canonical.toLowerCase());
}
