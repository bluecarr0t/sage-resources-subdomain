/**
 * Map deep enrichment API results to CompsV2Candidate rows so CSV/XLSX export reuses
 * the same sites-template pipeline as discovery results.
 */

import type { DeepEnrichResult } from '@/lib/comps-v2/deep-enrich';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

const DEEP_EXPORT_SOURCE_TABLE = 'comps_v2_deep_enrich';

function emptySeasonalRates(): CompsV2Candidate['seasonal_rates'] {
  return {
    winter_weekday: null,
    winter_weekend: null,
    spring_weekday: null,
    spring_weekend: null,
    summer_weekday: null,
    summer_weekend: null,
    fall_weekday: null,
    fall_weekend: null,
  };
}

export function buildDeepEnrichExportDescription(r: DeepEnrichResult): string {
  const parts: string[] = [];
  const s = r.structured;
  if (s.summary.trim()) parts.push(s.summary.trim());
  if (s.amenities.length) {
    parts.push(`Amenities: ${s.amenities.join('; ')}`);
  }
  if (s.rates_notes.trim()) {
    parts.push(`Rates overview: ${s.rates_notes.trim()}`);
  }
  if (s.unit_type_rates?.length) {
    const lines = s.unit_type_rates.map((u) => `- ${u.unit_type}: ${u.rate_note}`).join('\n');
    parts.push(`Unit types & rates:\n${lines}`);
  }
  if (s.review_highlights.trim()) {
    parts.push(`Review themes: ${s.review_highlights.trim()}`);
  }
  if (s.google_business_notes.trim()) {
    parts.push(`Google Business / Maps: ${s.google_business_notes.trim()}`);
  }
  if (s.sources_cited.length) {
    parts.push(`Sources cited: ${s.sources_cited.join('; ')}`);
  }
  if (r.error) {
    parts.push(`Enrichment error: ${r.error}`);
  }
  return parts.join('\n\n');
}

function fallbackStableId(index: number, name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return `deep_enrich_${index}_${Math.abs(h).toString(36)}`;
}

/**
 * Merge a deep result with the discovery row it came from (same index as the POST `items` array).
 * Description is replaced with the full deep-enrich narrative; numeric/geo fields stay from discovery.
 */
export function deepEnrichResultToCompsV2Candidate(
  r: DeepEnrichResult,
  base: CompsV2Candidate | undefined,
  index: number
): CompsV2Candidate {
  const description = buildDeepEnrichExportDescription(r);
  if (base) {
    return {
      ...base,
      property_name: r.property_name,
      city: r.city ?? base.city,
      state: r.state ?? base.state,
      url: r.url ?? base.url ?? null,
      description,
      source_table: DEEP_EXPORT_SOURCE_TABLE,
    };
  }
  return {
    stable_id: fallbackStableId(index, r.property_name),
    property_name: r.property_name,
    city: r.city ?? '',
    state: r.state ?? '',
    unit_type: null,
    property_total_sites: null,
    quantity_of_units: null,
    avg_retail_daily_rate: null,
    high_rate: null,
    low_rate: null,
    seasonal_rates: emptySeasonalRates(),
    operating_season_months: null,
    url: r.url ?? null,
    description,
    distance_miles: null,
    source_table: DEEP_EXPORT_SOURCE_TABLE,
    property_type: null,
    adr_quality_tier: null,
    source_row_id: null,
  };
}

/** Build rows for `compsV2CandidatesToCsv` / `writeCompsV2CandidatesXlsx`. */
export function deepEnrichResultsToExportCandidates(
  results: DeepEnrichResult[],
  sourceCandidates: CompsV2Candidate[] | null
): CompsV2Candidate[] {
  return results.map((r, i) => deepEnrichResultToCompsV2Candidate(r, sourceCandidates?.[i], i));
}
