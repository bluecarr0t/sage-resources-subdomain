import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy Google Places Photo requests
 * This is needed because the new Places API requires authentication via headers
 * and we don't want to expose the API key in client-side code
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const photoName = searchParams.get('photoName');
    const maxWidthPx = searchParams.get('maxWidthPx') || '800';
    const maxHeightPx = searchParams.get('maxHeightPx') || '600';

    if (!photoName) {
      return NextResponse.json(
        { error: 'photoName parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Try the new Places API (New) format first with proper headers
    const newApiUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}`;
    
    console.log('Attempting new Places API format:', newApiUrl.substring(0, 100) + '...');
    
    let response = await fetch(newApiUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'Content-Type': 'image/jpeg',
      },
    });
    
    // If new API fails, try legacy format
    if (!response.ok) {
      console.log('New API failed, trying legacy format...');
      
      // Extract photo reference from the name for legacy API
      // Format: places/PLACE_ID/photos/PHOTO_REFERENCE
      const photoRefMatch = photoName.match(/photos\/([^\/]+)/);
      
      if (photoRefMatch) {
        const photoRef = photoRefMatch[1];
        const legacyUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidthPx}&photo_reference=${photoRef}&key=${apiKey}`;
        
        console.log('Trying legacy API:', legacyUrl.substring(0, 100) + '...');
        
        response = await fetch(legacyUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error('Failed to fetch photo:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 200),
      });
      
      // If 403, provide helpful error message
      if (response.status === 403) {
        return NextResponse.json(
          { 
            error: 'API key does not have permission to access Places API photos.',
            details: 'Please ensure your Google Cloud API key has the "Places API" enabled. Go to Google Cloud Console > APIs & Services > Enable APIs, and enable "Places API" (not just "Maps JavaScript API").',
            status: 403
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Failed to fetch photo from Google Places API. Status: ${response.status}`,
          details: errorText.substring(0, 200)
        },
        { status: response.status }
      );
    }

    // Return the image
    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching Google Places photo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

