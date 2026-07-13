/**
 * Types for the `airports` table (major US FAA hubs + Canadian gateways).
 */

export type AirportHubSize = 'large' | 'medium' | 'small';

export type Airport = {
  id: number;
  name: string;
  iata_code: string;
  icao_code: string | null;
  city: string | null;
  state_province: string | null;
  country: string;
  latitude: number;
  longitude: number;
  hub_size: AirportHubSize;
  /** Reference-year passenger boardings (enplanements). */
  avg_annual_passengers: number | null;
  traffic_year: number | null;
  traffic_metric: string;
  data_source: string | null;
  created_at: string;
  updated_at: string;
};

export type AirportWithCoords = Airport & {
  coordinates: [number, number];
};

export function airportHasCoordinates(
  airport: Pick<Airport, 'latitude' | 'longitude'>
): boolean {
  return (
    airport.latitude != null &&
    airport.longitude != null &&
    Number.isFinite(Number(airport.latitude)) &&
    Number.isFinite(Number(airport.longitude))
  );
}
