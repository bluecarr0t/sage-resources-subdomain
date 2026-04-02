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
 *
 * - **Hipcamp / Campspot:** Each DB row is already one site (or site-type) line. Use `quantity_of_units`
 *   only when it counts identical units for that line. Do **not** fall back to `property_total_sites`—that
 *   is the whole-property total and would repeat the same row hundreds of times per line item.
 * - **Sage glamping (`all_glamping_properties`):** Rows are often property-level; fall back to
 *   `property_total_sites` when quantity is missing.
 */
export function siteCountForPropertyExport(c: CompsV2Candidate): number {
  if (!SOURCES_ONE_ROW_PER_SITE.has(c.source_table)) return 1;
  const q = c.quantity_of_units;
  if (q != null && q > 0) return Math.min(MAX_SITES_PER_CANDIDATE, Math.floor(q));
  if (c.source_table === 'hipcamp' || c.source_table === 'campspot') {
    return 1;
  }
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
