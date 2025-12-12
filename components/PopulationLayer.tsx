'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Data } from '@react-google-maps/api';
import { loadCountyGeoJSON, enhanceGeoJSONWithPopulation, getChangeColor, getChangeRanges, CountyGeoJSON } from '@/lib/maps/county-boundaries';
import { PopulationLookup } from '@/lib/population/parse-population-csv';
import { PopulationDataByFIPS } from '@/lib/population/supabase-population';

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

interface PopulationLayerProps {
  map: google.maps.Map | null;
  populationLookup: PopulationLookup | null;
  fipsLookup?: PopulationDataByFIPS;
  year: '2010' | '2020'; // Kept for backward compatibility, but not used for change display
  visible: boolean;
  otherLayerEnabled?: boolean; // Whether GDP layer is enabled
  otherLayerData?: any; // GDP lookup data
  isNearMarker?: (lat: number, lng: number) => boolean; // Function to check if position is near a marker
}

export default function PopulationLayer({ map, populationLookup, fipsLookup, year, visible, otherLayerEnabled = false, otherLayerData = null, isNearMarker }: PopulationLayerProps) {
  const [geoJson, setGeoJson] = useState<CountyGeoJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const [dataLayerReady, setDataLayerReady] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState<{
    name: string;
    population: number | null;
    year: '2010' | '2020';
    position: { lat: number; lng: number };
  } | null>(null);
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
        
        if (populationLookup) {
          const enhanced = enhanceGeoJSONWithPopulation(loadedGeoJson, populationLookup, fipsLookup);
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
  }, [visible, populationLookup, fipsLookup]);

  // Fallback: If Data layer ref exists but dataLayerReady is false, try to initialize it
  useEffect(() => {
    if (!visible || !map || dataLayerReady || !dataLayerRef.current) return;
    
    // If we have a data layer ref but it's not marked as ready, 
    // try to initialize it manually (fallback if onLoad didn't fire)
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
    // Add a small delay to ensure the Data component is fully mounted and map is ready
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
      
      // Google Maps Data layer flattens GeoJSON properties - they're stored directly on the feature
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
        'population2010', 'population2020', 'change',
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
      
      // Method 3: Try toGeoJson as final fallback
      if (Object.keys(props).length === 0) {
        try {
          let geoJsonData: any = null;
          feature.toGeoJson((geoJson) => {
            geoJsonData = geoJson;
          });
          if (geoJsonData?.properties) {
            props = geoJsonData.properties;
          }
        } catch (e) {
          console.warn('Error accessing feature properties via toGeoJson:', e);
        }
      }
      
      // Extract county name with multiple fallbacks
      let countyName = props.countyName;
      
      if (!countyName) {
        // Try various property formats
        if (props.NAMELSAD) {
          countyName = props.NAMELSAD;
        } else if (props.NAME_LSAD) {
          countyName = props.NAME_LSAD;
        } else if (props.NAME) {
          // Construct full name
          countyName = props.NAME;
          if (props.LSAD && !countyName.includes(props.LSAD)) {
            countyName = `${countyName} ${props.LSAD}`;
          }
        }
      }
      
      // Fallback to constructing from STATE and COUNTY if available
      if (!countyName && props.STATE && props.COUNTY) {
        // Try to get state name from common abbreviations
        const stateNames: { [key: string]: string } = {
          '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
          '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
          '12': 'Florida', '13': 'Georgia', '15': 'Hawaii', '16': 'Idaho',
          '17': 'Illinois', '18': 'Indiana', '19': 'Iowa', '20': 'Kansas',
          '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine', '24': 'Maryland',
          '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota', '28': 'Mississippi',
          '29': 'Missouri', '30': 'Montana', '31': 'Nebraska', '32': 'Nevada',
          '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico', '36': 'New York',
          '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio', '40': 'Oklahoma',
          '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island', '45': 'South Carolina',
          '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas', '49': 'Utah',
          '50': 'Vermont', '51': 'Virginia', '53': 'Washington', '54': 'West Virginia',
          '55': 'Wisconsin', '56': 'Wyoming'
        };
        const stateCode = String(props.STATE).padStart(2, '0');
        const stateName = stateNames[stateCode] || `State ${stateCode}`;
        const countyCode = String(props.COUNTY).padStart(3, '0');
        countyName = `County ${countyCode}, ${stateName}`;
      }
      
      // Final fallback
      if (!countyName) {
        countyName = 'Unknown County';
        // Debug log to help diagnose
        console.warn('Could not determine county name. Available properties:', Object.keys(props));
      }
      
      // Convert state abbreviation to full state name (e.g., "Park, WY" -> "Park, Wyoming")
      countyName = formatCountyNameWithFullState(countyName);
      
      const population2020 = props.population2020;
      const population2010 = props.population2010;
      const change = props.change;
      
      // Get FIPS code for looking up GDP data if other layer is enabled
      let fipsCode: string | null = null;
      if (otherLayerEnabled && otherLayerData) {
        if (props.GEO_ID) {
          const geoid = String(props.GEO_ID).trim();
          const match = geoid.match(/US(\d+)$/);
          if (match) {
            let extracted = match[1];
            if (extracted.length < 5) {
              extracted = extracted.padStart(5, '0');
            } else if (extracted.length > 5) {
              extracted = extracted.slice(-5);
            }
            fipsCode = extracted;
          }
        } else if (props.STATE !== undefined && props.STATE !== null && props.COUNTY !== undefined && props.COUNTY !== null) {
          const stateCode = String(props.STATE).padStart(2, '0');
          const countyCode = String(props.COUNTY).padStart(3, '0');
          fipsCode = stateCode + countyCode;
        } else if (props.GEOID || props.geoid) {
          const geoid = String(props.GEOID || props.geoid).trim();
          if (geoid.match(/^\d{5}$/)) {
            fipsCode = geoid;
          } else {
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
      }
      
      // Get GDP data if other layer is enabled
      let gdpData: any = null;
      if (otherLayerEnabled && otherLayerData && fipsCode) {
        const fips = String(fipsCode).padStart(5, '0');
        gdpData = otherLayerData[fips] || null;
      }
      
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
        
        // Format GDP values in millions (if needed)
        const formatGDP = (value: number | null | undefined): string => {
          if (value === null || value === undefined) return 'N/A';
          const millions = value / 1000;
          return `$${millions.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
        };
        
        // Calculate GDP metrics if available
        let movingAnnualAverage = gdpData?.movingAnnualAverage ?? null;
        let gdp2023 = gdpData?.gdp2023 ?? null;
        let gdp2022 = gdpData?.gdp2022 ?? null;
        let gdp2021 = gdpData?.gdp2021 ?? null;
        let gdp2020 = gdpData?.gdp2020 ?? null;
        let gdp2019 = gdpData?.gdp2019 ?? null;
        
        let recentGrowth: number | null = null;
        if (gdp2022 !== null && gdp2023 !== null && gdp2022 !== undefined && gdp2023 !== undefined && gdp2022 > 0) {
          recentGrowth = parseFloat(((gdp2023 - gdp2022) / gdp2022 * 100).toFixed(2));
        }
        
        let recovery: number | null = null;
        if (gdp2019 !== null && gdp2023 !== null && gdp2019 !== undefined && gdp2023 !== undefined && gdp2019 > 0) {
          recovery = parseFloat(((gdp2023 - gdp2019) / gdp2019 * 100).toFixed(2));
        }
        
        // Create combined or single InfoWindow
        const hasPopulationData = (population2010 !== null && population2010 !== undefined) || 
                                   (population2020 !== null && population2020 !== undefined) || 
                                   (change !== null && change !== undefined);
        const hasGDPData = gdpData && (movingAnnualAverage !== null || gdp2023 !== null);
        const showCombined = otherLayerEnabled && hasPopulationData && hasGDPData;
        
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 250px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #111827;">
                ${countyName}
              </h3>
              ${showCombined ? `
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                  <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Population Change</h4>
                </div>
              ` : ''}
              ${change !== null && change !== undefined && !isNaN(change) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getChangeColor(change)};">
                  <strong>Change (2010-2020):</strong> ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                </p>
              ` : ''}
              ${population2020 !== null && population2020 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Population (2020):</strong> ${population2020.toLocaleString()}
                </p>
              ` : ''}
              ${population2010 !== null && population2010 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Population (2010):</strong> ${population2010.toLocaleString()}
                </p>
              ` : ''}
              ${showCombined ? `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                  <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Tourism Change</h4>
                  <p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280; font-style: italic;">
                    The gross domestic product (GDP) shown is only for Accommodations, Food Service, Recreation, Entertainment and Art.
                  </p>
                </div>
              ` : ''}
              ${showCombined && movingAnnualAverage !== null && movingAnnualAverage !== undefined && !isNaN(movingAnnualAverage) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getChangeColor(movingAnnualAverage)};">
                  <strong>Average Year-over-Year Growth (2001-2023):</strong> ${movingAnnualAverage >= 0 ? '+' : ''}${movingAnnualAverage.toFixed(2)}%
                </p>
              ` : ''}
              ${showCombined && recentGrowth !== null && recentGrowth !== undefined && !isNaN(recentGrowth) ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Recent Growth (2022-2023):</strong> ${recentGrowth >= 0 ? '+' : ''}${recentGrowth.toFixed(2)}%
                </p>
              ` : ''}
              ${showCombined && recovery !== null && recovery !== undefined && !isNaN(recovery) ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Growth Since 2019:</strong> ${recovery >= 0 ? '+' : ''}${recovery.toFixed(2)}%
                </p>
              ` : ''}
              ${showCombined && gdp2023 !== null && gdp2023 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2023 GDP:</strong> ${formatGDP(gdp2023)}
                </p>
              ` : ''}
              ${showCombined && gdp2022 !== null && gdp2022 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2022 GDP:</strong> ${formatGDP(gdp2022)}
                </p>
              ` : ''}
              ${showCombined && gdp2021 !== null && gdp2021 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2021 GDP:</strong> ${formatGDP(gdp2021)}
                </p>
              ` : ''}
              ${showCombined && gdp2020 !== null && gdp2020 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2020 GDP:</strong> ${formatGDP(gdp2020)}
                </p>
              ` : ''}
              ${showCombined && gdp2019 !== null && gdp2019 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2019 GDP:</strong> ${formatGDP(gdp2019)}
                </p>
              ` : ''}
              ${!showCombined && (population2010 === null || population2010 === undefined) && (population2020 === null || population2020 === undefined) && (change === null || change === undefined) ? `
                <p style="margin: 4px 0; font-size: 12px; color: #9ca3af; font-style: italic;">
                  No population data available for this county.
                </p>
              ` : ''}
            </div>
          `,
        });
        
        infoWindow.setPosition(center);
        infoWindow.open(map);
        infoWindowRef.current = infoWindow;
        
        setSelectedCounty({
          name: countyName,
          population: population2020 || population2010 || null,
          year,
          position: { lat: center.lat(), lng: center.lng() },
        });
      }
    });
  }, [map, year, otherLayerEnabled, otherLayerData, isNearMarker]);

  // Load data and apply styling when both data layer and geoJson are ready
  useEffect(() => {
    if (!dataLayerReady || !dataLayerRef.current || !geoJson || !map) return;

    // Small delay to ensure Data layer is fully initialized and map is ready
    const timer = setTimeout(() => {
      if (!dataLayerRef.current || !geoJson || !map) return;

      // Clear existing features only if there are any
      try {
        let featureCount = 0;
        dataLayerRef.current.forEach(() => {
          featureCount++;
        });
        
        if (featureCount > 0) {
          dataLayerRef.current.forEach((feature: google.maps.Data.Feature) => {
            dataLayerRef.current?.remove(feature);
          });
        }
      } catch (e) {
        // If clearing fails, try to continue anyway
        console.warn('Error clearing existing features:', e);
      }

      // Add GeoJSON features
      try {
        if (!dataLayerRef.current || !geoJson) return;
        
        const addedFeatures = dataLayerRef.current.addGeoJson(geoJson);
      
      console.log(`✅ Added ${addedFeatures.length} features to map`);
      
      // Explicitly set properties on each feature to ensure they're accessible
      // Match features by index to preserve the enhanced properties
      addedFeatures.forEach((feature, index) => {
        try {
          const originalFeature = geoJson.features[index];
          if (originalFeature?.properties) {
            // Set each property directly on the feature so they're accessible
            Object.entries(originalFeature.properties).forEach(([key, value]) => {
              try {
                feature.setProperty(key, value);
              } catch (e) {
                // Some properties might not be settable, ignore
              }
            });
          }
        } catch (e) {
          // Ignore errors setting properties
        }
      });
      
      console.log(`✅ Set properties on ${addedFeatures.length} features`);
      
      // Apply styling using overrideStyle for each feature individually
      // This is more reliable than setStyle for ensuring colors appear
      let styledCount = 0;
      let hasChangeDataCount = 0;
      let sampleFeatureLogged = false;
      
      // Use a try-catch wrapper for the forEach to handle any errors gracefully
      try {
        dataLayerRef.current.forEach((feature: google.maps.Data.Feature) => {
          if (!feature) return; // Safety check
          
          try {
            // Google Maps Data layer flattens GeoJSON properties - access them directly
            let props: any = {};
            
            // Try nested properties first
            try {
              const nestedProps = feature.getProperty('properties');
              if (nestedProps && typeof nestedProps === 'object') {
                props = nestedProps;
              }
            } catch (e) {
              // Ignore
            }
            
            // Access properties directly (they're flattened by Google Maps)
            const propertyKeys = ['countyName', 'NAME', 'NAMELSAD', 'STATE', 'COUNTY', 'change', 'population2010', 'population2020'];
            propertyKeys.forEach(key => {
              try {
                const value = feature.getProperty(key);
                if (value !== undefined && value !== null) {
                  props[key] = value;
                }
              } catch (e) {
                // Ignore
              }
            });
            
            let change = props?.change;
            
            // Final fallback: direct property access
            if (change === undefined || change === null) {
              try {
                change = feature.getProperty('change');
              } catch (e) {
                // Ignore
              }
            }
            
            // Log sample feature for debugging
            if (!sampleFeatureLogged && styledCount < 5) {
              try {
                let geoJsonData: any = null;
                feature.toGeoJson((geoJson) => {
                  geoJsonData = geoJson;
                });
                console.log('Sample feature properties:', {
                  props,
                  change,
                  directChange: feature.getProperty('change'),
                  geoJsonProperties: geoJsonData?.properties,
                  allPropertyKeys: Object.keys(props || {}),
                });
                if (styledCount === 4) sampleFeatureLogged = true;
              } catch (e) {
                console.warn('Error logging sample feature:', e);
              }
            }
            
            const color = getChangeColor(change);
            
            // Increase opacity for positive changes to make them more visible
            const fillOpacity = (change !== null && change !== undefined && change > 0) ? 0.7 : 0.65;
            
            // Apply style using overrideStyle (more reliable for individual features)
            if (dataLayerRef.current) {
              dataLayerRef.current.overrideStyle(feature, {
                fillColor: color,
                fillOpacity: fillOpacity,
                strokeColor: '#ffffff',
                strokeWeight: 1,
                strokeOpacity: 0.9,
              });
            }
            
            styledCount++;
            if (change !== null && change !== undefined && !isNaN(change)) {
              hasChangeDataCount++;
              // Debug log for positive changes to verify they're being styled
              if (change > 0 && styledCount <= 10) {
                console.log(`County with positive change: ${change.toFixed(2)}%, color: ${color}`);
              }
            }
          } catch (featureError) {
            console.warn(`Error processing feature ${styledCount}:`, featureError);
          }
        });
      } catch (forEachError) {
        console.error('Error in forEach loop:', forEachError);
      }

      // Also set a default style function for any new features that might be added
      dataLayerRef.current.setStyle((feature: google.maps.Data.Feature) => {
        // Try nested properties first
        let props: any = {};
        try {
          const nestedProps = feature.getProperty('properties');
          if (nestedProps && typeof nestedProps === 'object') {
            props = nestedProps;
          }
        } catch (e) {
          // Ignore
        }
        
        // Also try direct property access (Google Maps flattens properties)
        let change = props?.change;
        if (change === undefined || change === null) {
          try {
            change = feature.getProperty('change');
          } catch (e) {
            // Ignore
          }
        }
        
        const color = getChangeColor(change);
        
        return {
          fillColor: color,
          fillOpacity: 0.65,
          strokeColor: '#ffffff',
          strokeWeight: 1,
          strokeOpacity: 0.9,
          zIndex: 1,
        };
      });

      console.log(`✅ Applied population styling to ${styledCount} county features (${hasChangeDataCount} with change data)`);
      
      // Force map to refresh/redraw to ensure features are visible
      if (map) {
        // Trigger a map refresh by briefly changing and restoring the map type
        // This ensures the Data layer is properly rendered
        const currentMapType = map.getMapTypeId();
        if (currentMapType) {
          // Use requestAnimationFrame to ensure the map redraws
          requestAnimationFrame(() => {
            if (map && dataLayerRef.current) {
              // Force a redraw by toggling visibility (if needed)
              // The Data layer should already be visible, but this ensures it renders
              map.setOptions({});
            }
          });
        }
      }
      } catch (err) {
        console.error('Error adding GeoJSON to Data Layer:', err);
      }
    }, 100); // Increased delay to ensure Data layer is fully ready

    return () => {
      clearTimeout(timer);
    };
  }, [dataLayerReady, year, geoJson, map]);

  // Cleanup InfoWindow and data layer on unmount
  useEffect(() => {
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      // Clean up data layer
      if (dataLayerRef.current) {
        try {
          // Remove all features
          dataLayerRef.current.forEach((feature: google.maps.Data.Feature) => {
            dataLayerRef.current?.remove(feature);
          });
        } catch (e) {
          console.warn('Error cleaning up data layer on unmount:', e);
        }
        dataLayerRef.current = null;
      }
    };
  }, []);

  if (!visible || loading) {
    return null;
  }

  if (error) {
    console.error('Population layer error:', error);
    return null;
  }

  if (!geoJson || !map) {
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
