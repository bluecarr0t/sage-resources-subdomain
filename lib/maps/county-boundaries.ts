/**
 * County boundaries GeoJSON loading and processing utilities
 */

import { GeoJSONFeature, matchCountiesToFeatures } from '../population/county-matcher';

export interface CountyGeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Default URL for US county boundaries GeoJSON
 * Using US Census TIGER/Line GeoJSON via public CDN
 * Alternative sources:
 * - plotly/datasets: https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json (uses FIPS codes)
 * - Custom conversion from TIGER/Line shapefiles
 */
const DEFAULT_COUNTY_GEOJSON_URL = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';

/**
 * Load county boundaries GeoJSON from URL
 */
export async function loadCountyGeoJSON(url?: string): Promise<CountyGeoJSON> {
  const targetUrl = url || DEFAULT_COUNTY_GEOJSON_URL;
  
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
    }
    
    const geoJson = await response.json() as CountyGeoJSON;
    
    if (!geoJson.type || !geoJson.features) {
      throw new Error('Invalid GeoJSON format');
    }
    
    return geoJson;
  } catch (error) {
    console.error('Error loading county GeoJSON:', error);
    throw error;
  }
}

/**
 * Load county boundaries GeoJSON from local file (server-side only)
 */
export async function loadCountyGeoJSONFromFile(filePath: string): Promise<CountyGeoJSON> {
  if (typeof window !== 'undefined') {
    throw new Error('loadCountyGeoJSONFromFile can only be used server-side');
  }

  const { readFileSync } = await import('fs');
  const fileContent = readFileSync(filePath, 'utf-8');
  const geoJson = JSON.parse(fileContent) as CountyGeoJSON;
  
  if (!geoJson.type || !geoJson.features) {
    throw new Error('Invalid GeoJSON format');
  }
  
  return geoJson;
}

/**
 * Enhance GeoJSON features with population data
 */
export function enhanceGeoJSONWithPopulation(
  geoJson: CountyGeoJSON,
  populationLookup: { [key: string]: { 2010: number | null; 2020: number | null } },
  fipsLookup?: { [fips: string]: { 2010: number | null; 2020: number | null; change: number | null; name: string; geoId: string } }
): CountyGeoJSON {
  const matches = matchCountiesToFeatures(populationLookup, geoJson.features, fipsLookup);
  
  // Create a new features array with enhanced properties
  const enhancedFeatures = geoJson.features.map((feature, index) => {
    const populationData = matches.get(index);
    const props = feature.properties;
    
    // Always set countyName from original properties if not in population data
    let countyName = '';
    if (populationData?.countyName) {
      countyName = populationData.countyName;
    } else if (props.NAMELSAD) {
      countyName = props.NAMELSAD;
    } else if (props.NAME_LSAD) {
      countyName = props.NAME_LSAD;
    } else if (props.NAME) {
      countyName = props.NAME + (props.LSAD ? ' ' + props.LSAD : '');
    }
    
    if (populationData) {
      // Use change from database if available, otherwise calculate it
      const change = populationData.change !== null && populationData.change !== undefined
        ? populationData.change
        : (populationData[2010] !== null && populationData[2020] !== null && populationData[2010]! > 0
          ? parseFloat(((populationData[2020]! - populationData[2010]!) / populationData[2010]! * 100).toFixed(2))
          : null);
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          population2010: populationData[2010],
          population2020: populationData[2020],
          change: change,
          countyName: countyName || populationData.countyName,
        },
      };
    }
    
    // Even without population data, ensure countyName is set
    return {
      ...feature,
      properties: {
        ...feature.properties,
        countyName: countyName,
      },
    };
  });
  
  return {
    ...geoJson,
    features: enhancedFeatures,
  };
}

/**
 * Get population range for color coding
 */
export function getPopulationRange(population: number | null): {
  min: number;
  max: number;
  range: string;
} | null {
  if (population === null || population === undefined) {
    return null;
  }

  // Define population ranges (in thousands for readability)
  const ranges = [
    { min: 0, max: 25, label: '0-25k' },
    { min: 25, max: 50, label: '25k-50k' },
    { min: 50, max: 100, label: '50k-100k' },
    { min: 100, max: 250, label: '100k-250k' },
    { min: 250, max: 500, label: '250k-500k' },
    { min: 500, max: 1000, label: '500k-1M' },
    { min: 1000, max: Infinity, label: '1M+' },
  ];

  const populationInK = population / 1000;

  for (const range of ranges) {
    if (populationInK >= range.min && populationInK < range.max) {
      return {
        min: range.min * 1000,
        max: range.max === Infinity ? Infinity : range.max * 1000,
        range: range.label,
      };
    }
  }

  return null;
}

/**
 * Get color for population value (deprecated - use getChangeColor instead)
 */
export function getPopulationColor(population: number | null, year: '2010' | '2020' = '2020'): string {
  if (population === null || population === undefined) {
    return '#cccccc'; // Gray for no data
  }

  const populationInK = population / 1000;

  // Color scale: light blue -> dark blue
  if (populationInK < 25) return '#e3f2fd'; // Very light blue
  if (populationInK < 50) return '#bbdefb'; // Light blue
  if (populationInK < 100) return '#90caf9'; // Light-medium blue
  if (populationInK < 250) return '#64b5f6'; // Medium blue
  if (populationInK < 500) return '#42a5f5'; // Medium-dark blue
  if (populationInK < 1000) return '#2196f3'; // Dark blue
  return '#1976d2'; // Very dark blue
}

/**
 * Get color for population change percentage
 * Uses a sequential color scale: dark blue (low growth) -> blue -> green -> yellow -> orange -> red (high growth)
 */
export function getChangeColor(change: number | null): string {
  if (change === null || change === undefined) {
    return '#cccccc'; // Gray for no data
  }

  // Sequential color scale from low growth (dark blue) to high growth (red)
  // Negative changes (population decline): Dark blue to blue
  // Positive changes (population growth): Green to yellow to orange to red
  if (change < -10) return '#1e3a8a'; // Dark blue (large decline)
  if (change < -5) return '#3b82f6'; // Blue (medium decline)
  if (change < -2) return '#60a5fa'; // Light blue (small decline)
  if (change < 0) return '#93c5fd'; // Very light blue (minimal decline)
  if (change === 0) return '#dbeafe'; // Pale blue (no change)
  if (change < 2) return '#10b981'; // Green (small growth)
  if (change < 5) return '#eab308'; // Yellow (medium growth)
  if (change < 10) return '#f97316'; // Orange (high growth)
  if (change < 15) return '#ef4444'; // Red (very high growth)
  return '#dc2626'; // Dark red (extreme growth)
}

/**
 * Get population ranges for legend (deprecated - use getChangeRanges instead)
 */
export function getPopulationRanges(): Array<{ min: number; max: number; label: string; color: string }> {
  return [
    { min: 0, max: 25000, label: '0-25k', color: '#e3f2fd' },
    { min: 25000, max: 50000, label: '25k-50k', color: '#bbdefb' },
    { min: 50000, max: 100000, label: '50k-100k', color: '#90caf9' },
    { min: 100000, max: 250000, label: '100k-250k', color: '#64b5f6' },
    { min: 250000, max: 500000, label: '250k-500k', color: '#42a5f5' },
    { min: 500000, max: 1000000, label: '500k-1M', color: '#2196f3' },
    { min: 1000000, max: Infinity, label: '1M+', color: '#1976d2' },
  ];
}

/**
 * Get population change ranges for legend
 * Color scale: dark blue (low growth) -> blue -> green -> yellow -> orange -> red (high growth)
 */
export function getChangeRanges(): Array<{ min: number; max: number; label: string; color: string }> {
  return [
    { min: -Infinity, max: -10, label: '< -10%', color: '#1e3a8a' }, // Dark blue
    { min: -10, max: -5, label: '-10% to -5%', color: '#3b82f6' }, // Blue
    { min: -5, max: -2, label: '-5% to -2%', color: '#60a5fa' }, // Light blue
    { min: -2, max: 0, label: '-2% to 0%', color: '#93c5fd' }, // Very light blue
    { min: 0, max: 2, label: '0% to +2%', color: '#10b981' }, // Green
    { min: 2, max: 5, label: '+2% to +5%', color: '#eab308' }, // Yellow
    { min: 5, max: 10, label: '+5% to +10%', color: '#f97316' }, // Orange
    { min: 10, max: 15, label: '+10% to +15%', color: '#ef4444' }, // Red
    { min: 15, max: Infinity, label: '> +15%', color: '#dc2626' }, // Dark red
  ];
}
