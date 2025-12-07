/**
 * Type definitions for the sage table from Supabase
 */
export interface SageProperty {
  id: number;
  duplicate_note: string | null;
  u_source: string | null;
  source: string | null;
  date_added: string | null;
  date_updated: string | null;
  property_name: string | null;
  slug: string | null;
  site_name: string | null;
  unit_type: string | null;
  property_type: string | null;
  property_total_sites: string | null;
  quantity_of_units: string | null;
  unit_capacity: string | null;
  year_site_opened: string | null;
  operating_season_months: string | null;
  num_locations: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  occupancy_rate_2024: string | null;
  avg_retail_daily_rate_2024: string | null;
  high_rate_2024: string | null;
  low_rate_2024: string | null;
  retail_daily_rate_fees_2024: string | null;
  revpar_2024: string | null;
  occupancy_rate_2025: string | null;
  retail_daily_rate_ytd: string | null;
  retail_daily_rate_fees_ytd: string | null;
  high_rate_2025: string | null;
  low_rate_2025: string | null;
  revpar_2025: string | null;
  avg_rate_next_12_months: string | null;
  high_rate_next_12_months: string | null;
  low_rate_next_12_months: string | null;
  winter_weekday: string | null;
  winter_weekend: string | null;
  spring_weekday: string | null;
  spring_weekend: string | null;
  summer_weekday: string | null;
  summer_weekend: string | null;
  fall_weekday: string | null;
  fall_weekend: string | null;
  url: string | null;
  description: string | null;
  minimum_nights: string | null;
  getting_there: string | null;
  phone_number: string | null;
  lon: string | null;
  lat: string | null;
  toilet: string | null;
  hot_tub_sauna: string | null;
  pool: string | null;
  pets: string | null;
  water: string | null;
  shower: string | null;
  trash: string | null;
  cooking_equipment: string | null;
  picnic_table: string | null;
  wifi: string | null;
  laundry: string | null;
  campfires: string | null;
  playground: string | null;
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
  fishing: string | null;
  surfing: string | null;
  horseback_riding: string | null;
  paddling: string | null;
  climbing: string | null;
  off_roading_ohv: string | null;
  boating: string | null;
  swimming: string | null;
  wind_sports: string | null;
  snow_sports: string | null;
  whitewater_paddling: string | null;
  fall_fun: string | null;
  hiking: string | null;
  wildlife_watching: string | null;
  biking: string | null;
  ranch: string | null;
  beach: string | null;
  coastal: string | null;
  suburban: string | null;
  forest: string | null;
  field: string | null;
  wetlands: string | null;
  hot_spring: string | null;
  desert: string | null;
  canyon: string | null;
  waterfall: string | null;
  swimming_hole: string | null;
  lake: string | null;
  cave: string | null;
  redwoods: string | null;
  farm: string | null;
  river_stream_creek: string | null;
  mountainous: string | null;
  sage_p_amenity_food_on_site: string | null;
  sage_p_amenity_waterfront: string | null;
  sage_p_amenity_restaurant: string | null;
  sage_s_amenity_private_bathroom: string | null;
  dog_park: string | null;
  clubhouse: string | null;
  canoeing_kayaking: string | null;
  alcohol_available: string | null;
  golf_cart_rental: string | null;
  private_bathroom: string | null;
  waterpark: string | null;
  kitchen: string | null;
  patio: string | null;
  electricity: string | null;
  general_store: string | null;
  cable: string | null;
  charcoal_grill: string | null;
  sewer_hook_up: string | null;
  electrical_hook_up: string | null;
  generators_allowed: string | null;
  water_hookup: string | null;
  data_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Google Places API fields
  google_place_id: string | null;
  google_phone_number: string | null;
  google_website_uri: string | null;
  google_description: string | null;
  google_dine_in: boolean | null;
  google_takeout: boolean | null;
  google_delivery: boolean | null;
  google_serves_breakfast: boolean | null;
  google_serves_lunch: boolean | null;
  google_serves_dinner: boolean | null;
  google_serves_brunch: boolean | null;
  google_outdoor_seating: boolean | null;
  google_live_music: boolean | null;
  google_menu_uri: string | null;
  google_place_types: string[] | null;
  google_primary_type: string | null;
  google_primary_type_display_name: string | null;
  google_photos: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName: string;
      uri?: string;
      photoUri?: string;
    }>;
  }> | null;
  google_icon_uri: string | null;
  google_icon_background_color: string | null;
  google_reservable: boolean | null;
  google_rating: number | null;
  google_user_rating_total: number | null;
  // Additional Google Places API fields
  google_business_status: string | null;
  google_opening_hours: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  } | null;
  google_current_opening_hours: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  } | null;
  google_parking_options: {
    parkingLot?: boolean;
    parkingValet?: boolean;
    parkingGarage?: boolean;
    parkingStreet?: boolean;
    parkingFree?: boolean;
    parkingPaid?: boolean;
  } | null;
  google_price_level: number | null; // 0-4: FREE, INEXPENSIVE, MODERATE, EXPENSIVE, VERY_EXPENSIVE
  google_payment_options: {
    acceptsCreditCards?: boolean;
    acceptsDebitCards?: boolean;
    acceptsCashOnly?: boolean;
    acceptsNfc?: boolean;
  } | null;
  google_wheelchair_accessible_parking: boolean | null;
  google_wheelchair_accessible_entrance: boolean | null;
  google_wheelchair_accessible_restroom: boolean | null;
  google_wheelchair_accessible_seating: boolean | null;
  google_allows_dogs: boolean | null;
  // Quality score
  quality_score: number | null;
}

/**
 * Helper function to parse latitude/longitude from string to number
 */
export function parseCoordinates(
  lat: string | number | null,
  lon: string | number | null
): [number, number] | null {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return null;

  // Handle both string and number types
  const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));

  // Validate coordinates
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return [latitude, longitude];
}

/**
 * Check if coordinates are within USA or Canada bounds
 * USA (mainland): approximately 24°N to 49°N, -125°W to -66°W
 * Alaska: 51°N to 71°N, -179°W to -130°W
 * Hawaii: 18°N to 22°N, -160°W to -154°W
 * Canada: approximately 41°N to 83°N, -141°W to -52°W (mainland)
 * Combined bounds: 18°N to 85°N, -179°W to -50°W (includes Alaska and Hawaii)
 */
export function isInUSAOrCanada(lat: number, lon: number): boolean {
  // Latitude bounds (18°N to 85°N) - includes Hawaii (starts at ~18°N)
  if (lat < 18 || lat > 85) return false;
  
  // Longitude bounds (-179°W to -50°W) - includes all of Alaska (extends to -179°W)
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
      
      // Filter to only USA and Canada
      if (!isInUSAOrCanada(coords[0], coords[1])) return null;
      
      return { ...prop, coordinates: coords };
    })
    .filter((prop): prop is SageProperty & { coordinates: [number, number] } => prop !== null);
}

