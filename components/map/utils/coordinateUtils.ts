/**
 * Helper function to check if coordinates are likely in Canada
 * Uses coordinate-based detection to identify Canadian locations
 */
export function isLikelyCanadaByCoords(lat: number, lon: number): boolean {
  if (lat < 41.7 || lat >= 85 || lon < -141 || lon > -52) {
    return false;
  }
  if (lat >= 60) return true;
  if (lat >= 41.7 && lat < 60 && lon >= -95 && lon <= -52) return true;
  if (lat >= 48 && lat < 60 && lon >= -139 && lon <= -89) return true;
  if (lat >= 49 && lat < 60) {
    if (lon < -100) return true;
    if (lon >= -100 && lon <= -89 && lat >= 50) return true;
    if (lon >= -95 && lon <= -89 && lat >= 49) return true;
  }
  if (lat >= 45 && lat < 49) {
    if (lon >= -75 && lon <= -52) return true;
    if (lon >= -95 && lon < -75) {
      if (lat >= 46) return true;
      if (lon >= -80) return true;
    }
  }
  if (lat >= 41.7 && lat < 45 && lon >= -95.2 && lon <= -74.3) return true;
  return false;
}

/**
 * Check if coordinates are in North America (US or Canada)
 */
export function isInNorthAmerica(lat: number, lon: number): boolean {
  return lat >= 18 && lat < 85 && lon >= -179 && lon <= -50;
}

/**
 * Extract valid coordinates from a property
 */
export function getPropertyCoordinates(property: any): { lat: number; lon: number } | null {
  const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
  const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
  
  if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
    return null;
  }
  
  return { lat, lon };
}

/**
 * Check if property has valid coordinates
 */
export function hasValidCoordinates(property: any): boolean {
  return getPropertyCoordinates(property) !== null;
}
