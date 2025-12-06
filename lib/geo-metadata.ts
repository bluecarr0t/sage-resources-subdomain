/**
 * Utility functions for geo-location metadata
 * Used for location-based landing pages to enhance local SEO
 */

// State name to coordinates mapping (approximate center of state)
// Used for geo metadata on location-based landing pages
const STATE_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Alabama': { lat: 32.806671, lon: -86.791130 },
  'Alaska': { lat: 61.370716, lon: -152.404419 },
  'Arizona': { lat: 33.729759, lon: -111.431221 },
  'Arkansas': { lat: 34.969704, lon: -92.373123 },
  'California': { lat: 36.116203, lon: -119.681564 },
  'Colorado': { lat: 39.059811, lon: -105.311104 },
  'Connecticut': { lat: 41.597782, lon: -72.755371 },
  'Delaware': { lat: 39.318523, lon: -75.507141 },
  'Florida': { lat: 27.766279, lon: -81.686783 },
  'Georgia': { lat: 33.040619, lon: -83.643074 },
  'Hawaii': { lat: 21.094318, lon: -157.498337 },
  'Idaho': { lat: 44.240459, lon: -114.478828 },
  'Illinois': { lat: 40.349457, lon: -88.986137 },
  'Indiana': { lat: 39.849426, lon: -86.258278 },
  'Iowa': { lat: 42.011539, lon: -93.210526 },
  'Kansas': { lat: 38.526600, lon: -96.726486 },
  'Kentucky': { lat: 37.668140, lon: -84.670067 },
  'Louisiana': { lat: 31.169546, lon: -91.867805 },
  'Maine': { lat: 44.323535, lon: -69.765261 },
  'Maryland': { lat: 39.063946, lon: -76.802101 },
  'Massachusetts': { lat: 42.230171, lon: -71.530106 },
  'Michigan': { lat: 43.326618, lon: -84.536095 },
  'Minnesota': { lat: 45.694454, lon: -93.900192 },
  'Mississippi': { lat: 32.741646, lon: -89.678696 },
  'Missouri': { lat: 38.456085, lon: -92.288368 },
  'Montana': { lat: 46.921925, lon: -110.454353 },
  'Nebraska': { lat: 41.125370, lon: -98.268082 },
  'Nevada': { lat: 38.313515, lon: -117.055374 },
  'New Hampshire': { lat: 43.452492, lon: -71.563896 },
  'New Jersey': { lat: 40.298904, lon: -74.521011 },
  'New Mexico': { lat: 34.840515, lon: -106.248482 },
  'New York': { lat: 42.165726, lon: -74.948051 },
  'North Carolina': { lat: 35.630066, lon: -79.806419 },
  'North Dakota': { lat: 47.528912, lon: -99.784012 },
  'Ohio': { lat: 40.388783, lon: -82.764915 },
  'Oklahoma': { lat: 35.565342, lon: -96.928917 },
  'Oregon': { lat: 44.572021, lon: -122.070938 },
  'Pennsylvania': { lat: 40.590752, lon: -77.209755 },
  'Rhode Island': { lat: 41.680893, lon: -71.51178 },
  'South Carolina': { lat: 33.856892, lon: -80.945007 },
  'South Dakota': { lat: 44.299782, lon: -99.438828 },
  'Tennessee': { lat: 35.747845, lon: -86.692345 },
  'Texas': { lat: 31.054487, lon: -97.563461 },
  'Utah': { lat: 40.150032, lon: -111.862434 },
  'Vermont': { lat: 44.045876, lon: -72.710686 },
  'Virginia': { lat: 37.769337, lon: -78.169968 },
  'Washington': { lat: 47.400902, lon: -121.490494 },
  'West Virginia': { lat: 38.491226, lon: -80.954453 },
  'Wisconsin': { lat: 44.268543, lon: -89.616508 },
  'Wyoming': { lat: 42.755966, lon: -107.302490 },
};

/**
 * Extract state name from location string or slug
 */
function extractStateFromLocation(location: string | undefined, slug: string): string | null {
  if (!location) {
    // Try to extract from slug (e.g., "glamping-feasibility-study-texas")
    const stateNames = Object.keys(STATE_COORDINATES);
    const lowerSlug = slug.toLowerCase();
    
    for (const state of stateNames) {
      if (lowerSlug.includes(state.toLowerCase())) {
        return state;
      }
    }
    
    // Try common abbreviations
    const stateAbbrevMap: Record<string, string> = {
      'california': 'California', 'texas': 'Texas', 'florida': 'Florida',
      'colorado': 'Colorado', 'arizona': 'Arizona', 'utah': 'Utah',
      'oregon': 'Oregon', 'north-carolina': 'North Carolina',
      'georgia': 'Georgia', 'tennessee': 'Tennessee'
    };
    
    for (const [key, stateName] of Object.entries(stateAbbrevMap)) {
      if (lowerSlug.includes(key)) {
        return stateName;
      }
    }
  }
  
  return location || null;
}

/**
 * Get geo coordinates for a location-based landing page
 */
export function getGeoCoordinates(location: string | undefined, slug: string): { latitude: string; longitude: string } | null {
  const stateName = extractStateFromLocation(location, slug);
  
  if (!stateName) {
    return null;
  }
  
  const coords = STATE_COORDINATES[stateName];
  if (!coords) {
    return null;
  }
  
  return {
    latitude: coords.lat.toString(),
    longitude: coords.lon.toString(),
  };
}

/**
 * Generate geo metadata for location-based pages
 */
export function generateGeoMetadata(location: string | undefined, slug: string) {
  const coords = getGeoCoordinates(location, slug);
  
  if (!coords) {
    return {};
  }
  
  return {
    geo: {
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
  };
}