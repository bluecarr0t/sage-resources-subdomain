'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Data } from '@react-google-maps/api';
import { 
  loadCountyGeoJSON, 
  enhanceGeoJSONWithCorrelation, 
  getCorrelationZoneColor, 
  getCorrelationZoneRanges,
  getChangeColor,
  CountyGeoJSON 
} from '@/lib/maps/county-boundaries';
import { PopulationDataByFIPS } from '@/lib/population/supabase-population';
import { GDPDataByFIPS } from '@/lib/gdp/supabase-gdp';

// State abbreviation to full name mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia',
};

/**
 * Convert county name with state abbreviation to full state name
 * Example: "Park, WY" -> "Park, Wyoming"
 */
function formatCountyNameWithFullState(countyName: string): string {
  // Check if county name ends with ", XX" pattern (2-letter state abbreviation)
  // Case-insensitive match for state abbreviation
  const match = countyName.match(/^(.+?),\s*([A-Za-z]{2})$/);
  if (match) {
    const [, county, stateAbbr] = match;
    const upperStateAbbr = stateAbbr.toUpperCase();
    const fullStateName = STATE_ABBREVIATIONS[upperStateAbbr] || stateAbbr;
    return `${county}, ${fullStateName}`;
  }
  return countyName;
}

interface OpportunityZonesLayerProps {
  map: google.maps.Map | null;
  populationLookup: PopulationDataByFIPS | null;
  gdpLookup: GDPDataByFIPS | null;
  visible: boolean;
  isNearMarker?: (lat: number, lng: number) => boolean; // Function to check if position is near a marker
}

export default function OpportunityZonesLayer({ map, populationLookup, gdpLookup, visible, isNearMarker }: OpportunityZonesLayerProps) {
  const [geoJson, setGeoJson] = useState<CountyGeoJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const [dataLayerReady, setDataLayerReady] = useState(false);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Reset data layer ready state and cleanup when visibility changes
  useEffect(() => {
    if (!visible) {
      setDataLayerReady(false);
      // Clean up data layer when hidden
      if (dataLayerRef.current) {
        try {
          // Remove all features
          dataLayerRef.current.forEach((feature: google.maps.Data.Feature) => {
            dataLayerRef.current?.remove(feature);
          });
        } catch (e) {
          console.warn('Error cleaning up data layer:', e);
        }
        dataLayerRef.current = null;
      }
      // Close any open info windows
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    }
  }, [visible]);

  // Load GeoJSON data
  useEffect(() => {
    if (!visible) {
      setGeoJson(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const loadedGeoJson = await loadCountyGeoJSON();
        
        if (populationLookup && gdpLookup) {
          const enhanced = enhanceGeoJSONWithCorrelation(loadedGeoJson, populationLookup, gdpLookup);
          setGeoJson(enhanced);
        } else {
          setGeoJson(loadedGeoJson);
        }
      } catch (err) {
        console.error('Error loading county GeoJSON:', err);
        setError(err instanceof Error ? err.message : 'Failed to load county boundaries');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [visible, populationLookup, gdpLookup]);

  // Fallback: If Data layer ref exists but dataLayerReady is false, try to initialize it
  useEffect(() => {
    if (!visible || !map || dataLayerReady || !dataLayerRef.current) return;
    
    const timer = setTimeout(() => {
      if (dataLayerRef.current && !dataLayerReady) {
        console.log('Fallback: Manually initializing Data layer');
        setDataLayerReady(true);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [visible, map, dataLayerReady]);

  // Initialize data layer and set up click handlers
  const onDataLoad = useCallback((dataLayer: google.maps.Data) => {
    if (!dataLayer || !map) return;
    
    dataLayerRef.current = dataLayer;
    
    // Ensure the data layer is properly initialized before marking as ready
    setTimeout(() => {
      if (dataLayerRef.current && map) {
        setDataLayerReady(true);
      }
    }, 100);

    // Handle feature clicks to show InfoWindow
    dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
      if (!map) return;

      // Check if click is near a marker - if so, don't open layer InfoWindow
      if (isNearMarker && event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        if (isNearMarker(lat, lng)) {
          // Stop event propagation to prevent any further handling
          if (event.stop) {
            event.stop();
          }
          return; // Don't open layer InfoWindow if clicking on a marker
        }
      }

      const feature = event.feature;
      
      // Try multiple access methods to get all properties
      let props: any = {};
      
      // Method 1: Try getProperty('properties') - sometimes they're nested
      try {
        const nestedProps = feature.getProperty('properties');
        if (nestedProps && typeof nestedProps === 'object') {
          props = nestedProps;
        }
      } catch (e) {
        // Ignore
      }
      
      // Method 2: Access properties directly (Google Maps flattens them)
      const propertyKeys = [
        'countyName', 'NAME', 'NAMELSAD', 'NAME_LSAD', 'LSAD',
        'STATE', 'COUNTY', 'GEO_ID', 'GEOID', 'geoid', 'id',
        'correlationZone', 'populationChange', 'tourismChange',
        'CENSUSAREA'
      ];
      
      propertyKeys.forEach(key => {
        try {
          const value = feature.getProperty(key);
          if (value !== undefined && value !== null) {
            props[key] = value;
          }
        } catch (e) {
          // Ignore individual property access errors
        }
      });
      
      // Extract county name with multiple fallbacks
      let countyName = props.countyName;
      
      if (!countyName) {
        if (props.NAMELSAD) {
          countyName = props.NAMELSAD;
        } else if (props.NAME_LSAD) {
          countyName = props.NAME_LSAD;
        } else if (props.NAME) {
          countyName = props.NAME;
          if (props.LSAD && !countyName.includes(props.LSAD)) {
            countyName = `${countyName} ${props.LSAD}`;
          }
        }
      }
      
      if (!countyName) {
        countyName = 'Unknown County';
      }
      
      // Convert state abbreviation to full state name (e.g., "Park, WY" -> "Park, Wyoming")
      countyName = formatCountyNameWithFullState(countyName);
      
      const correlationZone = props.correlationZone;
      const populationChange = props.populationChange;
      const tourismChange = props.tourismChange;
      
      // Get center of feature for InfoWindow position
      const bounds = new google.maps.LatLngBounds();
      const geometry = feature.getGeometry();
      
      if (geometry) {
        geometry.forEachLatLng((latLng) => {
          bounds.extend(latLng);
        });
        
        const center = bounds.getCenter();
        
        // Close existing InfoWindow
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        
        // Get zone label and description
        const zoneLabels: { [key: string]: { label: string; description: string } } = {
          'high': { label: 'High Opportunity', description: 'Both Population Change and Tourism Change showing strong growth (>5%)' },
          'moderate': { label: 'Moderate Opportunity', description: 'One metric showing strong growth or both showing positive growth' },
          'low': { label: 'Low Opportunity', description: 'Both metrics declining or showing negative trends' },
        };
        
        const zoneInfo = correlationZone ? zoneLabels[correlationZone] : null;
        
        // Create new InfoWindow
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 250px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #111827;">
                ${countyName}
              </h3>
              ${correlationZone && zoneInfo ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getCorrelationZoneColor(correlationZone)};">
                  <strong>${zoneInfo.label}</strong>
                </p>
                <p style="margin: 4px 0; font-size: 12px; color: #6b7280; font-style: italic;">
                  ${zoneInfo.description}
                </p>
              ` : ''}
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Population Change</h4>
              </div>
              ${populationChange !== null && populationChange !== undefined && !isNaN(populationChange) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getChangeColor(populationChange)};">
                  <strong>Change (2010-2020):</strong> ${populationChange >= 0 ? '+' : ''}${populationChange.toFixed(2)}%
                </p>
              ` : ''}
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Tourism Change</h4>
                <p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280; font-style: italic;">
                  The gross domestic product (GDP) shown is only for Accommodations, Food Service, Recreation, Entertainment and Art.
                </p>
              </div>
              ${tourismChange !== null && tourismChange !== undefined && !isNaN(tourismChange) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getChangeColor(tourismChange)};">
                  <strong>Average Year-over-Year Growth (2001-2023):</strong> ${tourismChange >= 0 ? '+' : ''}${tourismChange.toFixed(2)}%
                </p>
              ` : ''}
              ${!correlationZone && (populationChange === null || tourismChange === null) ? `
                <p style="margin: 4px 0; font-size: 12px; color: #9ca3af; font-style: italic;">
                  No correlation data available for this county.
                </p>
              ` : ''}
            </div>
          `,
        });
        
        infoWindow.setPosition(center);
        infoWindow.open(map);
        infoWindowRef.current = infoWindow;
      }
    });
  }, [map, isNearMarker]);

  // Load data and apply styling when both data layer and geoJson are ready
  useEffect(() => {
    if (!dataLayerReady || !dataLayerRef.current || !geoJson || !map) return;

    try {
      // Clear existing features
      dataLayerRef.current.forEach((feature: google.maps.Data.Feature) => {
        dataLayerRef.current?.remove(feature);
      });

      // Add all features from geoJson
      geoJson.features.forEach((feature) => {
        dataLayerRef.current?.addGeoJson(feature);
      });

      // Apply styling to each feature
      dataLayerRef.current.setStyle((feature: google.maps.Data.Feature) => {
        const props: any = feature.getProperty('properties') || {};
        const correlationZone = props.correlationZone || feature.getProperty('correlationZone');
        
        if (correlationZone) {
          return {
            fillColor: getCorrelationZoneColor(correlationZone),
            fillOpacity: 0.6,
            strokeColor: '#ffffff',
            strokeWeight: 1,
            strokeOpacity: 0.8,
          };
        }
        
        // Default style for counties without correlation data
        return {
          fillColor: '#cccccc',
          fillOpacity: 0.3,
          strokeColor: '#ffffff',
          strokeWeight: 1,
          strokeOpacity: 0.5,
        };
      });

      if (typeof window !== 'undefined') {
        console.log('✅ Applied correlation zone styling to', geoJson.features.length, 'counties');
      }
    } catch (err) {
      console.error('Error applying correlation zone styling:', err);
    }
  }, [dataLayerReady, geoJson, map]);

  // Cleanup InfoWindow and data layer on unmount
  useEffect(() => {
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, []);

  if (!visible || !map) {
    return null;
  }

  return (
    <Data
      onLoad={onDataLoad}
      options={{
        map: map,
        controlPosition: undefined,
      }}
    />
  );
}
