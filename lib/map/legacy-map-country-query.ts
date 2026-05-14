/**
 * Legacy map URLs used `?country=United+States&country=Canada` when the dataset was
 * effectively North America only. Those links should behave like "all countries"
 * now that the map is worldwide.
 */
export function isLegacyUsCanadaOnlyCountryQuery(countries: string[]): boolean {
  if (countries.length !== 2) return false;
  const normalized = new Set(countries.map((c) => c.trim()));
  return normalized.size === 2 && normalized.has('United States') && normalized.has('Canada');
}
