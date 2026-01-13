import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * API route to proxy Google Places Photo requests
 * This is needed because the new Places API requires authentication via headers
 * and we don't want to expose the API key in client-side code
 * 
 * COMPLIANCE NOTE: Per Google Places API Terms of Service, we cannot cache/store photos.
 * Images are proxied fresh from Google on each request. Browser caching is limited
 * to 1 hour (3,600 seconds) for user experience. This short-term browser cache is
 * acceptable per industry practice and improves performance for repeat visitors within
 * the same session. Server-side caching (Redis, file system, database) is NOT used
 * for image bytes to remain fully compliant with Google's terms.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const photoName = searchParams.get('photoName');
    const maxWidthPx = searchParams.get('maxWidthPx') || '800';
    const maxHeightPx = searchParams.get('maxHeightPx') || '600';

    // Validate photoName parameter
    if (!photoName) {
      console.error('[Google Places Photo] Missing photoName parameter');
      return NextResponse.json(
        { error: 'photoName parameter is required' },
        { status: 400 }
      );
    }

    // Decode the photo name (it's encoded in the URL)
    const decodedPhotoName = decodeURIComponent(photoName);
    
    // Validate photo name format - should be in format: places/PLACE_ID/photos/PHOTO_REFERENCE
    if (!decodedPhotoName || decodedPhotoName.trim() === '') {
      console.error('[Google Places Photo] Empty photoName after decoding');
      return NextResponse.json(
        { error: 'Invalid photoName: empty or whitespace only' },
        { status: 400 }
      );
    }

    // Check if photo name has the expected format
    if (!decodedPhotoName.startsWith('places/') || !decodedPhotoName.includes('/photos/')) {
      console.error('[Google Places Photo] Invalid photo name format:', decodedPhotoName.substring(0, 100));
      // Don't fail here - might be a legacy format, let the API handle it
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Extract photo reference from the name for legacy API (which was working before)
    // Format: places/PLACE_ID/photos/PHOTO_REFERENCE
    const photoRefMatch = decodedPhotoName.match(/photos\/(.+)$/);
    
    let response: Response | null = null;
    
    // Try legacy API first since it was working before
    if (photoRefMatch && photoRefMatch[1]) {
      const photoRef = photoRefMatch[1];
      // URL encode the photo reference for the query parameter
      const encodedPhotoRef = encodeURIComponent(photoRef);
      const legacyUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidthPx}&photo_reference=${encodedPhotoRef}&key=${apiKey}`;
      
      console.log('[Google Places Photo] Trying legacy API first (was working before):', {
        photoRef: photoRef.substring(0, 50),
        photoRefLength: photoRef.length,
        url: legacyUrl.substring(0, 200)
      });
      
      response = await fetch(legacyUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      
      if (response.ok) {
        console.log('[Google Places Photo] Legacy API succeeded!');
      } else {
        console.log('[Google Places Photo] Legacy API failed with status', response.status, '- trying new API format...');
      }
    }
    
    // If legacy API failed or photo reference couldn't be extracted, try new Places API
    if (!response || !response.ok) {
      // Google's API expects the resource name in the path
      // According to Google docs, the photo name should be used as-is (they handle encoding internally)
      // But we need to properly encode it for the URL path
      const photoNameParts = decodedPhotoName.split('/');
      
      // Try multiple encoding strategies
      // Strategy 1: Encode each segment separately (preserves slashes)
      const encodedParts = photoNameParts.map(part => encodeURIComponent(part));
      const encodedPhotoNameInPath = encodedParts.join('/');
      
      // Strategy 2: Use photo name as-is (Google might handle it)
      const unencodedPhotoNameInPath = decodedPhotoName;
      
      // Try encoded version first
      let newApiUrl = `https://places.googleapis.com/v1/${encodedPhotoNameInPath}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}`;
      
      console.log('[Google Places Photo] Attempting new Places API format (encoded):', {
        photoName: decodedPhotoName,
        photoNameLength: decodedPhotoName.length,
        encodedPath: encodedPhotoNameInPath.substring(0, 150),
        url: newApiUrl.substring(0, 300),
        maxWidth: maxWidthPx,
        maxHeight: maxHeightPx,
        placeId: photoNameParts[1]?.substring(0, 30),
        photoRef: photoNameParts[3]?.substring(0, 50),
        parts: photoNameParts.length
      });
      
      response = await fetch(newApiUrl, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'Accept': 'image/jpeg',
        },
      });
      
      // If encoded fails with 400, try unencoded
      if (!response.ok && response.status === 400) {
        console.log('[Google Places Photo] Encoded version failed with 400, trying unencoded...');
        newApiUrl = `https://places.googleapis.com/v1/${unencodedPhotoNameInPath}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}`;
        
        response = await fetch(newApiUrl, {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': apiKey,
            'Accept': 'image/jpeg',
          },
        });
      }
    }
    
    if (!response || !response.ok) {
      const errorText = await response?.text().catch(() => 'Could not read error response') || 'No response received';
      
      // Try to parse error as JSON for better error details
      let errorDetails = errorText;
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch {
        // Not JSON, use as-is
      }
      
      // Extract photo reference for logging
      const photoRefMatchForError = decodedPhotoName.match(/photos\/(.+)$/);
      const photoRefForError = photoRefMatchForError?.[1] || 'N/A';
      
      console.error('[Google Places Photo] Failed to fetch photo:', {
        status: response?.status || 'NO_RESPONSE',
        statusText: response?.statusText || 'NO_RESPONSE',
        photoName: decodedPhotoName,
        photoNameLength: decodedPhotoName.length,
        photoRef: photoRefForError.substring(0, 100),
        photoRefLength: photoRefForError.length,
        photoNameParts: {
          startsWithPlaces: decodedPhotoName.startsWith('places/'),
          hasPhotos: decodedPhotoName.includes('/photos/'),
          placeId: decodedPhotoName.match(/places\/([^\/]+)/)?.[1]?.substring(0, 30),
          photoRefPreview: photoRefForError.substring(0, 50),
        },
        googleError: errorJson || errorDetails.substring(0, 500),
        errorText: errorText.substring(0, 500),
      });
      
      // If 400, provide helpful error message about invalid photo name
      // Include Google's actual error message for debugging
      if (response?.status === 400) {
        const googleError = errorJson?.error?.message || errorJson?.message || errorDetails;
        return NextResponse.json(
          { 
            error: 'Invalid photo name or format.',
            details: `The photo name "${decodedPhotoName.substring(0, 50)}..." is not valid. Photo names should be in format: places/PLACE_ID/photos/PHOTO_REFERENCE`,
            googleError: googleError,
            photoName: decodedPhotoName.substring(0, 100),
            photoRef: photoRefForError.substring(0, 100),
            status: 400
          },
          { status: 400 }
        );
      }
      
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
          details: errorText.substring(0, 200),
          photoName: decodedPhotoName.substring(0, 100)
        },
        { status: response.status }
      );
    }

    // Return the image
    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        // COMPLIANCE: Short-term browser cache (1 hour) for user experience
        // Per Google Places API Terms of Service, we cannot cache photos long-term
        // or store them server-side. This 1-hour cache is acceptable as it:
        // - Expires quickly (complies with terms)
        // - Improves UX for repeat visits within same session
        // - Only caches in user's browser (not server-side storage)
        // - Can be cleared by user clearing browser cache
        'Cache-Control': 'public, max-age=3600, must-revalidate',
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

