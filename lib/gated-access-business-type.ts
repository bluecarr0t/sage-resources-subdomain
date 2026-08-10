/**
 * Single-select “I am a…” options for gated Market Overview lead capture.
 * Stable slug values for CRM / Slack / Zapier; labels for the gate UI.
 */

export const GATED_ACCESS_BUSINESS_TYPES = [
  'investor',
  'developer',
  'operator',
  'lender',
  'unit_supplier',
  'consultant',
  'media',
  'other',
] as const;

export type GatedAccessBusinessType = (typeof GATED_ACCESS_BUSINESS_TYPES)[number];

const BUSINESS_TYPE_SET = new Set<string>(GATED_ACCESS_BUSINESS_TYPES);

/** True when `value` is a known gated-access business type slug. */
export function isGatedAccessBusinessType(
  value: unknown
): value is GatedAccessBusinessType {
  return typeof value === 'string' && BUSINESS_TYPE_SET.has(value);
}

/**
 * Parse a request / metadata value into a business type, or null when missing
 * or invalid (so callers can reject lead submits or skip optional writes).
 */
export function parseGatedAccessBusinessType(
  value: unknown
): GatedAccessBusinessType | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return isGatedAccessBusinessType(trimmed) ? trimmed : null;
}

/** User-facing label for a business type slug. */
export function gatedAccessBusinessTypeLabel(
  value: GatedAccessBusinessType
): string {
  switch (value) {
    case 'investor':
      return 'Investor';
    case 'developer':
      return 'Developer';
    case 'operator':
      return 'Operator';
    case 'lender':
      return 'Lender';
    case 'unit_supplier':
      return 'Unit Supplier';
    case 'consultant':
      return 'Consultant';
    case 'media':
      return 'Media';
    case 'other':
      return 'Other';
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}
