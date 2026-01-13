import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to inspect the raw photo data from Supabase
 * and test Google's photo API directly
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyName = searchParams.get('property') || 'Wildhaven Sonoma';
    
    const supabase = createServerClient();
    
    // Fetch the property with its Google photos
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, google_place_id, google_photos, google_rating, google_user_rating_total')
      .ilike('property_name', propertyName)
      .limit(1);
    
    if (error) {
      return NextResponse.json({ error: 'Database error', details: error }, { status: 500 });
    }
    
    if (!properties || properties.length === 0) {
      return NextResponse.json({ error: 'Property not found', propertyName }, { status: 404 });
    }
    
    const property = properties[0];
    
    // Parse photos if they're a string
    let photos = property.google_photos;
    if (typeof photos === 'string') {
      try {
        photos = JSON.parse(photos);
      } catch (e) {
        return NextResponse.json({
          error: 'Failed to parse photos JSON',
          rawPhotos: photos,
          parseError: String(e)
        }, { status: 500 });
      }
    }
    
    // Test the first photo with Google's API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    let testResults = null;
    
    if (photos && Array.isArray(photos) && photos.length > 0) {
      const firstPhoto = photos[0];
      const photoName = firstPhoto.name;
      
      // Test 1: Legacy API
      const photoRef = photoName.match(/photos\/(.+)$/)?.[1];
      let legacyResult: any = { attempted: false };
      
      if (photoRef) {
        const legacyUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(photoRef)}&key=${apiKey}`;
        try {
          const legacyResponse = await fetch(legacyUrl, { method: 'GET' });
          legacyResult = {
            attempted: true,
            status: legacyResponse.status,
            statusText: legacyResponse.statusText,
            ok: legacyResponse.ok,
            contentType: legacyResponse.headers.get('content-type'),
            error: legacyResponse.ok ? null : await legacyResponse.text().catch(() => 'Could not read error')
          };
        } catch (e) {
          legacyResult = {
            attempted: true,
            error: String(e)
          };
        }
      }
      
      // Test 2: New API (encoded)
      const encodedParts = photoName.split('/').map((p: string) => encodeURIComponent(p));
      const encodedPhotoName = encodedParts.join('/');
      const newApiUrl = `https://places.googleapis.com/v1/${encodedPhotoName}/media?maxWidthPx=400&maxHeightPx=225`;
      
      let newApiResult: any = { attempted: false };
      try {
        const newApiResponse = await fetch(newApiUrl, {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': apiKey,
            'Accept': 'image/jpeg',
          },
        });
        newApiResult = {
          attempted: true,
          status: newApiResponse.status,
          statusText: newApiResponse.statusText,
          ok: newApiResponse.ok,
          contentType: newApiResponse.headers.get('content-type'),
          error: newApiResponse.ok ? null : await newApiResponse.text().catch(() => 'Could not read error')
        };
      } catch (e) {
        newApiResult = {
          attempted: true,
          error: String(e)
        };
      }
      
      // Test 3: New API (unencoded)
      const unencodedApiUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&maxHeightPx=225`;
      
      let unencodedApiResult: any = { attempted: false };
      try {
        const unencodedApiResponse = await fetch(unencodedApiUrl, {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': apiKey,
            'Accept': 'image/jpeg',
          },
        });
        unencodedApiResult = {
          attempted: true,
          status: unencodedApiResponse.status,
          statusText: unencodedApiResponse.statusText,
          ok: unencodedApiResponse.ok,
          contentType: unencodedApiResponse.headers.get('content-type'),
          error: unencodedApiResponse.ok ? null : await unencodedApiResponse.text().catch(() => 'Could not read error')
        };
      } catch (e) {
        unencodedApiResult = {
          attempted: true,
          error: String(e)
        };
      }
      
      testResults = {
        photoName,
        photoNameLength: photoName.length,
        photoRef: photoRef || 'N/A',
        photoRefLength: photoRef?.length || 0,
        legacyApi: legacyResult,
        newApiEncoded: newApiResult,
        newApiUnencoded: unencodedApiResult,
        firstPhotoObject: firstPhoto
      };
    }
    
    return NextResponse.json({
      property: {
        name: property.property_name,
        placeId: property.google_place_id,
        rating: property.google_rating,
        ratingsCount: property.google_user_rating_total
      },
      photos: {
        raw: property.google_photos,
        parsed: photos,
        count: Array.isArray(photos) ? photos.length : 0,
        type: typeof photos,
        isArray: Array.isArray(photos)
      },
      testResults
    }, { status: 200 });
    
  } catch (error) {
    console.error('[Test Photo Data] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}
