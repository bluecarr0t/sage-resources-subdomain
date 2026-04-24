/**
 * Map comps v2 web gap-fill candidates into rows compatible with `all_glamping_properties`
 * for `comps_v2_web_research_finds` inserts (plus run_id / comps_stable_id / pipeline_source).
 */

import type { CompsV2Candidate } from '@/lib/comps-v2/types';

const WEB_PIPELINE_SOURCES = new Set(['tavily_gap_fill', 'firecrawl_gap_fill']);

export function isWebResearchPipelineSource(sourceTable: string): boolean {
  return WEB_PIPELINE_SOURCES.has(sourceTable);
}

function n(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

/**
 * Core glamping-shaped fields (omit `id` so BIGSERIAL assigns).
 * Caller adds: run_id, comps_stable_id, pipeline_source (and inserted_at is DB default).
 */
export function compsV2WebCandidateToGlampingRow(c: CompsV2Candidate): Record<string, unknown> {
  const sr = c.seasonal_rates ?? ({} as CompsV2Candidate['seasonal_rates']);
  const descParts = [c.description?.trim(), c.location_detail?.trim()].filter(Boolean);
  const description = descParts.length ? descParts.join('\n\n') : null;

  return {
    research_status: 'new',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    property_name: c.property_name?.trim() || 'Unknown',
    site_name: null,
    slug: null,
    property_type: c.property_type ?? null,
    source: 'comps_v2_web_research',
    discovery_source: 'comps_v2_web_research',
    date_added: null,
    date_updated: null,
    address: null,
    city: c.city?.trim() ?? '',
    state: (c.state ?? '').trim().toUpperCase().slice(0, 2) || null,
    zip_code: null,
    country: 'USA',
    lat: n(c.geo_lat ?? null),
    lon: n(c.geo_lng ?? null),
    property_total_sites: n(c.property_total_sites),
    quantity_of_units: n(c.quantity_of_units),
    year_site_opened: null,
    operating_season_months: c.operating_season_months ?? null,
    number_of_locations: null,
    unit_type: c.unit_type ?? null,
    unit_capacity: null,
    unit_sq_ft: null,
    unit_description: null,
    unit_bed: null,
    unit_shower: null,
    unit_water: null,
    unit_electricity: null,
    unit_picnic_table: null,
    unit_wifi: null,
    unit_pets: null,
    unit_private_bathroom: null,
    unit_full_kitchen: null,
    unit_kitchenette: null,
    unit_ada_accessibility: null,
    unit_patio: null,
    unit_air_conditioning: null,
    unit_gas_fireplace: null,
    unit_hot_tub_or_sauna: null,
    unit_hot_tub: null,
    unit_sauna: null,
    unit_cable: null,
    unit_campfires: null,
    unit_charcoal_grill: null,
    unit_mini_fridge: null,
    unit_bathtub: null,
    unit_wood_burning_stove: null,
    rate_unit_rates_by_year: null,
    rate_avg_retail_daily_rate: n(c.avg_retail_daily_rate),
    rate_winter_weekday: n(sr.winter_weekday),
    rate_winter_weekend: n(sr.winter_weekend),
    rate_spring_weekday: n(sr.spring_weekday),
    rate_spring_weekend: n(sr.spring_weekend),
    rate_summer_weekday: n(sr.summer_weekday),
    rate_summer_weekend: n(sr.summer_weekend),
    rate_fall_weekday: n(sr.fall_weekday),
    rate_fall_weekend: n(sr.fall_weekend),
    rate_category: null,
    property_laundry: null,
    property_playground: null,
    property_pool: null,
    property_food_on_site: null,
    property_sauna: null,
    property_hot_tub: null,
    property_restaurant: null,
    property_dog_park: null,
    property_clubhouse: null,
    property_alcohol_available: null,
    property_golf_cart_rental: null,
    property_waterpark: null,
    property_general_store: null,
    property_waterfront: null,
    property_extended_stay: null,
    property_family_friendly: null,
    property_remote_work_friendly: null,
    property_fitness_room: null,
    property_propane_refilling_station: null,
    property_pickball_courts: null,
    url: c.url?.trim() || null,
    phone_number: null,
    description,
    minimum_nights: null,
    rv_vehicle_length: null,
    rv_parking: null,
    rv_accommodates_slideout: null,
    rv_surface_type: null,
    rv_surface_level: null,
    rv_vehicles_fifth_wheels: null,
    rv_vehicles_class_a_rvs: null,
    rv_vehicles_class_b_rvs: null,
    rv_vehicles_class_c_rvs: null,
    rv_vehicles_toy_hauler: null,
    rv_sewer_hook_up: null,
    rv_electrical_hook_up: null,
    rv_generators_allowed: null,
    rv_water_hookup: null,
    activities_fishing: null,
    activities_surfing: null,
    activities_horseback_riding: null,
    activities_paddling: null,
    activities_climbing: null,
    activities_off_roading_ohv: null,
    activities_boating: null,
    activities_swimming: null,
    activities_wind_sports: null,
    activities_snow_sports: null,
    activities_whitewater_paddling: null,
    activities_fall_fun: null,
    activities_hiking: null,
    activities_wildlife_watching: null,
    activities_biking: null,
    activities_canoeing_kayaking: null,
    activities_hunting: null,
    activities_golf: null,
    activities_backpacking: null,
    activities_historic_sightseeing: null,
    activities_scenic_drives: null,
    activities_stargazing: null,
    setting_ranch: null,
    setting_beach: null,
    setting_coastal: null,
    setting_suburban: null,
    setting_forest: null,
    setting_field: null,
    setting_wetlands: null,
    setting_hot_spring: null,
    setting_desert: null,
    setting_canyon: null,
    setting_waterfall: null,
    setting_swimming_hole: null,
    setting_lake: null,
    setting_cave: null,
    setting_redwoods: null,
    setting_farm: null,
    river_stream_or_creek: null,
    setting_mountainous: null,
    quality_score: null,
  };
}

export function webPipelineSourceForCandidate(c: CompsV2Candidate): 'tavily_gap_fill' | 'firecrawl_gap_fill' | null {
  if (c.source_table === 'firecrawl_gap_fill') return 'firecrawl_gap_fill';
  if (c.source_table === 'tavily_gap_fill') return 'tavily_gap_fill';
  return null;
}
