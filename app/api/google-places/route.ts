import { NextRequest, NextResponse } from 'next/server';
import { fetchGooglePlacesDataCached } from '@/lib/google-places-cache';
import { normalizePlacesApiPlaceId } from '@/lib/google-places-place-id';
import { isAllowedPublicMapApiCaller } from '@/lib/public-map-api-guard';
import {
  enforcePublicMapApiRateLimits,
  publicMapApiRateLimitResponse,
} from '@/lib/public-map-api-rate-limit';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * API route to fetch Google Places data
 * This is used for client-side fetching to avoid blocking build time
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAllowedPublicMapApiCaller(request)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const rateLimit = await enforcePublicMapApiRateLimits(request, 'google-places');
    if (!rateLimit.allowed) {
      return publicMapApiRateLimitResponse(rateLimit, { error: 'Too many requests' });
    }

    const searchParams = request.nextUrl.searchParams;
    const propertyName = searchParams.get('propertyName');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const address = searchParams.get('address');
    const knownPlaceId = normalizePlacesApiPlaceId(searchParams.get('placeId'));

    if (!propertyName) {
      return NextResponse.json(
        { error: 'propertyName parameter is required' },
        { status: 400 }
      );
    }

    const data = await fetchGooglePlacesDataCached(
      propertyName,
      city || null,
      state || null,
      address || null,
      knownPlaceId
    );

    if (!data) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching Google Places data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
