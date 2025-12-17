/**
 * TypeScript types for Private Campgrounds data
 */

export interface PrivateCampground {
  id: number;
  // Basic Info
  name: string;
  state: string | null;
  slug: string | null;
  description: string | null;
  operator: string | null;
  // Location
  latitude: number | null;
  longitude: number | null;
  county: string | null;
  city: string | null;
  region: string | null;
  address: string | null;
  postal_code: string | null;
  // OSM Data
  osm_id: number | null;
  osm_type: string | null;
  osm_tags: Record<string, any> | null;
  // Size & Capacity
  total_sites: number | null;
  rv_sites: number | null;
  tent_sites: number | null;
  acres: number | null;
  // Business Info
  website: string | null;
  phone: string | null;
  email: string | null;
  year_established: number | null;
  // Pricing
  nightly_rate_min: number | null;
  nightly_rate_max: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  seasonal_rates: boolean | null;
  // Visitor Access
  operating_months: string | null;
  best_time_to_visit: string | null;
  reservation_required: boolean | null;
  reservation_website: string | null;
  walk_ins_accepted: boolean | null;
  // Pet Policies
  dogs_allowed: boolean | null;
  dogs_allowed_restrictions: string | null;
  pet_fee: number | null;
  pet_friendly_areas: string | null;
  // Camping Features
  rv_camping_available: boolean | null;
  rv_hookups: string | null;
  max_rv_length: number | null;
  tent_camping_available: boolean | null;
  cabin_rentals: boolean | null;
  glamping_available: boolean | null;
  lodging_available: boolean | null;
  // Amenities
  restrooms: boolean | null;
  showers: boolean | null;
  laundry: boolean | null;
  dump_station: boolean | null;
  wifi_available: boolean | null;
  wifi_free: boolean | null;
  cell_phone_coverage: string | null;
  store: boolean | null;
  playground: boolean | null;
  pool: boolean | null;
  hot_tub: boolean | null;
  // Activities
  hiking_trails_available: boolean | null;
  water_activities: string | null;
  fishing_available: boolean | null;
  swimming_available: boolean | null;
  beach_access: boolean | null;
  boat_ramp: boolean | null;
  wildlife_viewing: boolean | null;
  // Climate
  average_summer_temp: number | null;
  average_winter_temp: number | null;
  climate_type: string | null;
  // Features
  notable_features: string | null;
  nearby_attractions: string | null;
  scenic_views: boolean | null;
  // Practical
  fire_restrictions: string | null;
  quiet_hours: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  nearest_major_city: string | null;
  distance_from_city: number | null;
  // Metadata
  created_at: string;
  updated_at: string;
  last_verified: string | null;
}

export interface PrivateCampgroundWithCoords extends PrivateCampground {
  coordinates: [number, number];
}

/**
 * Filter private campgrounds that have valid coordinates
 */
export function filterCampgroundsWithCoordinates(
  campgrounds: PrivateCampground[]
): PrivateCampgroundWithCoords[] {
  return campgrounds
    .filter(
      (campground) =>
        campground.latitude !== null &&
        campground.longitude !== null &&
        typeof campground.latitude === 'number' &&
        typeof campground.longitude === 'number' &&
        !isNaN(campground.latitude) &&
        !isNaN(campground.longitude) &&
        isFinite(campground.latitude) &&
        isFinite(campground.longitude) &&
        campground.latitude >= -90 &&
        campground.latitude <= 90 &&
        campground.longitude >= -180 &&
        campground.longitude <= 180
    )
    .map((campground) => ({
      ...campground,
      coordinates: [campground.latitude!, campground.longitude!],
    }));
}
