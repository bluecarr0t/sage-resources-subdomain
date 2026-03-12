/**
 * US state codes for forms (e.g. Create Report Draft)
 */
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

/** Validate US ZIP: 5 digits or 5+4 format */
export function isValidUsZip(zip: string): boolean {
  const trimmed = zip.trim();
  if (!trimmed) return true; // empty is valid (optional field)
  return /^\d{5}(-\d{4})?$/.test(trimmed);
}
