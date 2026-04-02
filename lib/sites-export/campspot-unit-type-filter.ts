/**
 * Sites export unit-type filter values aligned with Campspot site-type categories.
 * UI sends these tokens; {@link expandSitesExportUnitTypesForQuery} maps them to
 * common `unit_type` spellings stored per table.
 */
export const SITES_EXPORT_UNIT_TYPE_FILTER_VALUES = ['Lodging', 'Tent Sites', 'RV Site'] as const;

export type SitesExportUnitTypeFilterValue = (typeof SITES_EXPORT_UNIT_TYPE_FILTER_VALUES)[number];

/**
 * Maps UI/API filter tokens to database `unit_type` strings for `.in(...)`.
 * Unknown strings pass through for backwards compatibility (e.g. legacy API clients).
 */
export function expandSitesExportUnitTypesForQuery(selected: string[]): string[] {
  if (selected.length === 0) return [];
  const out = new Set<string>();
  for (const s of selected) {
    const t = s.trim();
    if (!t) continue;
    if (t === 'Tent Sites') {
      for (const v of ['Tent Site', 'Tent Sites', 'Tent']) out.add(v);
      continue;
    }
    if (t === 'RV Site') {
      for (const v of ['RV Site', 'RV Sites']) out.add(v);
      continue;
    }
    if (t === 'Lodging') {
      out.add('Lodging');
      continue;
    }
    out.add(t);
  }
  return [...out];
}
