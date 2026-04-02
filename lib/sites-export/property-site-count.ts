import { parseNum } from '@/lib/comps-v2/geo';
import { siteCountForPropertyExport } from '@/lib/comps-v2/export-expand';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import type { SiteExportTable } from '@/lib/sites-export/constants';

/**
 * Site expansion count from a raw DB row (same rules as Comps v2 export).
 */
export function siteCountForPropertyExportFromRaw(
  table: SiteExportTable,
  raw: Record<string, unknown>
): number {
  const c = {
    source_table: table,
    quantity_of_units: parseNum(raw.quantity_of_units),
    property_total_sites: parseNum(raw.property_total_sites),
  } as CompsV2Candidate;
  return siteCountForPropertyExport(c);
}
