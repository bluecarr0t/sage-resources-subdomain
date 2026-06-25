import type { UnifiedCompRow } from '@/lib/comps-unified/build-row';

/**
 * One unit count for list + expanded detail — prefers `quantity_of_units` (`num_units`),
 * then `property_total_sites` (`total_sites`). Matches glamping market snapshot rules.
 */
export function unifiedCompDisplayUnits(
  row: Pick<UnifiedCompRow, 'num_units' | 'total_sites'>
): number | null {
  const nu = row.num_units;
  if (nu != null && Number.isFinite(nu) && nu > 0) return Math.round(nu);

  const ts = row.total_sites;
  if (ts != null && Number.isFinite(ts) && ts > 0) return Math.round(ts);

  if (nu != null && Number.isFinite(nu)) return Math.round(nu);
  if (ts != null && Number.isFinite(ts)) return Math.round(ts);
  return null;
}
