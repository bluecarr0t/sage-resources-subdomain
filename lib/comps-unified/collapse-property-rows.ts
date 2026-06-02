/**
 * Collapse site/unit matview rows to one row per property (source + address_key).
 * Mirrors map marker dedupe in `app/api/admin/comps/unified/geo/route.ts`.
 */

import type { UnifiedCompRow } from '@/lib/comps-unified/build-row';
import { unifiedPropertyGroupKey } from '@/lib/comps-unified/sage-property-group-key';

export function propertyGroupKey(
  row: Pick<UnifiedCompRow, 'source' | 'address_key' | 'id' | 'sage_property_id'>
): string {
  return unifiedPropertyGroupKey(row);
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mergeKeywords(rows: UnifiedCompRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    for (const kw of r.amenity_keywords ?? []) {
      const t = String(kw ?? '').trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function mergeUnitCategories(rows: UnifiedCompRow[]): string[] | null {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.unit_category?.trim()) set.add(r.unit_category.trim());
    for (const c of r.unit_categories ?? []) {
      const t = String(c ?? '').trim();
      if (t) set.add(t);
    }
  }
  return set.size > 0 ? [...set].sort() : null;
}

/** Distinct non-empty unit_type labels across site rows (display order preserved). */
export function collectMergedUnitTypes(
  rows: ReadonlyArray<Pick<UnifiedCompRow, 'unit_type'>>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const t = r.unit_type?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function formatMergedUnitTypesSummary(unitTypes: string[]): string | null {
  if (unitTypes.length === 0) return null;
  if (unitTypes.length === 1) return unitTypes[0];
  return `${unitTypes.length} unit types`;
}

function mergePropertyGroup(rows: UnifiedCompRow[]): UnifiedCompRow {
  if (rows.length === 1) {
    const only = rows[0];
    const unitTypes = collectMergedUnitTypes(rows);
    return {
      ...only,
      site_rows: rows.length > 1 ? rows : undefined,
      unit_type: formatMergedUnitTypesSummary(unitTypes) ?? only.unit_type,
    };
  }

  const sorted = [...rows].sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    if (tb !== ta) return tb - ta;
    return a.id.localeCompare(b.id);
  });
  const first = sorted[0];

  let maxSites: number | null = null;
  let sumUnits = 0;
  let anyUnit = false;
  let minLow: number | null = null;
  let maxPeak: number | null = null;
  const adrs: number[] = [];
  let minLowOcc: number | null = null;
  let maxPeakOcc: number | null = null;
  let maxQuality: number | null = null;
  let website: string | null = null;
  let glampingYes = false;

  for (const r of rows) {
    const ts = numOrNull(r.total_sites);
    if (ts !== null) maxSites = maxSites === null ? ts : Math.max(maxSites, ts);

    const nu = numOrNull(r.num_units);
    if (nu !== null) {
      sumUnits += nu;
      anyUnit = true;
    }

    const low = numOrNull(r.low_adr);
    if (low !== null) minLow = minLow === null ? low : Math.min(minLow, low);

    const peak = numOrNull(r.peak_adr);
    if (peak !== null) maxPeak = maxPeak === null ? peak : Math.max(maxPeak, peak);

    const adr = numOrNull(r.avg_adr);
    if (adr !== null) adrs.push(adr);

    const lo = numOrNull(r.low_occupancy);
    if (lo !== null) minLowOcc = minLowOcc === null ? lo : Math.min(minLowOcc, lo);

    const po = numOrNull(r.peak_occupancy);
    if (po !== null) maxPeakOcc = maxPeakOcc === null ? po : Math.max(maxPeakOcc, po);

    const q = numOrNull(r.quality_score);
    if (q !== null) maxQuality = maxQuality === null ? q : Math.max(maxQuality, q);

    if (!website && r.website_url?.trim()) website = r.website_url.trim();

    if (String(r.is_glamping_property ?? '').trim().toLowerCase() === 'yes') glampingYes = true;
  }

  const unitTypes = collectMergedUnitTypes(rows);

  return {
    ...first,
    unit_type: formatMergedUnitTypesSummary(unitTypes),
    unit_categories: mergeUnitCategories(rows),
    total_sites: maxSites,
    num_units: anyUnit ? sumUnits : null,
    low_adr: minLow,
    peak_adr: maxPeak,
    avg_adr: adrs.length > 0 ? adrs.reduce((a, b) => a + b, 0) / adrs.length : first.avg_adr,
    low_occupancy: minLowOcc,
    peak_occupancy: maxPeakOcc,
    quality_score: maxQuality,
    website_url: website,
    is_glamping_property: glampingYes ? 'Yes' : first.is_glamping_property,
    amenity_keywords: mergeKeywords(rows),
    site_rows: rows,
  };
}

/** One list row per property (source + address_key). */
export function collapseUnifiedCompRowsToProperties(rows: UnifiedCompRow[]): UnifiedCompRow[] {
  const groups = new Map<string, UnifiedCompRow[]>();
  for (const r of rows) {
    const key = propertyGroupKey(r);
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  return [...groups.values()].map((g) => mergePropertyGroup(g));
}
