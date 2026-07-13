/**
 * Display currency for `/glamping-market-overview`.
 *
 * Canada published rates in `all_sage_data` are predominantly source CAD amounts
 * stored without FX conversion (no `source_currency` / CAD tags on most rows).
 * Until a CAD→USD backfill lands, the Canada market toggle labels and formats
 * rates as CAD so the UI matches the data. US remains USD.
 */

import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

export type GlampingMarketOverviewDisplayCurrency = 'USD' | 'CAD';

export function glampingMarketOverviewDisplayCurrency(
  market: GlampingMarketSnapshotMarket
): GlampingMarketOverviewDisplayCurrency {
  return market === 'ca' ? 'CAD' : 'USD';
}

/** e.g. "$450" or "CA $450" — null → em dash. Provisional → "~$450". */
export function formatGlampingMarketOverviewRate(
  n: number | null,
  market: GlampingMarketSnapshotMarket,
  options?: { provisional?: boolean }
): string {
  if (n == null) return '—';
  let formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: glampingMarketOverviewDisplayCurrency(market),
    maximumFractionDigits: 0,
  }).format(n);
  // en-US CAD renders as "CA$450"; prefer "CA $450" for readability.
  if (market === 'ca') {
    formatted = formatted.replace(/^CA\$/, 'CA $');
  }
  return options?.provisional ? `~${formatted}` : formatted;
}

/** Short footnote under avg. retail daily rate (ARDR) columns. */
export function glampingMarketOverviewRateFootnote(
  market: GlampingMarketSnapshotMarket
): string {
  if (market === 'ca') {
    return 'ARDR (avg. retail daily rate) in CAD when published. Mean and median use operating properties with a recorded nightly rate; all-inclusive / package rates are excluded.';
  }
  return 'ARDR (avg. retail daily rate) in USD when published. Mean and median use operating properties with a recorded nightly rate; all-inclusive / package rates are excluded.';
}

/** Compact currency hint for sidebar / regional panels. */
export function glampingMarketOverviewRateCurrencyHint(
  market: GlampingMarketSnapshotMarket
): string {
  return market === 'ca'
    ? 'ARDR where nightly rates are published (CAD)'
    : 'ARDR where nightly rates are published';
}
