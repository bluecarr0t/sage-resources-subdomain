/**
 * Normalize `all_glamping_properties.state` for Canadian rows to a two-letter province/territory code.
 */

const CA_CODES = new Set([
  'BC',
  'AB',
  'SK',
  'MB',
  'ON',
  'QC',
  'NS',
  'NB',
  'PE',
  'NL',
  'YT',
  'NT',
  'NU',
]);

const CA_FULL_TO_CODE: Record<string, string> = {
  'british columbia': 'BC',
  alberta: 'AB',
  saskatchewan: 'SK',
  manitoba: 'MB',
  ontario: 'ON',
  quebec: 'QC',
  québec: 'QC',
  'nova scotia': 'NS',
  'new brunswick': 'NB',
  'prince edward island': 'PE',
  pei: 'PE',
  'newfoundland and labrador': 'NL',
  newfoundland: 'NL',
  labrador: 'NL',
  yukon: 'YT',
  'northwest territories': 'NT',
  nunavut: 'NU',
};

/** Two-letter code → display name for UI. */
export const CA_PROVINCE_DISPLAY_NAME: Record<string, string> = {
  BC: 'British Columbia',
  AB: 'Alberta',
  SK: 'Saskatchewan',
  MB: 'Manitoba',
  ON: 'Ontario',
  QC: 'Quebec',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  PE: 'Prince Edward Island',
  NL: 'Newfoundland and Labrador',
  YT: 'Yukon',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
};

export function normalizeCaProvinceToCode(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const u = t.toUpperCase();
  if (CA_CODES.has(u)) return u;
  const k = t.toLowerCase();
  return CA_FULL_TO_CODE[k] ?? null;
}
