/**
 * County GDP from `county-gdp.gdp_2023` is stored in **thousands of chained dollars**
 * (see `scripts/create-county-gdp-table.sql`). Use this helper everywhere we show GDP
 * in prose so labels match the map layer and BEA semantics.
 */
export function formatCountyGdpThousands(thousands: number): string {
  const t = thousands;
  if (!Number.isFinite(t)) return '—';
  const abs = Math.abs(t);
  if (abs >= 1_000_000) {
    return `$${(t / 1_000_000).toFixed(1)}B`;
  }
  return `$${(t / 1000).toFixed(1)}M`;
}
