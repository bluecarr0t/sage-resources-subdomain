/**
 * County name matching utility to link CSV data with GeoJSON features
 */

import { normalizeCountyName } from './parse-population-csv';

export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    [key: string]: any;
    NAME?: string;
    NAMELSAD?: string;
    NAME_LSAD?: string;
    GEOID?: string;
    STATE?: string;
    COUNTY?: string;
  };
  geometry: any;
}

/**
 * Extract county name from various GeoJSON property formats
 */
export function extractCountyNameFromFeature(feature: GeoJSONFeature): string | null {
  const props = feature.properties;

  // Try various common property names
  const candidates = [
    props.NAMELSAD, // "Autauga County, Alabama"
    props.NAME_LSAD, // Alternative format
    props.NAME, // "Autauga County"
    props.COUNTYFP && props.STATEFP
      ? `${props.NAME || ''} County, ${props.STATE || ''}`
      : null,
  ].filter(Boolean) as string[];

  if (candidates.length === 0) {
    return null;
  }

  // Prefer NAMELSAD as it typically includes state
  return candidates[0];
}

/**
 * Match a normalized county name to a GeoJSON feature
 */
export function matchCountyToFeature(
  normalizedCountyName: string,
  feature: GeoJSONFeature
): boolean {
  const featureName = extractCountyNameFromFeature(feature);
  if (!featureName) {
    return false;
  }

  const normalizedFeatureName = normalizeCountyName(featureName);
  return normalizedFeatureName === normalizedCountyName;
}

/**
 * Find matching GeoJSON feature for a county name
 */
export function findMatchingFeature(
  countyName: string,
  features: GeoJSONFeature[]
): GeoJSONFeature | null {
  const normalizedName = normalizeCountyName(countyName);

  for (const feature of features) {
    if (matchCountyToFeature(normalizedName, feature)) {
      return feature;
    }
  }

  return null;
}

/**
 * Match all counties from lookup data to GeoJSON features
 * Returns a map of feature index to population data
 * Supports both FIPS code matching (preferred) and county name matching (fallback)
 */
export function matchCountiesToFeatures(
  populationLookup: { [key: string]: { 2010: number | null; 2020: number | null } },
  features: GeoJSONFeature[],
  fipsLookup?: { [fips: string]: { 2010: number | null; 2020: number | null; change: number | null; name: string; geoId: string } }
): Map<number, { 2010: number | null; 2020: number | null; change: number | null; countyName: string }> {
  const matches = new Map<number, { 2010: number | null; 2020: number | null; change: number | null; countyName: string }>();
  const matchedIndices = new Set<number>();
  let fipsMatches = 0;
  let nameMatches = 0;
  const unmatched: string[] = [];

  // First, try FIPS code matching (more reliable)
  if (fipsLookup) {
    // Log sample feature to debug structure
    if (features.length > 0 && typeof window !== 'undefined') {
      const sampleProps = features[0].properties;
      console.log('Sample GeoJSON feature properties:', Object.keys(sampleProps));
      console.log('Sample feature GEO_ID:', sampleProps.GEO_ID);
      console.log('Sample feature STATE/COUNTY:', sampleProps.STATE, sampleProps.COUNTY);
      console.log('FIPS lookup keys sample:', Object.keys(fipsLookup).slice(0, 10));
      console.log(`Total FIPS lookup keys: ${Object.keys(fipsLookup).length}`);
    }
    
    let unmatchedFipsCodes: string[] = [];
    let unmatchedSample: Array<{ fips: string; state: any; county: any; geoid?: string }> = [];
    
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const props = feature.properties;
      
      let fipsCode: string | null = null;
      
      // Try multiple methods to get FIPS code (in order of preference):
      // 1. Extract from GEO_ID property (most reliable - format: "0500000US01001" -> "01001")
      if (props.GEO_ID) {
        const geoid = String(props.GEO_ID).trim();
        const match = geoid.match(/US(\d+)$/);
        if (match) {
          let extracted = match[1];
          // Ensure it's exactly 5 digits
          if (extracted.length < 5) {
            extracted = extracted.padStart(5, '0');
          } else if (extracted.length > 5) {
            extracted = extracted.slice(-5);
          }
          fipsCode = extracted;
        }
      }
      // 2. Construct from STATE and COUNTY codes (fallback)
      // Plotly dataset has STATE as "01" and COUNTY as "001", combine to get "01001"
      else if (props.STATE !== undefined && props.STATE !== null && props.COUNTY !== undefined && props.COUNTY !== null) {
        const stateCode = String(props.STATE).padStart(2, '0');
        const countyCode = String(props.COUNTY).padStart(3, '0');
        fipsCode = stateCode + countyCode;
      }
      // 3. Direct id property (plotly dataset top-level id, might be in properties)
      else if (props.id && typeof props.id === 'string') {
        fipsCode = String(props.id).trim();
      }
      // 4. Alternative GEOID properties
      else if (props.GEOID || props.geoid) {
        const geoid = String(props.GEOID || props.geoid).trim();
        if (geoid.match(/^\d{5}$/)) {
          // Already a 5-digit FIPS
          fipsCode = geoid;
        } else {
          // Try to extract from format like "US01001"
          const match = geoid.match(/US(\d+)$/) || geoid.match(/(\d+)$/);
          if (match) {
            let extracted = match[1];
            if (extracted.length < 5) {
              extracted = extracted.padStart(5, '0');
            } else if (extracted.length > 5) {
              extracted = extracted.slice(-5);
            }
            fipsCode = extracted;
          }
        }
      }
      
      // Ensure it's a 5-digit FIPS code
      if (fipsCode) {
        fipsCode = fipsCode.trim();
        // Pad to exactly 5 digits (preserving leading zeros)
        if (fipsCode.length < 5) {
          fipsCode = fipsCode.padStart(5, '0');
        } else if (fipsCode.length > 5) {
          // Take last 5 digits if longer
          fipsCode = fipsCode.slice(-5);
        }
      }
      
      if (fipsCode) {
        if (fipsLookup[fipsCode]) {
          const popData = fipsLookup[fipsCode];
          matches.set(i, {
            2010: popData[2010],
            2020: popData[2020],
            change: popData.change,
            countyName: popData.name,
          });
          matchedIndices.add(i);
          fipsMatches++;
        } else {
          // Track unmatched FIPS codes for debugging
          if (unmatchedFipsCodes.length < 100) {
            unmatchedFipsCodes.push(fipsCode);
          }
          if (unmatchedSample.length < 10) {
            unmatchedSample.push({
              fips: fipsCode,
              state: props.STATE,
              county: props.COUNTY,
              geoid: props.GEO_ID,
            });
          }
        }
      }
    }
    
    // Log diagnostic information
    if (typeof window !== 'undefined' && unmatchedSample.length > 0) {
      console.warn(`⚠️ ${features.length - fipsMatches} features could not be matched by FIPS code`);
      console.log('Sample unmatched FIPS codes:', unmatchedFipsCodes.slice(0, 10));
      console.log('Sample unmatched features:', unmatchedSample);
    }
  }

  // Then, fallback to county name matching for any unmatched features
  for (const [normalizedKey, population] of Object.entries(populationLookup)) {
    let matched = false;

    for (let i = 0; i < features.length; i++) {
      // Skip if already matched by FIPS
      if (matchedIndices.has(i)) continue;

      const feature = features[i];
      const featureName = extractCountyNameFromFeature(feature);
      
      if (featureName && normalizeCountyName(featureName) === normalizedKey) {
        // Calculate change if not available from FIPS lookup
        const change = population[2010] !== null && population[2020] !== null && population[2010]! > 0
          ? parseFloat(((population[2020]! - population[2010]!) / population[2010]! * 100).toFixed(2))
          : null;
        
        matches.set(i, {
          ...population,
          change: change,
          countyName: featureName,
        });
        matchedIndices.add(i);
        matched = true;
        nameMatches++;
        break;
      }
    }

    if (!matched && !fipsLookup) {
      unmatched.push(normalizedKey);
    }
  }

  if (typeof window !== 'undefined') {
    console.log(`✅ Matched ${matches.size} counties (${fipsMatches} by FIPS, ${nameMatches} by name)`);
    if (unmatched.length > 0 && !fipsLookup) {
      console.warn(`⚠️ Failed to match ${unmatched.length} counties:`, unmatched.slice(0, 10));
    }
  }

  return matches;
}
