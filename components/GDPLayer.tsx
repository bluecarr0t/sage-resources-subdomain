'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Data } from '@react-google-maps/api';
import { loadCountyGeoJSON, enhanceGeoJSONWithGDP, getChangeColor, getChangeRanges, CountyGeoJSON } from '@/lib/maps/county-boundaries';
import { GDPDataByFIPS, fetchGDPDataFromSupabase } from '@/lib/gdp/supabase-gdp';

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

interface GDPLayerProps {
  map: google.maps.Map | null;
  gdpLookup: GDPDataByFIPS | null;
  visible: boolean;
  otherLayerEnabled?: boolean; // Whether Population layer is enabled
  otherLayerData?: any; // Population lookup data
  isNearMarker?: (lat: number, lng: number) => boolean; // Function to check if position is near a marker
}

export default function GDPLayer({ map, gdpLookup, visible, otherLayerEnabled = false, otherLayerData = null, isNearMarker }: GDPLayerProps) {
  const [geoJson, setGeoJson] = useState<CountyGeoJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const [dataLayerReady, setDataLayerReady] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState<{
    name: string;
    movingAnnualAverage: number | null;
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
        
        if (gdpLookup) {
          const enhanced = enhanceGeoJSONWithGDP(loadedGeoJson, gdpLookup);
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
  }, [visible, gdpLookup]);

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
        'movingAnnualAverage', 'gdp2023', 'gdp2022', 'gdp2021', 'gdp2020', 'gdp2019',
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
      
      const movingAnnualAverage = props.movingAnnualAverage;
      const gdp2023 = props.gdp2023;
      const gdp2022 = props.gdp2022;
      const gdp2021 = props.gdp2021;
      const gdp2020 = props.gdp2020;
      const gdp2019 = props.gdp2019;
      
      // Calculate recent growth if we have 2022 and 2023 data
      let recentGrowth: number | null = null;
      if (gdp2022 !== null && gdp2023 !== null && gdp2022 !== undefined && gdp2023 !== undefined && gdp2022 > 0) {
        recentGrowth = parseFloat(((gdp2023 - gdp2022) / gdp2022 * 100).toFixed(2));
      }
      
      // Calculate recovery if we have 2019 and 2023 data
      let recovery: number | null = null;
      if (gdp2019 !== null && gdp2023 !== null && gdp2019 !== undefined && gdp2023 !== undefined && gdp2019 > 0) {
        recovery = parseFloat(((gdp2023 - gdp2019) / gdp2019 * 100).toFixed(2));
      }
      
      // Get FIPS code for looking up population data if other layer is enabled
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
      
      // Get population data if other layer is enabled
      let populationData: any = null;
      if (otherLayerEnabled && otherLayerData && fipsCode) {
        const fips = String(fipsCode).padStart(5, '0');
        // otherLayerData could be PopulationDataByFIPS (fipsLookup) or PopulationLookup
        // PopulationDataByFIPS structure: { [fips]: { 2010, 2020, change, name, geoId } }
        // PopulationLookup structure: { [countyName]: { 2010, 2020 } }
        if (otherLayerData[fips]) {
          // It's PopulationDataByFIPS format
          populationData = otherLayerData[fips];
        } else if (typeof otherLayerData === 'object') {
          // Try PopulationLookup format - need to match by county name
          // This is less reliable, but we'll try
          for (const key in otherLayerData) {
            const data = otherLayerData[key];
            if (data && (data[2010] !== undefined || data[2020] !== undefined)) {
              // Check if this might be the right county by comparing names
              if (data.name && countyName && data.name.toLowerCase().includes(countyName.toLowerCase().split(',')[0].trim())) {
                populationData = data;
                break;
              }
            }
          }
        }
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
        
        // Format GDP values in millions
        const formatGDP = (value: number | null | undefined): string => {
          if (value === null || value === undefined) return 'N/A';
          const millions = value / 1000;
          return `$${millions.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
        };
        
        // Extract population data - PopulationDataByFIPS format
        const population2010 = populationData?.[2010] ?? null;
        const population2020 = populationData?.[2020] ?? null;
        const change = populationData?.change ?? null;
        
        // Create combined or single InfoWindow
        const hasGDPData = (movingAnnualAverage !== null && movingAnnualAverage !== undefined) || 
                           (gdp2023 !== null && gdp2023 !== undefined);
        const hasPopulationData = (population2010 !== null && population2010 !== undefined) || 
                                   (population2020 !== null && population2020 !== undefined) || 
                                   (change !== null && change !== undefined);
        const showCombined = otherLayerEnabled && hasPopulationData && hasGDPData;
        
        // Create new InfoWindow
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
              ${showCombined && change !== null && change !== undefined && !isNaN(change) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getChangeColor(change)};">
                  <strong>Change (2010-2020):</strong> ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                </p>
              ` : ''}
              ${showCombined && population2020 !== null && population2020 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Population (2020):</strong> ${population2020.toLocaleString()}
                </p>
              ` : ''}
              ${showCombined && population2010 !== null && population2010 !== undefined ? `
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
              ${!showCombined && (movingAnnualAverage !== null || gdp2023 !== null) ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280; font-style: italic;">
                    The gross domestic product (GDP) shown is only for Accommodations, Food Service, Recreation, Entertainment and Art.
                  </p>
                </div>
              ` : ''}
              ${movingAnnualAverage !== null && movingAnnualAverage !== undefined && !isNaN(movingAnnualAverage) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getChangeColor(movingAnnualAverage)};">
                  <strong>Average Year-over-Year Growth (2001-2023):</strong> ${movingAnnualAverage >= 0 ? '+' : ''}${movingAnnualAverage.toFixed(2)}%
                </p>
              ` : ''}
              ${recentGrowth !== null && recentGrowth !== undefined && !isNaN(recentGrowth) ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Recent Growth (2022-2023):</strong> ${recentGrowth >= 0 ? '+' : ''}${recentGrowth.toFixed(2)}%
                </p>
              ` : ''}
              ${recovery !== null && recovery !== undefined && !isNaN(recovery) ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Growth Since 2019:</strong> ${recovery >= 0 ? '+' : ''}${recovery.toFixed(2)}%
                </p>
              ` : ''}
              ${gdp2023 !== null && gdp2023 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2023 GDP:</strong> ${formatGDP(gdp2023)}
                </p>
              ` : ''}
              ${gdp2022 !== null && gdp2022 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2022 GDP:</strong> ${formatGDP(gdp2022)}
                </p>
              ` : ''}
              ${gdp2021 !== null && gdp2021 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2021 GDP:</strong> ${formatGDP(gdp2021)}
                </p>
              ` : ''}
              ${gdp2020 !== null && gdp2020 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2020 GDP:</strong> ${formatGDP(gdp2020)}
                </p>
              ` : ''}
              ${gdp2019 !== null && gdp2019 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>2019 GDP:</strong> ${formatGDP(gdp2019)}
                </p>
              ` : ''}
              ${!showCombined && (movingAnnualAverage === null || movingAnnualAverage === undefined) && (gdp2023 === null || gdp2023 === undefined) ? `
                <p style="margin: 4px 0; font-size: 12px; color: #9ca3af; font-style: italic;">
                  No GDP data available for this county.
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
          movingAnnualAverage: movingAnnualAverage,
          position: { lat: center.lat(), lng: center.lng() },
        });
      }
    });
  }, [map, otherLayerEnabled, otherLayerData, isNearMarker]);

  // Load data and apply styling when both data layer and geoJson are ready
  useEffect(() => {
    if (!dataLayerReady || !dataLayerRef.current || !geoJson || !map) return;

    const timer = setTimeout(() => {
      if (!dataLayerRef.current || !geoJson || !map) return;

      // Clear existing features
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
        console.warn('Error clearing existing features:', e);
      }

      // Add GeoJSON features
      try {
        if (!dataLayerRef.current || !geoJson) return;
        
        const addedFeatures = dataLayerRef.current.addGeoJson(geoJson);
      
        console.log(`✅ Added ${addedFeatures.length} features to GDP map`);
      
        // Set properties on each feature
        addedFeatures.forEach((feature, index) => {
          try {
            const originalFeature = geoJson.features[index];
            if (originalFeature?.properties) {
              Object.entries(originalFeature.properties).forEach(([key, value]) => {
                try {
                  feature.setProperty(key, value);
                } catch (e) {
                  // Ignore
                }
              });
            }
          } catch (e) {
            // Ignore
          }
        });
      
        // Apply styling using overrideStyle for each feature
        let styledCount = 0;
        let hasGDPDataCount = 0;
        
        try {
          dataLayerRef.current.forEach((feature: google.maps.Data.Feature) => {
            if (!feature) return;
            
            try {
              let props: any = {};
              
              try {
                const nestedProps = feature.getProperty('properties');
                if (nestedProps && typeof nestedProps === 'object') {
                  props = nestedProps;
                }
              } catch (e) {
                // Ignore
              }
              
              const propertyKeys = ['countyName', 'NAME', 'NAMELSAD', 'STATE', 'COUNTY', 'movingAnnualAverage', 'gdp2023', 'gdp2022', 'gdp2021', 'gdp2020'];
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
              
              let movingAverage = props?.movingAnnualAverage;
              
              if (movingAverage === undefined || movingAverage === null) {
                try {
                  movingAverage = feature.getProperty('movingAnnualAverage');
                } catch (e) {
                  // Ignore
                }
              }
              
              const color = getChangeColor(movingAverage);
              
              const fillOpacity = (movingAverage !== null && movingAverage !== undefined && movingAverage > 0) ? 0.7 : 0.65;
              
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
              if (movingAverage !== null && movingAverage !== undefined && !isNaN(movingAverage)) {
                hasGDPDataCount++;
              }
            } catch (featureError) {
              console.warn(`Error processing feature ${styledCount}:`, featureError);
            }
          });
        } catch (forEachError) {
          console.error('Error in forEach loop:', forEachError);
        }

        // Also set a default style function
        dataLayerRef.current.setStyle((feature: google.maps.Data.Feature) => {
          let props: any = {};
          try {
            const nestedProps = feature.getProperty('properties');
            if (nestedProps && typeof nestedProps === 'object') {
              props = nestedProps;
            }
          } catch (e) {
            // Ignore
          }
          
          let movingAverage = props?.movingAnnualAverage;
          if (movingAverage === undefined || movingAverage === null) {
            try {
              movingAverage = feature.getProperty('movingAnnualAverage');
            } catch (e) {
              // Ignore
            }
          }
          
          const color = getChangeColor(movingAverage);
          
          return {
            fillColor: color,
            fillOpacity: 0.65,
            strokeColor: '#ffffff',
            strokeWeight: 1,
            strokeOpacity: 0.9,
            zIndex: 1,
          };
        });

        console.log(`✅ Applied GDP styling to ${styledCount} county features (${hasGDPDataCount} with GDP data)`);
        
        // Force map refresh
        if (map) {
          requestAnimationFrame(() => {
            if (map && dataLayerRef.current) {
              map.setOptions({});
            }
          });
        }
      } catch (err) {
        console.error('Error adding GeoJSON to Data Layer:', err);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [dataLayerReady, geoJson, map]);

  // Cleanup InfoWindow and data layer on unmount
  useEffect(() => {
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      if (dataLayerRef.current) {
        try {
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
    console.error('GDP layer error:', error);
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
