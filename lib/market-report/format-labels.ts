/**
 * Display formatters used by the Market Report UI and exports. Keep these
 * pure + framework-agnostic so they're reusable from the page, the DOCX
 * exporter, and the cohort CSV builder.
 */

/**
 * Tokens that should preserve a specific casing instead of being title-cased
 * by `humanLabel`. Lower-case keys, presentation casing as values.
 */
const CASING_OVERRIDES: Record<string, string> = {
  rv: 'RV',
  adr: 'ADR',
  ada: 'ADA',
  ev: 'EV',
  wifi: 'WiFi',
  hvac: 'HVAC',
  ac: 'AC',
  tv: 'TV',
  bbq: 'BBQ',
  hd: 'HD',
  hookup: 'Hookup',
  hookups: 'Hookups',
  weekday: 'Weekday',
  weekend: 'Weekend',
};

/**
 * Convert a snake_case or kebab-case database token into a clean, human label.
 *
 *   "winter_weekday"   -> "Winter Weekday"
 *   "rv_in_place"      -> "RV In Place"
 *   "adr"              -> "ADR"
 *   "Cabin"            -> "Cabin"  (already capitalized, untouched)
 *
 * Returns the input unchanged if it already contains spaces and at least
 * one capital letter — assumes upstream has already formatted it.
 */
export function humanLabel(value: string | null | undefined): string {
  if (value == null) return '—';
  const trimmed = value.trim();
  if (!trimmed) return '—';

  // Already-formatted multi-word strings pass through.
  if (/\s/.test(trimmed) && /[A-Z]/.test(trimmed)) return trimmed;

  return trimmed
    .replace(/[_\-/]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const lower = token.toLowerCase();
      if (CASING_OVERRIDES[lower]) return CASING_OVERRIDES[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** USD with no decimals; "—" for nullish/non-finite. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

/**
 * Render an occupancy value as a percentage. Source data is sometimes 0–1
 * (RoverPass) and sometimes 0–100 (Campspot); we infer based on magnitude.
 *   0.62  -> "62%"
 *   62    -> "62%"
 *   null  -> "—"
 */
export function formatOccupancyPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct * 10) / 10}%`;
}

/** Numeric value with a fixed number of decimals (default 1); "—" for nullish. */
export function formatNumber(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}
