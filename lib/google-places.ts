/**
 * Google Places API utility functions
 * Fetches data directly from Google Places API (New) to comply with Google's Terms of Service
 * Do NOT store this data in the database
 */

export interface GooglePlacesData {
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName: string;
      uri?: string;
      photoUri?: string;
    }>;
  }>;
  websiteUri?: string;
  description?: string;
  phoneNumber?: string;
  placeId?: string;
}

/**
 * Search for a place using Google Places API (New) Text Search
 * Returns place_id and basic info if found
 */
async function searchPlace(
  apiKey: string,
  propertyName: string,
  city?: string | null,
  state?: string | null,
  address?: string | null
): Promise<{ placeId: string; rating?: number; userRatingCount?: number } | null> {
  // Build search query
  const queryParts: string[] = [propertyName];
  if (city) queryParts.push(city);
  if (state) queryParts.push(state);
  if (address) queryParts.push(address);

  const query = queryParts.join(' ');

  const url = 'https://places.googleapis.com/v1/places:searchText';
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
  };
  const payload = {
    textQuery: query,
    maxResultCount: 1,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places Search API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        placeId: place.id,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching Google Places:', error);
    return null;
  }
}

/**
 * Get detailed place information using Google Places API (New) Place Details
 * Fetches: rating, review count, photos, website, description (editorialSummary or generativeSummary)
 */
async function getPlaceDetails(
  apiKey: string,
  placeId: string
): Promise<{
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName: string;
      uri?: string;
      photoUri?: string;
    }>;
  }>;
  websiteUri?: string;
  description?: string;
  phoneNumber?: string;
} | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'rating,userRatingCount,photos,websiteUri,editorialSummary,generativeSummary,internationalPhoneNumber',
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places Details API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();

    // Extract photos (limit to top 5)
    let photos: Array<{
      name: string;
      widthPx?: number;
      heightPx?: number;
      authorAttributions?: Array<{
        displayName: string;
        uri?: string;
        photoUri?: string;
      }>;
    }> | undefined;

    if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      photos = data.photos.slice(0, 5).map((photo: any) => ({
        name: photo.name || '',
        widthPx: photo.widthPx,
        heightPx: photo.heightPx,
        authorAttributions: photo.authorAttributions || [],
      }));
    }

    // Extract description: prioritize editorialSummary, fallback to generativeSummary
    let description: string | undefined;

    // Try editorialSummary first (Google's curated description)
    const editorialSummary = data.editorialSummary;
    if (editorialSummary) {
      if (typeof editorialSummary === 'object' && editorialSummary.text) {
        description = editorialSummary.text;
      } else if (typeof editorialSummary === 'string') {
        description = editorialSummary;
      }
    }

    // Fallback to generativeSummary (AI-generated description)
    if (!description) {
      const generativeSummary = data.generativeSummary;
      if (generativeSummary) {
        if (typeof generativeSummary === 'object' && generativeSummary.text) {
          description = generativeSummary.text;
        } else if (typeof generativeSummary === 'string') {
          description = generativeSummary;
        }
      }
    }

    return {
      rating: data.rating,
      userRatingCount: data.userRatingCount,
      photos,
      websiteUri: data.websiteUri,
      description,
      phoneNumber: data.internationalPhoneNumber,
    };
  } catch (error) {
    console.error('Error fetching Google Places details:', error);
    return null;
  }
}

/**
 * Fetch Google Places data for a property
 * Optionally accepts placeId to skip Text Search call (for efficiency)
 * 
 * @param propertyName - Name of the property
 * @param city - City name (optional)
 * @param state - State name (optional)
 * @param address - Street address (optional)
 * @param placeId - Optional place ID (if provided, skips Text Search call)
 */
export async function fetchGooglePlacesData(
  propertyName: string,
  city?: string | null,
  state?: string | null,
  address?: string | null,
  placeId?: string | null
): Promise<GooglePlacesData | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key not configured');
    return null;
  }

  let finalPlaceId = placeId || null;

  // Step 1: Search for the place to get place_id (if not provided)
  if (!finalPlaceId) {
    const searchResult = await searchPlace(apiKey, propertyName, city, state, address);

    if (!searchResult || !searchResult.placeId) {
      // Property not found in Google Places
      return null;
    }

    finalPlaceId = searchResult.placeId;
  }

  // Step 2: Get detailed information (rating, photos, website, description)
  // This ALWAYS fetches fresh - never cached per Google Terms
  const details = await getPlaceDetails(apiKey, finalPlaceId);

  if (!details) {
    return { placeId: finalPlaceId };
  }

  // Combine results - all data is fresh from API
  return {
    placeId: finalPlaceId,
    rating: details.rating,
    userRatingCount: details.userRatingCount,
    photos: details.photos,
    websiteUri: details.websiteUri,
    description: details.description,
    phoneNumber: details.phoneNumber,
  };
}
