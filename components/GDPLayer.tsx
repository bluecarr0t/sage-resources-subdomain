'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Data } from '@react-google-maps/api';
import { loadCountyGeoJSON, getChangeColor, CountyGeoJSON } from '@/lib/maps/county-boundaries';
import { GDPLookup, GDPDataByFIPS } from '@/lib/gdp/supabase-gdp';
import { matchCountiesToFeatures } from '@/lib/population/county-matcher';
import { normalizeCountyName } from '@/lib/population/parse-population-csv';

interface GDPLayerProps {
  map: google.maps.Map | null;
  gdpLookup: GDPLookup | null;
  fipsLookup?: GDPDataByFIPS;
  visible: boolean;
}

/**
 * Enhance GeoJSON features with GDP data
 */
function enhanceGeoJSONWithGDP(
  geoJson: CountyGeoJSON,
  gdpLookup: GDPLookup,
  fipsLookup?: GDPDataByFIPS
): CountyGeoJSON {
  // Convert GDP lookup to format compatible with matchCountiesToFeatures
  const populationLookup: { [key: string]: { 2010: number | null; 2020: number | null } } = {};
  for (const [key, value] of Object.entries(gdpLookup)) {
    // Use gdp_2022 as "2010" and gdp_2023 as "2020" for compatibility with existing matching function
    populationLookup[key] = {
      2010: value.gdp_2022,
      2020: value.gdp_2023,
    };
  }

  // Convert FIPS lookup to format compatible with matchCountiesToFeatures
  const populationFipsLookup: { [fips: string]: { 2010: number | null; 2020: number | null; change: number | null; name: string; geoId: string } } = {};
  if (fipsLookup) {
    for (const [fips, value] of Object.entries(fipsLookup)) {
      populationFipsLookup[fips] = {
        2010: value.gdp_2022,
        2020: value.gdp_2023,
        change: value.change_2023,
        name: value.name,
        geoId: fips,
      };
    }
  }

  const matches = matchCountiesToFeatures(populationLookup, geoJson.features, populationFipsLookup);
  
  // Create a new features array with enhanced properties
  const enhancedFeatures = geoJson.features.map((feature, index) => {
    const gdpData = matches.get(index);
    
    if (gdpData) {
      // Get GDP data from FIPS lookup if available, otherwise from name lookup
      let gdp_2022 = gdpData[2010]; // Using 2010 slot for 2022
      let gdp_2023 = gdpData[2020]; // Using 2020 slot for 2023
      let change_2023 = gdpData.change;
      
      // Try to get from FIPS lookup if available
      if (fipsLookup) {
        const props = feature.properties;
        const geoid = props.GEOID || props.geoid || props.id;
        if (geoid && fipsLookup[geoid]) {
          gdp_2022 = fipsLookup[geoid].gdp_2022;
          gdp_2023 = fipsLookup[geoid].gdp_2023;
          change_2023 = fipsLookup[geoid].change_2023;
        }
      }
      
      // Use change from database if available, otherwise calculate it
      const change = change_2023 !== null && change_2023 !== undefined
        ? change_2023
        : (gdp_2022 !== null && gdp_2023 !== null && gdp_2022 !== undefined && gdp_2023 !== undefined && gdp_2022 > 0
          ? parseFloat(((gdp_2023 - gdp_2022) / gdp_2022 * 100).toFixed(2))
          : null);
      
      // Always set countyName from original properties if not in GDP data
      const props = feature.properties;
      let countyName = gdpData.countyName;
      if (!countyName) {
        if (props.NAMELSAD) {
          countyName = props.NAMELSAD;
        } else if (props.NAME_LSAD) {
          countyName = props.NAME_LSAD;
        } else if (props.NAME) {
          countyName = props.NAME + (props.LSAD ? ' ' + props.LSAD : '');
        }
      }
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          gdp2022: gdp_2022,
          gdp2023: gdp_2023,
          change2023: change,
          countyName: countyName || gdpData.countyName,
        },
      };
    }
    
    // Even without GDP data, ensure countyName is set
    const props = feature.properties;
    let countyName = '';
    if (props.NAMELSAD) {
      countyName = props.NAMELSAD;
    } else if (props.NAME_LSAD) {
      countyName = props.NAME_LSAD;
    } else if (props.NAME) {
      countyName = props.NAME + (props.LSAD ? ' ' + props.LSAD : '');
    }
    
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

export default function GDPLayer({ map, gdpLookup, fipsLookup, visible }: GDPLayerProps) {
  const [geoJson, setGeoJson] = useState<CountyGeoJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const [dataLayerReady, setDataLayerReady] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState<{
    name: string;
    gdp: number | null;
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
        
        if (gdpLookup) {
          const enhanced = enhanceGeoJSONWithGDP(loadedGeoJson, gdpLookup, fipsLookup);
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
  }, [visible, gdpLookup, fipsLookup]);

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
        'gdp2022', 'gdp2023', 'change2023',
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
      
      const gdp2022 = props.gdp2022;
      const gdp2023 = props.gdp2023;
      const change2023 = props.change2023;
      
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
        
        // Format GDP values (they're in thousands)
        const formatGDP = (value: number | null | undefined) => {
          if (value === null || value === undefined) return 'N/A';
          // Convert from thousands to millions for display
          const millions = value / 1000;
          return `$${millions.toFixed(2)}M`;
        };
        
        // Create new InfoWindow
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #111827;">
                ${countyName}
              </h3>
              ${gdp2022 !== null && gdp2022 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>GDP (2022):</strong> ${formatGDP(gdp2022)}
                </p>
              ` : ''}
              ${gdp2023 !== null && gdp2023 !== undefined ? `
                <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
                  <strong>GDP (2023):</strong> ${formatGDP(gdp2023)}
                </p>
              ` : ''}
              ${change2023 !== null && change2023 !== undefined && !isNaN(change2023) ? `
                <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: ${change2023 >= 0 ? '#ea580c' : '#7c3aed'};">
                  <strong>Change (2022-2023):</strong> ${change2023 >= 0 ? '+' : ''}${change2023.toFixed(2)}%
                </p>
              ` : ''}
              ${(gdp2022 === null || gdp2022 === undefined) && (gdp2023 === null || gdp2023 === undefined) && (change2023 === null || change2023 === undefined) ? `
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
          gdp: gdp2023 || gdp2022 || null,
          position: { lat: center.lat(), lng: center.lng() },
        });
      }
    });
  }, [map]);

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
            const propertyKeys = ['countyName', 'NAME', 'NAMELSAD', 'STATE', 'COUNTY', 'change2023', 'gdp2022', 'gdp2023'];
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
            
            let change = props?.change2023;
            
            // Final fallback: direct property access
            if (change === undefined || change === null) {
              try {
                change = feature.getProperty('change2023');
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
                console.log('Sample GDP feature properties:', {
                  props,
                  change,
                  directChange: feature.getProperty('change2023'),
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
                console.log(`County with positive GDP change: ${change.toFixed(2)}%, color: ${color}`);
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
        let change = props?.change2023;
        if (change === undefined || change === null) {
          try {
            change = feature.getProperty('change2023');
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

      console.log(`✅ Applied GDP styling to ${styledCount} county features (${hasChangeDataCount} with change data)`);
    } catch (err) {
      console.error('Error adding GeoJSON to Data Layer:', err);
    }
  }, [dataLayerReady, geoJson]);

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
