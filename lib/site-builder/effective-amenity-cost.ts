/**
 * Normalize amenity `cost_per_unit` from DB for display and calculations.
 *
 * Deck/patio was historically seeded at $40,500 (typo / wrong basis). Feasibility sync
 * can also ingest line items that are project totals or mis-labeled as per-unit.
 * Per-site deck/patio add-ons in this tool are tiered with picnic furniture and pads—
 * values above ~$12k are treated as erroneous and mapped to the current default.
 */
const DECK_PATIO_CAP = 12_000;
const DECK_PATIO_DEFAULT = 6_500;

export function effectiveAmenityCostPerUnit(slug: string, rawCostPerUnit: unknown): number {
  const n = Number(rawCostPerUnit);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (slug === 'deck-patio' && n > DECK_PATIO_CAP) {
    return DECK_PATIO_DEFAULT;
  }
  return n;
}
