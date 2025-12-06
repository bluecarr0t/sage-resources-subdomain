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
  created_at: string;
  updated_at: string;
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
