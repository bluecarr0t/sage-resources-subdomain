import type { CompsV2Candidate } from '@/lib/comps-v2/types';

/**
 * Display count for property-level sites/units: prefer whole-property total, else row unit quantity.
 */
export function candidateTotalUnitsOrSites(c: CompsV2Candidate): number | null {
  const total = c.property_total_sites;
  const qty = c.quantity_of_units;
  if (total != null && total > 0) return Math.round(total);
  if (qty != null && qty > 0) return Math.round(qty);
  if (total != null && Number.isFinite(total)) return Math.round(total);
  if (qty != null && Number.isFinite(qty)) return Math.round(qty);
  return null;
}
