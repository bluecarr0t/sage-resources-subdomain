/**
 * Extract amenity costs from feasibility_development_costs (unit_detail) and map to site_builder_amenity_costs.
 * Uses real data from uploaded feasibility studies.
 */

/** Minimum samples to use derived cost (1 allows single-report amenities; 2+ reduces outliers) */
const MIN_SAMPLES = 1;

/** Per-unit cost range: exclude noise (e.g. $25 deck) and unrealistic values */
const MIN_PER_UNIT = 100;
const MAX_PER_UNIT = 100_000;

export interface AmenityMapping {
  slug: string;
  name: string;
  applies_to: 'glamping' | 'rv' | 'both';
}

export interface FeasibilityCostRow {
  line_item: string;
  per_unit_cost: number | null;
  report_id?: string | null;
  study_id?: string | null;
  report_title?: string | null;
}

export interface AmenitySource {
  report_id: string;
  study_id: string | null;
  report_title: string | null;
  line_item: string;
}

/** Patterns: [regex, slug, display name, applies_to]. First match wins. Order matters. */
const AMENITY_PATTERNS: Array<[RegExp, string, string, 'glamping' | 'rv' | 'both']> = [
  [/bathroom\s*(build\s*out|add)?/i, 'private-bathroom', 'Private bathroom', 'glamping'],
  [/hot\s*tub|hottub/i, 'private-hot-tub', 'Private hot tub', 'glamping'],
  [/kitchen\s*(build\s*out|add)?|kitchenette/i, 'outdoor-kitchen', 'Outdoor kitchen / grill', 'glamping'],
  [/bbq|grill|outdoor\s*kitchen/i, 'outdoor-kitchen', 'Outdoor kitchen / grill', 'glamping'],
  [/outdoor\s*shower|exterior\s*shower/i, 'outdoor-shower', 'Outdoor shower', 'glamping'],
  [/sauna|wood-fired\s*sauna/i, 'wood-fired-sauna', 'Wood-fired sauna', 'glamping'],
  [/\bhammock\b/i, 'hammock', 'Hammock', 'glamping'],
  [/adirondack|adk\s*chairs/i, 'adirondack-chairs', 'Adirondack chairs', 'glamping'],
  [/ac\s*\/\s*mini|mini\s*split|a\/c|hvac/i, 'ac-mini-split', 'AC / mini-split', 'glamping'],
  [/cold\s*plunge|plunge\s*pool/i, 'cold-plunge', 'Cold plunge / plunge pool', 'glamping'],
  [/fire\s*ring|fire\s*pit\s*ring/i, 'fire-ring', 'Fire ring', 'rv'],
  [/propane\s*campfire|campfire|fire\s*pit|gas\s*fire\s*pit/i, 'fire-pit', 'Fire pit', 'both'],
  [/chairs?\s*\+\s*table|deck\s*chairs|patio\s*furniture|table\s*\+\s*chairs|outdoor\s*furniture/i, 'patio-furniture', 'Patio furniture', 'both'],
  [/composite\s*deck|pressure\s*treated\s*(pine)?|deck\s*\(|covered\s*deck/i, 'deck-patio', 'Deck / patio', 'both'],
  [/umbrella|shade\s*structure|pergola|shade\s*sail|covered\s*patio|shade\s*per\s*site/i, 'shade-structure', 'Shade structure / pergola', 'both'],
  [/\bdeck\b|\bpatio\b|deck\s*\/\s*patio|patio\s*\/\s*deck/i, 'deck-patio', 'Deck / patio', 'both'],
  [/picnic\s*table/i, 'picnic-table', 'Picnic table', 'both'],
  [/concrete\s*pad|paved\s*pad/i, 'concrete-pad', 'Concrete pad', 'rv'],
  [/50\s*amp|50-amp|electrical\s*upgrade/i, '50-amp-upgrade', '50-amp electrical upgrade', 'rv'],
  [/30\s*amp|30-amp/i, '30-amp-electrical', '30-amp electrical', 'rv'],
  [/sewer\s*hookup|sewer\s*connection/i, 'sewer-hookup', 'Sewer hookup', 'rv'],
  [/water\s*hookup|water\s*connection/i, 'water-hookup', 'Water hookup', 'rv'],
  [/cable\s*tv|tv\s*hookup/i, 'cable-tv', 'Cable TV', 'rv'],
  [/storage\s*shed|shed\s*per\s*site/i, 'storage-shed', 'Storage shed', 'rv'],
  [/wifi|wi-fi|internet/i, 'wifi', 'WiFi access', 'both'],
  [/pet\s*station|dog\s*run|dog\s*park/i, 'pet-station', 'Pet station / dog run', 'both'],
  [/outdoor\s*lighting|site\s*lighting|landscape\s*light/i, 'outdoor-lighting', 'Outdoor lighting', 'both'],
  [/bike\s*rack|bicycle\s*rack/i, 'bike-rack', 'Bike rack', 'both'],
];

/** Line items to exclude: unit types, RV site types, totals, interior/exterior (structure) */
const EXCLUDE_PATTERNS: RegExp[] = [
  /^\s*total\s*unit\s*cost/i,
  /^\s*total\s*cost\s*$/i,
  /\d+\s*br\s*(tent|cabin|yurt|unit)/i,
  /tent\s*master|master\s*tent/i,
  /^exterior\s*$/i,
  /^interior\s*$/i,
  /back-in\s*(deluxe|standard)/i,
  /full\s*hookup\s*(pull|back)/i,
  /partial\s*hookup|primitive/i,
  /pull-thru|pull\s*thru/i,
  /queen\s*bed|linens?|desk\s*\+\s*chair/i,
  /hvac|mini\s*split|insulation/i,
  /lighting.*furnishing|furnishing.*decor/i,
];

function isExcluded(lineItem: string, rvSiteTypeNames: string[]): boolean {
  const lower = lineItem.toLowerCase().trim();
  for (const p of EXCLUDE_PATTERNS) {
    if (p.test(lineItem)) return true;
  }
  for (const name of rvSiteTypeNames) {
    const n = name.toLowerCase();
    if (lower === n || lower.includes(n) || n.includes(lower)) return true;
  }
  return false;
}

function matchAmenity(lineItem: string): AmenityMapping | null {
  for (const [re, slug, name, applies_to] of AMENITY_PATTERNS) {
    if (re.test(lineItem)) return { slug, name, applies_to };
  }
  return null;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface ExtractedAmenity {
  slug: string;
  name: string;
  applies_to: 'glamping' | 'rv' | 'both';
  cost_per_unit: number;
  sample_count: number;
  source_line_items: string[];
  sources: AmenitySource[];
}

/**
 * Extract amenity costs from feasibility_development_costs rows (unit_detail).
 * Excludes RV site types and unit-type line items. Maps remaining to amenity slugs.
 */
export function extractFromFeasibilityRows(
  rows: FeasibilityCostRow[],
  rvSiteTypeNames: string[]
): ExtractedAmenity[] {
  const bySlug: Record<string, {
    values: number[];
    name: string;
    applies_to: 'glamping' | 'rv' | 'both';
    lineItems: Set<string>;
    sources: AmenitySource[];
  }> = {};

  for (const row of rows) {
    const lineItem = (row.line_item || '').trim();
    const raw = row.per_unit_cost;
    const val = raw != null ? Number(raw) : NaN;
    if (!lineItem || Number.isNaN(val) || val < MIN_PER_UNIT || val > MAX_PER_UNIT) continue;
    if (isExcluded(lineItem, rvSiteTypeNames)) continue;

    const mapping = matchAmenity(lineItem);
    if (!mapping) continue;

    // Deck/patio lines in studies are often totals or mis-scoped; exclude extreme "per unit" outliers
    if (mapping.slug === 'deck-patio' && val > 12_000) continue;

    if (!bySlug[mapping.slug]) {
      bySlug[mapping.slug] = {
        values: [],
        name: mapping.name,
        applies_to: mapping.applies_to,
        lineItems: new Set(),
        sources: [],
      };
    }
    bySlug[mapping.slug].values.push(val);
    bySlug[mapping.slug].lineItems.add(lineItem);
    if (row.report_id) {
      const existing = bySlug[mapping.slug].sources.find(
        (s) => s.report_id === row.report_id && s.line_item === lineItem
      );
      if (!existing) {
        bySlug[mapping.slug].sources.push({
          report_id: row.report_id,
          study_id: row.study_id ?? null,
          report_title: row.report_title ?? null,
          line_item: lineItem,
        });
      }
    }
  }

  const result: ExtractedAmenity[] = [];
  for (const [slug, data] of Object.entries(bySlug)) {
    if (data.values.length < MIN_SAMPLES) continue;
    let cost = Math.round(median(data.values));
    if (slug === 'deck-patio') {
      cost = Math.min(cost, 12_000);
    }
    result.push({
      slug,
      name: data.name,
      applies_to: data.applies_to,
      cost_per_unit: cost,
      sample_count: data.values.length,
      source_line_items: [...data.lineItems],
      sources: data.sources,
    });
  }

  return result.sort((a, b) => a.slug.localeCompare(b.slug));
}
