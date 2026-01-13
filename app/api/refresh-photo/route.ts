import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to refresh Google Places photos for a property
 * This fetches fresh photo references from Google Places API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyName } = body;
    
    if (!propertyName) {
      return NextResponse.json({ error: 'propertyName is required' }, { status: 400 });
    }
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    const supabase = createServerClient();
    
    // Get the property
    const { data: properties, error: fetchError } = await supabase
      .from('all_glamping_properties')
      .select('id, property_name, google_place_id, google_photos')
      .ilike('property_name', propertyName)
      .limit(1);
    
    if (fetchError) {
      return NextResponse.json({ error: 'Database error', details: fetchError }, { status: 500 });
    }
    
    if (!properties || properties.length === 0) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }
    
    const property = properties[0];
    
    if (!property.google_place_id) {
      return NextResponse.json({ 
        error: 'Property has no Google Place ID', 
        property: property.property_name 
      }, { status: 400 });
    }
    
    // Fetch fresh place details from Google
    const placeDetailsUrl = `https://places.googleapis.com/v1/places/${property.google_place_id}`;
    const fieldMask = 'id,displayName,photos,rating,userRatingCount,websiteUri,internationalPhoneNumber';
    
    const response = await fetch(placeDetailsUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error');
      return NextResponse.json({ 
        error: 'Google Places API error', 
        status: response.status,
        details: errorText 
      }, { status: 500 });
    }
    
    const placeData = await response.json();
    
    // Extract photos
    let freshPhotos: Array<{
      name: string;
      widthPx?: number;
      heightPx?: number;
      authorAttributions?: Array<{
        displayName: string;
        uri?: string;
        photoUri?: string;
      }>;
    }> | null = null;
    
    if (placeData.photos && Array.isArray(placeData.photos) && placeData.photos.length > 0) {
      freshPhotos = placeData.photos.slice(0, 5).map((photo: any) => ({
        name: photo.name || '',
        widthPx: photo.widthPx,
        heightPx: photo.heightPx,
        authorAttributions: photo.authorAttributions || [],
      }));
    }
    
    // Update the database
    const { error: updateError } = await supabase
      .from('all_glamping_properties')
      .update({
        google_photos: freshPhotos,
        google_rating: placeData.rating,
        google_user_rating_total: placeData.userRatingCount,
        google_phone_number: placeData.internationalPhoneNumber,
        google_website_uri: placeData.websiteUri,
      })
      .eq('id', property.id);
    
    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update database', 
        details: updateError 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      property: property.property_name,
      updated: {
        photos: freshPhotos?.length || 0,
        rating: placeData.rating,
        ratingsCount: placeData.userRatingCount,
      },
      freshPhotos: freshPhotos,
    }, { status: 200 });
    
  } catch (error) {
    console.error('[Refresh Photo] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}
