'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Data } from '@react-google-maps/api';
import { loadCountyGeoJSON, enhanceGeoJSONWithPopulation, getChangeColor, getChangeRanges, CountyGeoJSON } from '@/lib/maps/county-boundaries';
import { PopulationLookup } from '@/lib/population/parse-population-csv';
import { PopulationDataByFIPS } from '@/lib/population/supabase-population';

interface PopulationLayerProps {
  map: google.maps.Map | null;
  populationLookup: PopulationLookup | null;
  fipsLookup?: PopulationDataByFIPS;
  year: '2010' | '2020'; // Kept for backward compatibility, but not used for change display
  visible: boolean;
}

export default function PopulationLayer({ map, populationLookup, fipsLookup, year, visible }: PopulationLayerProps) {
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

  // Reset data layer ready state when visibility changes
  useEffect(() => {
    if (!visible) {
      setDataLayerReady(false);
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

  // Initialize data layer and set up click handlers
  const onDataLoad = useCallback((dataLayer: google.maps.Data) => {
    dataLayerRef.current = dataLayer;
    setDataLayerReady(true);

    // Handle feature clicks to show InfoWindow
    dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
      if (!map) return;

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
      
      const population2020 = props.population2020;
      const population2010 = props.population2010;
      const change = props.change;
      
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
        
        // Create new InfoWindow
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #111827;">
                ${countyName}
              </h3>
              ${population2010 !== null && population2010 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Population (2010):</strong> ${population2010.toLocaleString()}
                </p>
              ` : ''}
              ${population2020 !== null && population2020 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>Population (2020):</strong> ${population2020.toLocaleString()}
                </p>
              ` : ''}
              ${change !== null && change !== undefined && !isNaN(change) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${getChangeColor(change)};">
                  <strong>Change (2010-2020):</strong> ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                </p>
              ` : ''}
              ${(population2010 === null || population2010 === undefined) && (population2020 === null || population2020 === undefined) && (change === null || change === undefined) ? `
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
  }, [map, year]);

  // Load data and apply styling when both data layer and geoJson are ready
  useEffect(() => {
    if (!dataLayerReady || !dataLayerRef.current || !geoJson) return;

    // Clear existing features
    dataLayerRef.current.forEach((feature: google.maps.Data.Feature) => {
      dataLayerRef.current?.remove(feature);
    });

    // Add GeoJSON features
    try {
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
    } catch (err) {
      console.error('Error adding GeoJSON to Data Layer:', err);
    }
  }, [dataLayerReady, year, geoJson]);

  // Cleanup InfoWindow on unmount
  useEffect(() => {
    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
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
