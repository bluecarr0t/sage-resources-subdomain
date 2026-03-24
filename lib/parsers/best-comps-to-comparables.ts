/**
 * When workbooks have Best Comps (property scores) but no Comps Summ/Grid,
 * synthesize ParsedComparable rows so feasibility_comparables / Comps page stay populated.
 */

import type {
  FeasibilityPropertyScore,
  ParsedComparable,
  ParsedPropertyScore,
} from '@/lib/types/feasibility';
import { getStateFromText, parseLocationAndState } from '@/lib/feasibility-utils';
import { extractAmenityKeywords } from '@/lib/csv/feasibility-parser';

function normalizeCompNameForDedupe(name: string): string {
  return String(name || '').trim().replace(/\*+$/, '').trim() || name;
}

function isEligibleScoreRow(s: ParsedPropertyScore): boolean {
  if (s.is_subject) return false;
  const n = String(s.property_name || '').trim();
  if (!n) return false;
  if (/^subject(\s+property)?$/i.test(n)) return false;
  if (n.length > 80) return false;
  if (/^\d+(\.\d+)?$/.test(n)) return false;
  return true;
}

function buildOverviewFromScore(s: ParsedPropertyScore): string | null {
  const parts: string[] = [];
  const push = (label: string, val: string | null | undefined) => {
    const t = String(val || '').trim();
    if (t) parts.push(`${label}: ${t}`);
  };
  push('Location', s.location_description);
  push('Unit types', s.unit_types_description);
  push('Unit amenities', s.unit_amenities_description);
  push('Property', s.property_description);
  push('Property amenities', s.property_amenities_description);
  push('Brand', s.brand_strength_description);
  push('Occupancy', s.occupancy_notes);
  if (parts.length === 0) return null;
  return parts.join('\n\n');
}

function scoreRowRichness(s: ParsedPropertyScore): number {
  const o = buildOverviewFromScore(s) || '';
  return o.length + (s.overall_score != null ? 10 : 0);
}

function deriveState(s: ParsedPropertyScore, overview: string | null): string | null {
  const fromLoc = parseLocationAndState(s.location_description);
  if (fromLoc) return fromLoc.state;
  if (overview) {
    const fromOverview = parseLocationAndState(overview);
    if (fromOverview) return fromOverview.state;
    return getStateFromText(overview);
  }
  return getStateFromText(s.location_description) ?? getStateFromText(s.property_name);
}

/**
 * Map Best Comps property scores to comparables when Comps Summ/Grid is absent.
 * Dedupes by normalized comp name; keeps the row with richer overview/score data.
 */
export function syntheticComparablesFromPropertyScores(
  scores: ParsedPropertyScore[],
  warnings?: string[]
): ParsedComparable[] {
  const eligible = scores.filter(isEligibleScoreRow);
  if (eligible.length === 0) return [];

  const byKey = new Map<string, ParsedPropertyScore>();
  for (const s of eligible) {
    const key = normalizeCompNameForDedupe(s.property_name).toLowerCase();
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev || scoreRowRichness(s) > scoreRowRichness(prev)) byKey.set(key, s);
  }

  const out: ParsedComparable[] = [];
  for (const s of byKey.values()) {
    const overview = buildOverviewFromScore(s);
    const state = deriveState(s, overview);
    const kwSource = [overview, s.property_name].filter(Boolean).join(' ');
    const amenity_keywords = kwSource.trim() ? extractAmenityKeywords(kwSource) : [];

    out.push({
      comp_name: normalizeCompNameForDedupe(s.property_name) || s.property_name,
      overview,
      state,
      amenities: null,
      amenity_keywords,
      distance_miles: null,
      total_sites: null,
      quality_score: s.overall_score,
      property_type: null,
    });
  }

  if (warnings && out.length > 0) {
    warnings.push(
      'No Comps Summ/Grid; listed properties derived from Best Comps (no ADR/unit grid from workbook).'
    );
  }

  return out;
}

/** Map DB rows from feasibility_property_scores through the same synthesis as parse-time Best Comps. */
export function dbPropertyScoreRowsToSyntheticComparables(
  rows: FeasibilityPropertyScore[]
): ParsedComparable[] {
  const asParsed: ParsedPropertyScore[] = rows.map((r) => ({
    property_name: r.property_name,
    overall_score: r.overall_score,
    is_subject: r.is_subject,
    unit_types_score: r.unit_types_score,
    unit_types_description: r.unit_types_description,
    unit_amenities_score: r.unit_amenities_score,
    unit_amenities_description: r.unit_amenities_description,
    property_score: r.property_score,
    property_description: r.property_description,
    property_amenities_score: r.property_amenities_score,
    property_amenities_description: r.property_amenities_description,
    location_score: r.location_score,
    location_description: r.location_description,
    brand_strength_score: r.brand_strength_score,
    brand_strength_description: r.brand_strength_description,
    occupancy_notes: r.occupancy_notes,
  }));
  return syntheticComparablesFromPropertyScores(asParsed);
}
