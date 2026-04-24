/**
 * Human-friendly map from questions / phrases → real `all_glamping_properties`
 * column names. Kept in sync with `all-glamping-properties-columns` allowlists.
 * UI + `find_glamping_columns` tool share this list.
 */
import { isKnownGlampingColumn } from '@/lib/sage-ai/all-glamping-properties-columns';

export const GLAMPING_FIELD_GUIDE_VERSION = 1 as const;

export type FieldGuideCategory = 'unit' | 'property' | 'activities' | 'setting' | 'rv' | 'geo_status';

export interface FieldGuideEntry {
  column: string;
  category: FieldGuideCategory;
  /** Short label for people (not the DB name). */
  label: string;
  /** Extra plain-language tokens to match in search. */
  aliases: string[];
  /** How to use in Sage AI tools. */
  tool_tip: string;
}

/** Curated: common consulting / revenue questions. Full list = ALL_GLAMPING_PROPERTY_COLUMNS in code. */
export const GLAMPING_FIELD_GUIDE: FieldGuideEntry[] = [
  {
    column: 'unit_private_bathroom',
    category: 'unit',
    label: 'Private or ensuite bathroom',
    aliases: [
      'bathroom in unit',
      'ensuite',
      'en suite',
      'own bathroom',
      'restroom',
      'plumbing',
      'wc',
    ],
    tool_tip:
      'Use `column_eq_filters: [{ column: "unit_private_bathroom", value: "Yes" }]` or `aggregate_properties` with `group_by: "unit_private_bathroom"`.',
  },
  {
    column: 'unit_hot_tub',
    category: 'unit',
    label: 'Hot tub (on the unit)',
    aliases: ['jacuzzi', 'spa tub', 'jetted'],
    tool_tip: 'Per-unit hot tub flag — distinct from `property_hot_tub` (park-level).',
  },
  {
    column: 'unit_hot_tub_or_sauna',
    category: 'unit',
    label: 'Hot tub or sauna (on the unit, combined flag)',
    aliases: ['spa'],
    tool_tip: 'Use when the question is either/or on the same row.',
  },
  {
    column: 'unit_sauna',
    category: 'unit',
    label: 'Sauna (on the unit)',
    aliases: ['steam room'],
    tool_tip: 'Structured Yes/No on the unit record.',
  },
  {
    column: 'unit_wifi',
    category: 'unit',
    label: 'Wi-Fi in unit',
    aliases: ['internet', 'broadband', 'connectivity', 'cell signal'],
    tool_tip: 'Unit-level internet flag.',
  },
  {
    column: 'unit_pets',
    category: 'unit',
    label: 'Pets allowed (unit / listing)',
    aliases: ['dog', 'pet friendly', 'dogs', 'animals'],
    tool_tip: 'Check values with `get_column_values` (often Yes/No).',
  },
  {
    column: 'unit_full_kitchen',
    category: 'unit',
    label: 'Full kitchen',
    aliases: ['kitchen', 'cook', 'cooking', 'stove', 'oven'],
    tool_tip: 'Full kitchen on the unit — vs `unit_kitchenette`.',
  },
  {
    column: 'unit_kitchenette',
    category: 'unit',
    label: 'Kitchenette',
    aliases: ['mini kitchen', 'small kitchen', 'microwave kitchen'],
    tool_tip: 'Light cooking / compact kitchen.',
  },
  {
    column: 'unit_air_conditioning',
    category: 'unit',
    label: 'Air conditioning',
    aliases: ['ac', 'a c', 'cooling', 'hvac', 'climate control'],
    tool_tip: 'Cooling in the unit.',
  },
  {
    column: 'unit_wood_burning_stove',
    category: 'unit',
    label: 'Wood burning stove',
    aliases: ['wood stove', 'fireplace', 'stove', 'heat'],
    tool_tip: 'Heating feature on the unit.',
  },
  {
    column: 'unit_gas_fireplace',
    category: 'unit',
    label: 'Gas fireplace',
    aliases: ['fireplace', 'hearth'],
    tool_tip: 'Gas fireplace in the unit.',
  },
  {
    column: 'unit_ada_accessibility',
    category: 'unit',
    label: 'ADA / accessibility (unit)',
    aliases: [
      'accessible',
      'disability',
      'wheelchair',
      'ada',
      'mobility',
    ],
    tool_tip: 'Use for compliance-oriented filters.',
  },
  {
    column: 'unit_patio',
    category: 'unit',
    label: 'Patio or deck (unit)',
    aliases: ['deck', 'veranda', 'outdoor space', 'balcony'],
    tool_tip: 'Private outdoor space tied to the unit line.',
  },
  {
    column: 'unit_bathtub',
    category: 'unit',
    label: 'Bathtub',
    aliases: ['bath', 'soaking'],
    tool_tip: 'Tub (not the same as private bathroom).',
  },
  {
    column: 'unit_shower',
    category: 'unit',
    label: 'Shower (unit feature)',
    aliases: ['standing shower'],
    tool_tip: 'Shower as a unit amenity line item.',
  },
  {
    column: 'unit_water',
    category: 'unit',
    label: 'Water (unit service)',
    aliases: ['running water', 'hookup'],
    tool_tip: 'Often Yes/No for water availability on the unit line.',
  },
  {
    column: 'unit_electricity',
    category: 'unit',
    label: 'Electricity in unit',
    aliases: ['power', 'outlets', 'electric'],
    tool_tip: 'Electrical service on the unit.',
  },
  {
    column: 'unit_campfires',
    category: 'unit',
    label: 'Campfire / fire ring (unit area)',
    aliases: ['fire pit', 'fire ring', 's mores'],
    tool_tip: 'Unit-adjacent fire feature where modeled.',
  },
  {
    column: 'unit_charcoal_grill',
    category: 'unit',
    label: 'Charcoal grill (unit)',
    aliases: ['bbq', 'barbecue', 'grill'],
    tool_tip: 'Grill at the unit.',
  },
  {
    column: 'unit_mini_fridge',
    category: 'unit',
    label: 'Mini fridge',
    aliases: ['refrigerator', 'fridge', 'minibar'],
    tool_tip: 'Small cold storage.',
  },
  {
    column: 'unit_cable',
    category: 'unit',
    label: 'Cable TV',
    aliases: ['television', 'tv'],
    tool_tip: 'Wired/cable TV flag.',
  },
  {
    column: 'property_pool',
    category: 'property',
    label: 'Swimming pool (property / park)',
    aliases: ['swimming', 'pool', 'resort pool'],
    tool_tip: 'Park-level pool — not per unit.',
  },
  {
    column: 'property_hot_tub',
    category: 'property',
    label: 'Hot tub (property / shared)',
    aliases: ['shared hot tub', 'communal spa'],
    tool_tip: 'Distinguish from `unit_hot_tub` (on-unit).',
  },
  {
    column: 'property_sauna',
    category: 'property',
    label: 'Sauna (property / shared)',
    aliases: ['spa', 'bath house'],
    tool_tip: 'Shared / park-level sauna.',
  },
  {
    column: 'property_restaurant',
    category: 'property',
    label: 'Restaurant on site',
    aliases: ['dining', 'food service', 'eats', 'meal'],
    tool_tip: 'On-site restaurant flag.',
  },
  {
    column: 'property_food_on_site',
    category: 'property',
    label: 'Food on site (general)',
    aliases: ['meals', 'cafe', 'concession'],
    tool_tip: 'Broader than restaurant alone.',
  },
  {
    column: 'property_dog_park',
    category: 'property',
    label: 'Dog park',
    aliases: [
      'off leash',
      'pet run',
      'bark park',
    ],
    tool_tip: 'Dedicated dog area at the property.',
  },
  {
    column: 'property_waterfront',
    category: 'property',
    label: 'Waterfront location',
    aliases: [
      'lake front',
      'river',
      'ocean',
      'on the water',
      'beach',
      'water view',
    ],
    tool_tip: 'Scenic / positioning on water when flagged.',
  },
  {
    column: 'property_playground',
    category: 'property',
    label: 'Playground',
    aliases: ['kids', 'children', 'play area'],
    tool_tip: 'Family / kids amenity at park level.',
  },
  {
    column: 'property_laundry',
    category: 'property',
    label: 'Laundry facilities',
    aliases: ['washers', 'dryers', 'laundromat'],
    tool_tip: 'Guest laundry on property.',
  },
  {
    column: 'property_fitness_room',
    category: 'property',
    label: 'Fitness / gym',
    aliases: [
      'gym',
      'workout',
      'exercise',
    ],
    tool_tip: 'On-site fitness room.',
  },
  {
    column: 'property_clubhouse',
    category: 'property',
    label: 'Clubhouse',
    aliases: ['lodge', 'community building'],
    tool_tip: 'Shared clubhouse facility.',
  },
  {
    column: 'activities_hiking',
    category: 'activities',
    label: 'Hiking (nearby / activity)',
    aliases: [
      'trails',
      'trail',
      'hike',
    ],
    tool_tip: 'Use with `query_properties` state/city to scope a market.',
  },
  {
    column: 'activities_swimming',
    category: 'activities',
    label: 'Swimming (activity)',
    aliases: [
      'swim',
      'lake swim',
    ],
    tool_tip: 'Activity flag — not the same as `property_pool`.',
  },
  {
    column: 'activities_fishing',
    category: 'activities',
    label: 'Fishing (activity)',
    aliases: [
      'fish',
      'angling',
    ],
    tool_tip: 'Activity / positioning flag.',
  },
  {
    column: 'setting_mountainous',
    category: 'setting',
    label: 'Mountain setting',
    aliases: [
      'mountains',
      'alpine',
      'elevation',
    ],
    tool_tip: 'Scenic/terrain setting for the property.',
  },
  {
    column: 'setting_forest',
    category: 'setting',
    label: 'Forest setting',
    aliases: [
      'woods',
      'wooded',
      'trees',
    ],
    tool_tip: 'Tree cover / forest positioning.',
  },
  {
    column: 'setting_lake',
    category: 'setting',
    label: 'Lake setting',
    aliases: [
      'lakeside',
    ],
    tool_tip: 'Lake-oriented setting flag.',
  },
  {
    column: 'setting_beach',
    category: 'setting',
    label: 'Beach setting',
    aliases: [
      'sand',
      'coast',
    ],
    tool_tip: 'Beach / coastal product context.',
  },
  {
    column: 'river_stream_or_creek',
    category: 'setting',
    label: 'River, stream, or creek (proximity)',
    aliases: [
      'riparian',
      'stream',
    ],
    tool_tip: 'Water feature near the site (non-lake).',
  },
  {
    column: 'rv_sewer_hook_up',
    category: 'rv',
    label: 'RV sewer hookup',
    aliases: [
      'full hookup',
      'sewage',
    ],
    tool_tip: 'Relevant for RV / mixed product rows.',
  },
  {
    column: 'rv_water_hookup',
    category: 'rv',
    label: 'RV water hookup',
    aliases: [
      'fresh water',
    ],
    tool_tip: 'RV service flag.',
  },
  {
    column: 'rv_electrical_hook_up',
    category: 'rv',
    label: 'RV electric hookup',
    aliases: [
      '50 amp',
      '30 amp',
      'power post',
    ],
    tool_tip: 'Electrical post at RV site.',
  },
  {
    column: 'is_glamping_property',
    category: 'geo_status',
    label: 'Is glamping (vs traditional RV / tent-vehicle only)',
    aliases: [
      'true glamping',
      'glamping only',
    ],
    tool_tip: 'Set `Yes` in filters when the user means glamping product.',
  },
  {
    column: 'is_open',
    category: 'geo_status',
    label: 'Property open (operating)',
    aliases: [
      'shut',
      'not operating',
      'closed',
    ],
    tool_tip: 'Use `Yes` in filters to include only operating listings (exclude closed).',
  },
  {
    column: 'research_status',
    category: 'geo_status',
    label: 'Research / publication status',
    aliases: [
      'published',
      'draft',
      'verified',
    ],
    tool_tip: 'Call `get_column_values({ column: "research_status" })` for exact strings.',
  },
  {
    column: 'unit_type',
    category: 'geo_status',
    label: 'Unit type (cabin, yurt, safari tent, …)',
    aliases: [
      'accommodation type',
      'product type',
      'lodge',
      'dome',
      'treehouse',
    ],
    tool_tip: 'Filter or group with `query_properties` / `aggregate_properties`.',
  },
  {
    column: 'property_type',
    category: 'geo_status',
    label: 'Property type classification',
    aliases: [
      'resort',
      'campground',
    ],
    tool_tip: 'How Sage classifies the property.',
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchTokens(q: string): string[] {
  return normalize(q)
    .split(' ')
    .filter((t) => t.length > 0);
}

export interface FieldGuideMatch extends FieldGuideEntry {
  score: number;
}

/**
 * Fuzzy search over labels, aliases, column names, and tips — for the LLM
 * and for UI filtering.
 */
export function searchFieldGuide(
  query: string,
  maxResults: number
): FieldGuideMatch[] {
  const qn = normalize(query);
  if (!qn) {
    return GLAMPING_FIELD_GUIDE.slice(0, maxResults).map((e) => ({ ...e, score: 1 }));
  }
  const toks = searchTokens(query);
  const out: FieldGuideMatch[] = [];
  for (const e of GLAMPING_FIELD_GUIDE) {
    const col = e.column.toLowerCase();
    const label = e.label.toLowerCase();
    const aliasBlob = e.aliases.join(' ').toLowerCase();
    const tip = e.tool_tip.toLowerCase();
    let score = 0;
    if (qn.length >= 2 && (col.includes(qn) || col.replace(/_/g, ' ').includes(qn)))
      score += 80;
    if (label.includes(qn) || qn.length >= 3) {
      for (const t of toks) {
        if (t.length < 2) continue;
        if (label.includes(t)) score += 12;
        if (aliasBlob.includes(t)) score += 15;
        if (col.includes(t)) score += 10;
        if (tip.includes(t)) score += 4;
      }
    }
    if (score > 0) out.push({ ...e, score });
  }
  out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return out.slice(0, maxResults);
}

/** Group entries by category (for the UI panel). */
export function fieldGuideByCategory(
  entries: readonly FieldGuideEntry[]
): Map<FieldGuideCategory, FieldGuideEntry[]> {
  const m = new Map<FieldGuideCategory, FieldGuideEntry[]>();
  for (const c of [
    'unit',
    'property',
    'activities',
    'setting',
    'rv',
    'geo_status',
  ] as const) {
    m.set(c, []);
  }
  for (const e of entries) {
    m.get(e.category)!.push(e);
  }
  return m;
}

if (process.env.NODE_ENV === 'development') {
  for (const e of GLAMPING_FIELD_GUIDE) {
    if (!isKnownGlampingColumn(e.column)) {
      throw new Error(`glamping-field-guide: "${e.column}" is not a known all_glamping_properties column`);
    }
  }
}
