import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import { stableCandidateId } from '@/lib/comps-v2/stable-id';
import {
  classifyUnitExperienceBucket,
  siteWeightForMajority,
  rowPassesGlampingUnitGate,
} from '@/lib/comps-v2/glamping-unit-classify';
import { COMPS_V2_WEB_GAP_SOURCE_TABLES } from '@/lib/comps-v2/source-marker-color';

export function normalizePropertyGroupKey(c: CompsV2Candidate): string {
  const name = c.property_name.toLowerCase().trim().replace(/\s+/g, ' ');
  const city = c.city.toLowerCase().trim().replace(/\s+/g, ' ');
  const state = c.state.toUpperCase().trim().slice(0, 2);
  return `${name}|${city}|${state}`;
}

const SOURCE_PRIORITY: Record<string, number> = {
  all_glamping_properties: 0,
  hipcamp: 1,
  past_reports: 2,
  tavily_gap_fill: 3,
  firecrawl_gap_fill: 4,
};

function sourceRank(table: string): number {
  return SOURCE_PRIORITY[table] ?? 5;
}

/**
 * One row per property (name + city + state). Picks best representative, merges totals.
 */
export function dedupeUniqueProperties(candidates: CompsV2Candidate[]): CompsV2Candidate[] {
  const groups = new Map<string, CompsV2Candidate[]>();
  for (const c of candidates) {
    const k = normalizePropertyGroupKey(c);
    const g = groups.get(k);
    if (g) g.push(c);
    else groups.set(k, [c]);
  }

  const out: CompsV2Candidate[] = [];
  for (const [, group] of groups) {
    const sorted = [...group].sort((a, b) => {
      const sd = sourceRank(a.source_table) - sourceRank(b.source_table);
      if (sd !== 0) return sd;
      return (a.distance_miles ?? 999) - (b.distance_miles ?? 999);
    });
    const base = sorted[0];
    const maxSites = Math.max(
      0,
      ...sorted.map((r) => r.property_total_sites ?? 0).filter((n) => n > 0)
    );
    const withAdr = sorted.filter((r) => r.avg_retail_daily_rate != null && r.avg_retail_daily_rate > 0);
    const avgAdr =
      withAdr.length > 0
        ? withAdr.reduce((s, r) => s + (r.avg_retail_daily_rate as number), 0) / withAdr.length
        : base.avg_retail_daily_rate;

    const unitTypes = new Set(
      sorted.map((r) => r.unit_type?.trim()).filter((x): x is string => Boolean(x))
    );
    const unit_type =
      unitTypes.size === 0
        ? base.unit_type
        : unitTypes.size === 1
          ? [...unitTypes][0]
          : 'Glamping — multiple unit types';

    const qtySum = sorted.reduce((s, r) => s + (r.quantity_of_units ?? 0), 0);

    const key = normalizePropertyGroupKey(base);
    const stable_id = stableCandidateId('comps_v2_unique', key, base.property_name);
    const geoRow = sorted.find(
      (r) => r.geo_lat != null && r.geo_lng != null && Number.isFinite(r.geo_lat) && Number.isFinite(r.geo_lng)
    );
    const occRow = sorted.find(
      (r) => r.market_occupancy_rate != null && Number.isFinite(r.market_occupancy_rate)
    );

    const webResearchSupplement = sorted.some((r) => COMPS_V2_WEB_GAP_SOURCE_TABLES.has(r.source_table));

    out.push({
      ...base,
      stable_id,
      source_row_id: null,
      avg_retail_daily_rate: avgAdr != null && Number.isFinite(avgAdr) ? Math.round(avgAdr) : base.avg_retail_daily_rate,
      property_total_sites: maxSites > 0 ? maxSites : base.property_total_sites,
      quantity_of_units: qtySum > 0 ? qtySum : base.quantity_of_units,
      unit_type,
      geo_lat: geoRow?.geo_lat ?? base.geo_lat ?? null,
      geo_lng: geoRow?.geo_lng ?? base.geo_lng ?? null,
      market_occupancy_rate: occRow?.market_occupancy_rate ?? base.market_occupancy_rate ?? null,
      web_research_supplement: webResearchSupplement || Boolean(base.web_research_supplement),
    });
  }

  return out;
}

/**
 * Drop whole properties where glamping-classified site weight is not a strict majority.
 */
export function filterGlampingMajorityProperties(candidates: CompsV2Candidate[]): CompsV2Candidate[] {
  const groups = new Map<string, CompsV2Candidate[]>();
  for (const c of candidates) {
    const k = normalizePropertyGroupKey(c);
    const g = groups.get(k);
    if (g) g.push(c);
    else groups.set(k, [c]);
  }

  const allowedKeys = new Set<string>();
  for (const [key, group] of groups) {
    let gl = 0;
    let non = 0;
    for (const c of group) {
      const w = siteWeightForMajority(c);
      const b = classifyUnitExperienceBucket(c);
      if (b === 'rv' || b === 'tent' || b === 'campground' || b === 'vacation') {
        non += w;
      } else {
        gl += w;
      }
    }
    if (gl > non) allowedKeys.add(key);
  }

  return candidates.filter((c) => allowedKeys.has(normalizePropertyGroupKey(c)));
}

/**
 * Apply row-level glamping gates + majority + dedupe when discovery is glamping-focused (no RV / campground kinds).
 */
export function finalizeGlampingUniqueProperties(
  candidates: CompsV2Candidate[],
  glampingStrict: boolean
): CompsV2Candidate[] {
  let list = candidates;
  if (glampingStrict) {
    list = list.filter(rowPassesGlampingUnitGate);
    list = filterGlampingMajorityProperties(list);
  }
  return dedupeUniqueProperties(list);
}
