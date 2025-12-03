/**
 * Google Sheets integration utilities
 * Supports multiple approaches for fetching data from Google Sheets
 */

export interface GoogleSheetProperty {
  // Required fields for mapping
  name?: string;
  property_name?: string;
  lat?: string | number;
  latitude?: string | number;
  lon?: string | number;
  longitude?: string | number;
  lng?: string | number;
  
  // Optional fields
  city?: string;
  state?: string;
  address?: string;
  description?: string;
  url?: string;
  type?: string;
  [key: string]: any; // Allow any additional fields
}

export interface ParsedSheetProperty {
  id: string;
  name: string;
  coordinates: [number, number] | null;
  city?: string;
  state?: string;
  address?: string;
  description?: string;
  url?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Parse coordinates from various field names and formats
 */
export function parseSheetCoordinates(
  property: GoogleSheetProperty
): [number, number] | null {
  const lat =
    property.lat ??
    property.latitude ??
    property.Latitude ??
    property.LAT ??
    null;
  const lon =
    property.lon ??
    property.longitude ??
    property.lng ??
    property.Longitude ??
    property.LONGITUDE ??
    property.LNG ??
    null;

  if (!lat || !lon) return null;

  const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
  const longitude = typeof lon === 'string' ? parseFloat(lon) : lon;

  // Validate coordinates
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return [latitude, longitude];
}

/**
 * Normalize property name from various field names
 */
export function getPropertyName(property: GoogleSheetProperty): string {
  return (
    property.name ??
    property.property_name ??
    property.Name ??
    property.Property ??
    property.title ??
    property.Title ??
    'Unnamed Property'
  );
}

/**
 * Parse a row from Google Sheets into a standardized property object
 */
export function parseSheetRow(
  row: GoogleSheetProperty,
  index: number
): ParsedSheetProperty {
  const coordinates = parseSheetCoordinates(row);
  const name = getPropertyName(row);

  return {
    id: `sheet-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    coordinates,
    city: row.city ?? row.City ?? row.CITY ?? undefined,
    state: row.state ?? row.State ?? row.STATE ?? undefined,
    address: row.address ?? row.Address ?? row.ADDRESS ?? undefined,
    description: row.description ?? row.Description ?? row.DESCRIPTION ?? undefined,
    url: row.url ?? row.URL ?? row.website ?? row.Website ?? undefined,
    type: row.type ?? row.Type ?? row.property_type ?? row.Property_Type ?? undefined,
    ...Object.fromEntries(
      Object.entries(row).filter(([key]) => {
        const lowerKey = key.toLowerCase();
        return ![
          'name',
          'property_name',
          'lat',
          'latitude',
          'lon',
          'longitude',
          'lng',
          'city',
          'state',
          'address',
          'description',
          'url',
          'type',
        ].includes(lowerKey);
      })
    ),
  };
}

/**
 * Filter properties that have valid coordinates
 */
export function filterPropertiesWithCoordinates(
  properties: ParsedSheetProperty[]
): Array<ParsedSheetProperty & { coordinates: [number, number] }> {
  return properties
    .filter((prop): prop is ParsedSheetProperty & { coordinates: [number, number] } =>
      prop.coordinates !== null
    );
}

/**
 * Fetch data from a public Google Sheet (JSON format)
 * 
 * @param sheetId - The Google Sheet ID from the URL
 * @param sheetName - The name of the sheet/tab (optional, defaults to first sheet)
 * @returns Parsed properties array
 */
export async function fetchPublicGoogleSheet(
  sheetId: string,
  sheetName?: string
): Promise<ParsedSheetProperty[]> {
  try {
    const sheetParam = sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : '';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${sheetParam}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }

    const text = await response.text();
    // Remove the prefix "google.visualization.Query.setResponse(" and suffix ");"
    const jsonText = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/)?.[1];
    if (!jsonText) {
      throw new Error('Invalid response format from Google Sheets');
    }

    const data = JSON.parse(jsonText);
    
    if (!data.table || !data.table.rows) {
      throw new Error('Invalid sheet format');
    }

    // Extract column headers
    const columns = data.table.cols.map((col: any) => col.label || '');
    
    // Convert rows to objects
    const properties: GoogleSheetProperty[] = data.table.rows.map((row: any) => {
      const property: GoogleSheetProperty = {};
      row.c.forEach((cell: any, index: number) => {
        if (columns[index]) {
          const key = columns[index].toLowerCase().replace(/\s+/g, '_');
          property[key] = cell?.v ?? cell?.f ?? null;
        }
      });
      return property;
    });

    // Parse and normalize properties
    return properties.map((prop, index) => parseSheetRow(prop, index));
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    throw error;
  }
}

/**
 * Type guard to check if a property has valid coordinates
 */
export function hasValidCoordinates(
  property: ParsedSheetProperty
): property is ParsedSheetProperty & { coordinates: [number, number] } {
  return property.coordinates !== null;
}

