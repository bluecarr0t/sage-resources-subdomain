import unitTypesData from '@/docs/unit-types.json';
import { SITES_EXPORT_UNIT_TYPE_FILTER_VALUES } from '@/lib/sites-export/campspot-unit-type-filter';
import type { SiteExportTable } from '@/lib/sites-export/constants';

const HIPCAMP_SAGE_UNIT_TYPES: string[] = unitTypesData.unitTypes as string[];

/** Common RoverPass `site_type` → `unit_type` values (snake_case). */
const ROVERPASS_UNIT_TYPES: string[] = [
  'rv_site',
  'tent',
  'cabin',
  'glamping',
  'tiny_home',
  'overnight_camping',
  'storage',
];

/**
 * Union of `unit_type` filter tokens for all selected export tables (deduped, sorted).
 * Used when “All” sources or multiple sources are selected.
 */
export function sitesExportMergedUnitTypeOptionValues(tables: SiteExportTable[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const table of tables) {
    for (const v of sitesExportUnitTypeOptionValuesForTable(table)) {
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  return out;
}

/**
 * `unit_type` filter values shown in Sites export for one source table.
 */
export function sitesExportUnitTypeOptionValuesForTable(table: SiteExportTable): string[] {
  switch (table) {
    case 'campspot':
      return [...SITES_EXPORT_UNIT_TYPE_FILTER_VALUES];
    case 'hipcamp':
    case 'all_glamping_properties':
      return [...HIPCAMP_SAGE_UNIT_TYPES];
    case 'all_roverpass_data_new':
      return [...ROVERPASS_UNIT_TYPES];
    default:
      return [];
  }
}

/** Display label for RoverPass slug options (value stays snake_case for the query). */
export function labelRoverpassUnitTypeSlug(slug: string): string {
  return slug
    .split('_')
    .map((w) => {
      if (!w.length) return w;
      if (w.toLowerCase() === 'rv') return 'RV';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}
