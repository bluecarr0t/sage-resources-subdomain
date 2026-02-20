/**
 * Type definitions for the all_glamping_properties table from Supabase
 * Updated to match v4 column rename/reorder (unit_/property_/activities_/setting_ prefixes)
 */
export interface SageProperty {
  // CORE IDENTITY
  id: number;
  property_name: string | null;
  site_name: string | null;
  slug: string | null;
  property_type: string | null;
  research_status: string | null;
  is_glamping_property: string | null;
  is_closed: string | null;

  // SOURCE & TRACKING
  source: string | null;
  discovery_source: string | null;
  date_added: string | null;
  date_updated: string | null;

  // LOCATION
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  lat: string | number | null;
  lon: string | number | null;

  // OPERATIONAL
  property_total_sites: string | number | null;
  quantity_of_units: string | number | null;
  year_site_opened: string | number | null;
  operating_season_months: string | null;
  number_of_locations: string | number | null;

  // UNIT DETAILS (unit_ group)
  unit_type: string | null;
  unit_capacity: string | null;
  unit_sq_ft: string | number | null;
  unit_description: string | null;
  unit_bed: string | null;
  unit_shower: string | null;
  unit_water: string | null;
  unit_electricity: string | null;
  unit_picnic_table: string | null;
  unit_wifi: string | null;
  unit_pets: string | null;
  unit_private_bathroom: string | null;
  unit_full_kitchen: string | null;
  unit_kitchenette: string | null;
  unit_ada_accessibility: string | null;
  unit_patio: string | null;
  unit_air_conditioning: string | null;
  unit_gas_fireplace: string | null;
  unit_hot_tub_or_sauna: string | null;
  unit_hot_tub: string | null;
  unit_sauna: string | null;
  unit_cable: string | null;
  unit_mini_fridge: string | null;
  unit_bathtub: string | null;
  unit_wood_burning_stove: string | null;
  rate_unit_rates_by_year: Record<string, unknown> | null;

  // PRICING
  rate_avg_retail_daily_rate: string | number | null;
  rate_winter_weekday: string | number | null;
  rate_winter_weekend: string | number | null;
  rate_spring_weekday: string | number | null;
  rate_spring_weekend: string | number | null;
  rate_summer_weekday: string | number | null;
  rate_summer_weekend: string | number | null;
  rate_fall_weekday: string | number | null;
  rate_fall_weekend: string | number | null;
  rate_category: string | null;

  // PROPERTY AMENITIES (property_ group)
  property_laundry: string | null;
  property_playground: string | null;
  property_pool: string | null;
  property_food_on_site: string | null;
  property_sauna: string | null;
  property_hot_tub: string | null;
  property_restaurant: string | null;
  property_dog_park: string | null;
  property_clubhouse: string | null;
  property_alcohol_available: string | null;
  property_golf_cart_rental: string | null;
  property_waterpark: string | null;
  property_general_store: string | null;
  property_waterfront: string | null;
  property_extended_stay: string | null;
  property_family_friendly: string | null;
  property_remote_work_friendly: string | null;
  property_fitness_room: string | null;
  property_propane_refilling_station: string | null;
  property_pickball_courts: string | null;

  // CONTACT & INFO
  url: string | null;
  phone_number: string | null;
  description: string | null;
  minimum_nights: string | null;

  // OTHER AMENITIES
  unit_campfires: string | null;
  unit_charcoal_grill: string | null;

  // RV-SPECIFIC (rv_ group)
  rv_vehicle_length: string | null;
  rv_parking: string | null;
  rv_accommodates_slideout: string | null;
  rv_surface_type: string | null;
  rv_surface_level: string | null;
  rv_vehicles_fifth_wheels: string | null;
  rv_vehicles_class_a_rvs: string | null;
  rv_vehicles_class_b_rvs: string | null;
  rv_vehicles_class_c_rvs: string | null;
  rv_vehicles_toy_hauler: string | null;
  rv_sewer_hook_up: string | null;
  rv_electrical_hook_up: string | null;
  rv_generators_allowed: string | null;
  rv_water_hookup: string | null;

  // ACTIVITIES (activities_ group)
  activities_fishing: string | null;
  activities_surfing: string | null;
  activities_horseback_riding: string | null;
  activities_paddling: string | null;
  activities_climbing: string | null;
  activities_off_roading_ohv: string | null;
  activities_boating: string | null;
  activities_swimming: string | null;
  activities_wind_sports: string | null;
  activities_snow_sports: string | null;
  activities_whitewater_paddling: string | null;
  activities_fall_fun: string | null;
  activities_hiking: string | null;
  activities_wildlife_watching: string | null;
  activities_biking: string | null;
  activities_canoeing_kayaking: string | null;
  activities_hunting: string | null;
  activities_golf: string | null;
  activities_backpacking: string | null;
  activities_historic_sightseeing: string | null;
  activities_scenic_drives: string | null;
  activities_stargazing: string | null;

  // SETTINGS (setting_ group)
  setting_ranch: string | null;
  setting_beach: string | null;
  setting_coastal: string | null;
  setting_suburban: string | null;
  setting_forest: string | null;
  setting_field: string | null;
  setting_wetlands: string | null;
  setting_hot_spring: string | null;
  setting_desert: string | null;
  setting_canyon: string | null;
  setting_waterfall: string | null;
  setting_swimming_hole: string | null;
  setting_lake: string | null;
  setting_cave: string | null;
  setting_redwoods: string | null;
  setting_farm: string | null;
  river_stream_or_creek: string | null;
  setting_mountainous: string | null;

  // SYSTEM METADATA
  quality_score: number | null;
  created_at: string | null;
  updated_at: string | null;

  // Google Places API fields (from google_places_data table, joined or fetched separately)
  google_place_id?: string | null;
  google_phone_number?: string | null;
  google_website_uri?: string | null;
  google_description?: string | null;
  google_dine_in?: boolean | null;
  google_takeout?: boolean | null;
  google_delivery?: boolean | null;
  google_serves_breakfast?: boolean | null;
  google_serves_lunch?: boolean | null;
  google_serves_dinner?: boolean | null;
  google_serves_brunch?: boolean | null;
  google_outdoor_seating?: boolean | null;
  google_live_music?: boolean | null;
  google_menu_uri?: string | null;
  google_place_types?: string[] | null;
  google_primary_type?: string | null;
  google_primary_type_display_name?: string | null;
  google_photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName: string;
      uri?: string;
      photoUri?: string;
    }>;
  }> | null;
  google_icon_uri?: string | null;
  google_icon_background_color?: string | null;
  google_reservable?: boolean | null;
  google_rating?: number | null;
  google_user_rating_total?: number | null;
  google_business_status?: string | null;
  google_opening_hours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  } | null;
  google_current_opening_hours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  } | null;
  google_parking_options?: {
    parkingLot?: boolean;
    parkingValet?: boolean;
    parkingGarage?: boolean;
    parkingStreet?: boolean;
    parkingFree?: boolean;
    parkingPaid?: boolean;
  } | null;
  google_price_level?: number | null;
  google_payment_options?: {
    acceptsCreditCards?: boolean;
    acceptsDebitCards?: boolean;
    acceptsCashOnly?: boolean;
    acceptsNfc?: boolean;
  } | null;
  google_wheelchair_accessible_parking?: boolean | null;
  google_wheelchair_accessible_entrance?: boolean | null;
  google_wheelchair_accessible_restroom?: boolean | null;
  google_wheelchair_accessible_seating?: boolean | null;
  google_allows_dogs?: boolean | null;
}

/**
 * Helper function to parse latitude/longitude from string to number
 */
export function parseCoordinates(
  lat: string | number | null,
  lon: string | number | null
): [number, number] | null {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return null;

  const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));

  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return [latitude, longitude];
}

/**
 * Check if coordinates are within USA or Canada bounds
 */
export function isInUSAOrCanada(lat: number, lon: number): boolean {
  if (lat < 18 || lat > 85) return false;
  if (lon < -179 || lon > -50) return false;
  return true;
}

/**
 * Filter properties that have valid coordinates and are in USA or Canada
 */
export function filterPropertiesWithCoordinates(
  properties: SageProperty[]
): Array<SageProperty & { coordinates: [number, number] }> {
  return properties
    .map((prop) => {
      const coords = parseCoordinates(prop.lat, prop.lon);
      if (!coords) return null;
      if (!isInUSAOrCanada(coords[0], coords[1])) return null;
      return { ...prop, coordinates: coords };
    })
    .filter((prop): prop is SageProperty & { coordinates: [number, number] } => prop !== null);
}
