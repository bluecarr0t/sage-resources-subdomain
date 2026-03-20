/**
 * Derive RV site base costs from feasibility_development_costs (unit_detail category).
 * Uses real data from uploaded feasibility studies when available.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Minimum number of feasibility records to use derived cost (avoid outliers) */
const MIN_SAMPLES = 2;

/**
 * Line items that are glamping unit structure (Interior, Exterior, etc.), not RV site types.
 * "Interior" falsely matches "Back-in" via the substring "in"; exclude these to use fallback costs.
 */
const RV_EXCLUDE_PATTERNS: RegExp[] = [
  /^interior\s*$/i,
  /^exterior\s*$/i,
  /kitchen\s*(build\s*out|add)?|kitchenette/i,
  /bathroom\s*(build\s*out|add)?/i,
  /^(deck|composite\s*deck|patio)\s*$/i,
  /deck\s*\(|covered\s*deck|pressure\s*treated|composite\s*deck/i,
  /\d+\s*br\s*(tent|cabin|yurt|unit)/i,
  /tent\s*master|master\s*tent/i,
  /^total\s*unit\s*cost$/i,
  /hvac|mini\s*split|insulation/i,
  /queen\s*bed|linens?|desk\s*\+\s*chair/i,
  /lighting.*furnishing|furnishing.*decor/i,
  /hot\s*tub|bbq|grill|chairs?\s*\+\s*table|umbrella|shade\s*structure/i,
];

function isGlampingStructureLineItem(lineItem: string): boolean {
  const label = (lineItem || '').trim();
  return RV_EXCLUDE_PATTERNS.some((p) => p.test(label));
}

/** Normalize for matching: lowercase, collapse spaces/hyphens */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

/** Check if feasibility line_item matches our site type name */
function matches(lineItem: string, siteTypeName: string): boolean {
  const a = normalize(lineItem);
  const b = normalize(siteTypeName);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Partial: "back-in deluxe" vs "back-in deluxe" or "pull-thru" vs "full hookup pull-thru"
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const matchCount = aWords.filter((w) => bWords.some((bw) => bw.includes(w) || w.includes(bw))).length;
  return matchCount >= Math.min(aWords.length, bWords.length, 2);
}

export interface FeasibilityCostMap {
  /** slug -> median per_unit_cost from feasibility data */
  bySlug: Record<string, number>;
  /** slug -> number of feasibility records used */
  sampleCount: Record<string, number>;
}

/**
 * Fetch feasibility_development_costs (unit_detail), aggregate by line_item,
 * and map to site_builder_rv_site_types by name match.
 */
export async function getFeasibilityDerivedRVCosts(
  supabase: SupabaseClient,
  rvSiteTypes: { slug: string; name: string }[]
): Promise<FeasibilityCostMap> {
  const { data: costs, error } = await supabase
    .from('feasibility_development_costs')
    .select('line_item, per_unit_cost')
    .eq('category', 'unit_detail')
    .not('per_unit_cost', 'is', null)
    .gte('per_unit_cost', 5000)
    .lte('per_unit_cost', 150000);

  if (error || !costs?.length) {
    return { bySlug: {}, sampleCount: {} };
  }

  const byLineItem: Record<string, number[]> = {};
  for (const row of costs) {
    const label = (row.line_item || '').trim();
    const val = Number(row.per_unit_cost);
    if (!label || Number.isNaN(val) || val < 5000 || val > 150000) continue;
    if (!byLineItem[label]) byLineItem[label] = [];
    byLineItem[label].push(val);
  }

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const bySlug: Record<string, number> = {};
  const sampleCount: Record<string, number> = {};

  for (const st of rvSiteTypes) {
    let bestMatch: { median: number; count: number; specificity: number } | null = null;
    for (const [lineItem, values] of Object.entries(byLineItem)) {
      if (values.length < MIN_SAMPLES) continue;
      if (isGlampingStructureLineItem(lineItem)) continue;
      if (!matches(lineItem, st.name)) continue;
      const a = normalize(lineItem);
      const b = normalize(st.name);
      // Reject generic matches: if site name contains line_item but not vice versa (e.g. "Back-in" for "Back-in deluxe"),
      // that match is too generic and would give same cost to standard vs deluxe. Use fallback instead.
      if (b.includes(a) && !a.includes(b) && a.length < b.length) continue;
      const m = median(values);
      const exactMatch = a === b ? 3 : 0;
      const lineContainsSite = a.includes(b) ? 2 : 0;
      const siteContainsLine = b.includes(a) ? 1 : 0;
      const specificity = exactMatch || lineContainsSite || siteContainsLine;
      const candidate = { median: m, count: values.length, specificity };
      if (!bestMatch || specificity > bestMatch.specificity || (specificity === bestMatch.specificity && values.length > bestMatch.count)) {
        bestMatch = candidate;
      }
    }
    if (bestMatch) {
      bySlug[st.slug] = Math.round(bestMatch.median);
      sampleCount[st.slug] = bestMatch.count;
    }
  }

  return { bySlug, sampleCount };
}
