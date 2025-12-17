/**
 * TypeScript types for National Parks data
 */

export interface NationalPark {
  id: number;
  name: string;
  date_established: string | null;
  area_2021: string | null;
  recreation_visitors_2021: string | null;
  description: string | null;
  park_code: string | null;
  state: string | null;
  acres: number | null;
  latitude: number | null;
  longitude: number | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
  // Visitor Access & Operations
  operating_months: string | null;
  best_time_to_visit: string | null;
  annual_pass_available: boolean | null;
  reservation_required: boolean | null;
  reservation_website: string | null;
  // Pet & Animal Policies
  dogs_allowed: boolean | null;
  dogs_allowed_restrictions: string | null;
  pet_friendly_areas: string | null;
  // Camping & Accommodations
  camping_available: boolean | null;
  number_of_campgrounds: number | null;
  camping_reservation_required: boolean | null;
  lodging_available: boolean | null;
  rv_camping_available: boolean | null;
  // Activities & Recreation
  hiking_trails_available: boolean | null;
  number_of_trails: number | null;
  water_activities: string | null;
  wildlife_viewing: boolean | null;
  scenic_drives: boolean | null;
  visitor_centers_count: number | null;
  // Climate & Weather
  average_summer_temp: number | null;
  average_winter_temp: number | null;
  climate_type: string | null;
  snow_season: string | null;
  // Park Features
  notable_landmarks: string | null;
  // Practical Information
  cell_phone_coverage: string | null;
  backcountry_permits_required: boolean | null;
  fire_restrictions: string | null;
  // Additional Statistics
  recreation_visitors_2022: string | null;
  recreation_visitors_2023: string | null;
}

export interface NationalParkWithCoords extends NationalPark {
  coordinates: [number, number];
}

/**
 * Filter national parks that have valid coordinates
 */
export function filterParksWithCoordinates(
  parks: NationalPark[]
): NationalParkWithCoords[] {
  return parks
    .filter(
      (park) =>
        park.latitude !== null &&
        park.longitude !== null &&
        typeof park.latitude === 'number' &&
        typeof park.longitude === 'number' &&
        !isNaN(park.latitude) &&
        !isNaN(park.longitude) &&
        isFinite(park.latitude) &&
        isFinite(park.longitude) &&
        park.latitude >= -90 &&
        park.latitude <= 90 &&
        park.longitude >= -180 &&
        park.longitude <= 180
    )
    .map((park) => ({
      ...park,
      coordinates: [park.latitude!, park.longitude!],
    }));
}
