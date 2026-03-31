import type { CompsV2Candidate } from '@/lib/comps-v2/types';

/** Sage Glamping Data, Hipcamp, Campspot: export one row per site (unit). */
export const SOURCES_ONE_ROW_PER_SITE = new Set([
  'all_glamping_properties',
  'hipcamp',
  'campspot',
]);

const MAX_SITES_PER_CANDIDATE = 10_000;

export type CompsV2ExportRow = CompsV2Candidate & {
  /** Row id in export (unique when multiple site rows share one candidate). */
  export_stable_id: string;
  /** 1-based index within this property record’s site group. */
  site_index: number;
  /** Number of export rows generated from this candidate (1 for property-level sources). */
  sites_in_property_record: number;
};

/**
 * How many site-level export rows to emit for this candidate.
 * Uses quantity_of_units when set (units of this row’s unit type); otherwise property_total_sites; else 1.
 */
export function siteCountForPropertyExport(c: CompsV2Candidate): number {
  if (!SOURCES_ONE_ROW_PER_SITE.has(c.source_table)) return 1;
  const q = c.quantity_of_units;
  if (q != null && q > 0) return Math.min(MAX_SITES_PER_CANDIDATE, Math.floor(q));
  const t = c.property_total_sites;
  if (t != null && t > 0) return Math.min(MAX_SITES_PER_CANDIDATE, Math.floor(t));
  return 1;
}

/**
 * Web research and all other sources: one row per candidate.
 * Hipcamp / Campspot / Sage Glamping: one row per site (repeated ADR/unit context per row).
 */
export function expandCandidatesForSiteExport(candidates: CompsV2Candidate[]): CompsV2ExportRow[] {
  const out: CompsV2ExportRow[] = [];
  for (const c of candidates) {
    const n = siteCountForPropertyExport(c);
    for (let i = 1; i <= n; i++) {
      out.push({
        ...c,
        export_stable_id: n > 1 ? `${c.stable_id}_site${i}` : c.stable_id,
        site_index: i,
        sites_in_property_record: n,
      });
    }
  }
  return out;
}
