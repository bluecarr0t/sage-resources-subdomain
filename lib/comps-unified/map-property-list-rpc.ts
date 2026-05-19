import type { UnifiedCompRow } from '@/lib/comps-unified/build-row';
import { collapseUnifiedCompRowsToProperties } from '@/lib/comps-unified/collapse-property-rows';

function parseSiteRows(raw: unknown): UnifiedCompRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is UnifiedCompRow => r != null && typeof r === 'object');
}

/** Map `unified_comps_list_properties` RPC rows to merged property list rows. */
export function mapPropertyListRpcToUnifiedRows(
  data: unknown
): UnifiedCompRow[] {
  if (!Array.isArray(data)) return [];
  const siteGroups: UnifiedCompRow[][] = [];

  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { anchor?: unknown; site_rows?: unknown };
    const siteRows = parseSiteRows(row.site_rows);
    if (siteRows.length > 0) {
      siteGroups.push(siteRows);
      continue;
    }
    if (row.anchor && typeof row.anchor === 'object') {
      siteGroups.push([row.anchor as UnifiedCompRow]);
    }
  }

  return siteGroups.map((g) => collapseUnifiedCompRowsToProperties(g)[0]).filter(Boolean);
}
