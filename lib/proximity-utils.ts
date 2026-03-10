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

/** Default thresholds (miles) for band boundaries: 0-15, 15-30, 30-50, 50-75, 75+ */
export const DEFAULT_BAND_THRESHOLDS = [15, 30, 50, 75];

/**
 * Derive band labels from thresholds.
 * e.g. [10, 25, 50] -> ['0-10', '10-25', '25-50', '50+']
 */
export function getBandLabelsFromThresholds(thresholds: number[]): string[] {
  if (thresholds.length === 0) return ['0+'];
  const sorted = [...thresholds].sort((a, b) => a - b);
  const labels: string[] = [];
  labels.push(`0-${sorted[0]}`);
  for (let i = 1; i < sorted.length; i++) {
    labels.push(`${sorted[i - 1]}-${sorted[i]}`);
  }
  labels.push(`${sorted[sorted.length - 1]}+`);
  return labels;
}

/**
 * Assign a distance band based on miles using custom thresholds.
 * thresholds e.g. [10, 25, 50] yields bands: 0-10, 10-25, 25-50, 50+
 */
export function getDistanceBandFromBands(miles: number, thresholds: number[]): string {
  if (thresholds.length === 0) return '0+';
  const sorted = [...thresholds].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (miles < sorted[i]) {
      const prev = i === 0 ? 0 : sorted[i - 1];
      return `${prev}-${sorted[i]}`;
    }
  }
  return `${sorted[sorted.length - 1]}+`;
}

/**
 * Assign a distance band based on miles to anchor point (default bands)
 */
export function getDistanceBand(miles: number): DistanceBand {
  const band = getDistanceBandFromBands(miles, DEFAULT_BAND_THRESHOLDS);
  return band as DistanceBand;
}

const MAX_BAND_THRESHOLDS = 10;

/**
 * Parse and validate distance_bands query param (e.g. "0,10,25,50").
 * Returns sorted unique thresholds or null if invalid.
 */
export function parseDistanceBandsParam(value: string | null | undefined): number[] | null {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n) && n > 0);
  if (parts.length === 0 || parts.length > MAX_BAND_THRESHOLDS) return null;
  const sorted = [...new Set(parts)].sort((a, b) => a - b);
  return sorted;
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
