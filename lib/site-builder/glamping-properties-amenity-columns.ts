/**
 * Amenity-related columns on all_glamping_properties (Sage glamping dataset).
 * Used to cross-reference the Site Builder cost catalog with property/unit/RV fields.
 *
 * @see scripts/migrations/reorder-all-glamping-properties-by-prefix.sql
 */

export type GlampingPropertyAmenityScope = 'unit' | 'rv' | 'property';

export interface GlampingPropertyAmenityField {
  column: string;
  label: string;
  scope: GlampingPropertyAmenityScope;
  /** When set, aligns with amenities.slug (Site Builder catalog) when present */
  mapsToSiteBuilderSlug?: string;
  /**
   * Default `cost_per_unit` for dataset-only `amenities` rows (USD).
   * Mid-market illustrative add-on / allocation—not a line-item bid.
   */
  datasetDefaultCostPerUnit?: number;
}

function u(
  column: string,
  label: string,
  opts?: { mapsToSiteBuilderSlug?: string; datasetDefaultCostPerUnit?: number }
): GlampingPropertyAmenityField {
  return { column, label, scope: 'unit', ...opts };
}

function r(column: string, label: string, mapsToSiteBuilderSlug?: string): GlampingPropertyAmenityField {
  return { column, label, scope: 'rv', mapsToSiteBuilderSlug };
}

function p(
  column: string,
  label: string,
  opts?: { mapsToSiteBuilderSlug?: string; datasetDefaultCostPerUnit?: number }
): GlampingPropertyAmenityField {
  return { column, label, scope: 'property', ...opts };
}

/** Ordered: unit (glamping unit), RV site, then property-level resort amenities */
export const GLAMPING_PROPERTY_AMENITY_FIELDS: GlampingPropertyAmenityField[] = [
  u('unit_shower', 'Shower', { datasetDefaultCostPerUnit: 4000 }),
  u('unit_water', 'Water', { datasetDefaultCostPerUnit: 1200 }),
  u('unit_electricity', 'Electricity', { datasetDefaultCostPerUnit: 1800 }),
  u('unit_picnic_table', 'Picnic table', { mapsToSiteBuilderSlug: 'picnic-table' }),
  u('unit_wifi', 'WiFi', { mapsToSiteBuilderSlug: 'wifi' }),
  u('unit_pets', 'Pets allowed', { datasetDefaultCostPerUnit: 400 }),
  u('unit_private_bathroom', 'Private bathroom', { mapsToSiteBuilderSlug: 'private-bathroom' }),
  u('unit_full_kitchen', 'Full kitchen', { mapsToSiteBuilderSlug: 'outdoor-kitchen' }),
  u('unit_kitchenette', 'Kitchenette', { mapsToSiteBuilderSlug: 'outdoor-kitchen' }),
  u('unit_ada_accessibility', 'ADA accessibility', { datasetDefaultCostPerUnit: 8500 }),
  u('unit_patio', 'Patio / deck', { mapsToSiteBuilderSlug: 'deck-patio' }),
  u('unit_air_conditioning', 'Air conditioning', { mapsToSiteBuilderSlug: 'ac-mini-split' }),
  u('unit_gas_fireplace', 'Gas fireplace', { datasetDefaultCostPerUnit: 5000 }),
  u('unit_hot_tub_or_sauna', 'Hot tub or sauna', { mapsToSiteBuilderSlug: 'private-hot-tub' }),
  u('unit_hot_tub', 'Hot tub', { mapsToSiteBuilderSlug: 'private-hot-tub' }),
  u('unit_sauna', 'Sauna', { mapsToSiteBuilderSlug: 'wood-fired-sauna' }),
  u('unit_cable', 'Cable TV', { mapsToSiteBuilderSlug: 'cable-tv' }),
  u('unit_campfires', 'Campfires / fire pit', { mapsToSiteBuilderSlug: 'fire-pit' }),
  u('unit_charcoal_grill', 'Charcoal grill', { datasetDefaultCostPerUnit: 400 }),
  u('unit_mini_fridge', 'Mini fridge', { datasetDefaultCostPerUnit: 500 }),
  u('unit_bathtub', 'Bathtub', { datasetDefaultCostPerUnit: 2800 }),
  u('unit_wood_burning_stove', 'Wood burning stove', { datasetDefaultCostPerUnit: 6000 }),

  r('rv_sewer_hook_up', 'RV: sewer hookup', 'sewer-hookup'),
  r('rv_electrical_hook_up', 'RV: electrical hookup', '30-amp-electrical'),
  r('rv_water_hookup', 'RV: water hookup', 'water-hookup'),

  p('property_laundry', 'Laundry', { datasetDefaultCostPerUnit: 2800 }),
  p('property_playground', 'Playground', { datasetDefaultCostPerUnit: 650 }),
  p('property_pool', 'Pool', { datasetDefaultCostPerUnit: 4500 }),
  p('property_food_on_site', 'Food on site', { datasetDefaultCostPerUnit: 2200 }),
  p('property_sauna', 'Sauna', { datasetDefaultCostPerUnit: 1500 }),
  p('property_hot_tub', 'Hot tub', { datasetDefaultCostPerUnit: 1800 }),
  p('property_restaurant', 'Restaurant', { datasetDefaultCostPerUnit: 7500 }),
  p('property_dog_park', 'Dog park', { datasetDefaultCostPerUnit: 550 }),
  p('property_clubhouse', 'Clubhouse', { datasetDefaultCostPerUnit: 4200 }),
  p('property_alcohol_available', 'Alcohol available', { datasetDefaultCostPerUnit: 600 }),
  p('property_waterpark', 'Waterpark', { datasetDefaultCostPerUnit: 12000 }),
  p('property_general_store', 'General store', { datasetDefaultCostPerUnit: 3200 }),
  p('property_waterfront', 'Waterfront', { datasetDefaultCostPerUnit: 800 }),
  p('property_fitness_room', 'Fitness room', { datasetDefaultCostPerUnit: 1800 }),
  p('property_propane_refilling_station', 'Propane refilling', { mapsToSiteBuilderSlug: 'propane-outlet-site' }),
  p('property_pickball_courts', 'Pickleball courts', { datasetDefaultCostPerUnit: 700 }),
  p('property_basketball', 'Basketball', { datasetDefaultCostPerUnit: 500 }),
  p('property_volleyball', 'Volleyball', { datasetDefaultCostPerUnit: 250 }),
  p('property_jet_skiing', 'Jet skiing', { datasetDefaultCostPerUnit: 900 }),
  p('property_tennis', 'Tennis', { datasetDefaultCostPerUnit: 900 }),
];

/** Maps catalog slug → dataset columns that share that amenity cost (for amenities.glamping_fields). */
export function glampingColumnsByCatalogSlug(): Record<
  string,
  { column: string; scope: GlampingPropertyAmenityScope }[]
> {
  const out: Record<string, { column: string; scope: GlampingPropertyAmenityScope }[]> = {};
  for (const f of GLAMPING_PROPERTY_AMENITY_FIELDS) {
    if (!f.mapsToSiteBuilderSlug) continue;
    const slug = f.mapsToSiteBuilderSlug;
    if (!out[slug]) out[slug] = [];
    out[slug].push({ column: f.column, scope: f.scope });
  }
  return out;
}
