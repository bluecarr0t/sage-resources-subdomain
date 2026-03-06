/**
 * Proximity utilities for Anchor Point Insights
 * Distance calculation, band assignment, and drive-time estimation
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Distance bands for proximity analysis (miles) */
export const DISTANCE_BANDS = ['0-15', '15-30', '30-50', '50-75', '75+'] as const;
export type DistanceBand = (typeof DISTANCE_BANDS)[number];

/**
 * Assign a distance band based on miles to anchor point
 */
export function getDistanceBand(miles: number): DistanceBand {
  if (miles < 15) return '0-15';
  if (miles < 30) return '15-30';
  if (miles < 50) return '30-50';
  if (miles < 75) return '50-75';
  return '75+';
}

/**
 * Estimate drive time in hours from distance
 * Uses ~30 mph average for mountain/rural roads
 */
export function estimateDriveTimeHours(
  miles: number,
  avgMph: number = 30
): number {
  if (miles <= 0 || avgMph <= 0) return 0;
  return miles / avgMph;
}
