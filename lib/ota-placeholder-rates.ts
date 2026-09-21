export const OTA_PLACEHOLDER_RATES = new Set(['1011.5', '1011.50', '1026.67', '705.06']);

export function isOtaPlaceholderRate(val: string | undefined): boolean {
  if (!val?.trim()) return false;
  return OTA_PLACEHOLDER_RATES.has(val.trim());
}
