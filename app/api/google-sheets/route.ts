/**
 * API Route for fetching Google Sheets data
 * 
 * This endpoint fetches data from Google Sheets and returns it as JSON.
 * Supports both public sheets (via sheetId) and private sheets (via service account).
 * 
 * Query parameters:
 * - sheetId: The Google Sheet ID (required)
 * - sheetName: The name of the sheet/tab (optional)
 * - public: Set to 'true' to fetch as public sheet (optional, defaults to true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPublicGoogleSheet } from '@/lib/google-sheets';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sheetId = searchParams.get('sheetId');
    const sheetName = searchParams.get('sheetName') || undefined;
    const isPublic = searchParams.get('public') !== 'false';

    if (!sheetId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sheetId' },
        { status: 400 }
      );
    }

    // For now, we'll use the public sheet approach
    // TODO: Add support for private sheets using Google Sheets API
    if (isPublic) {
      const properties = await fetchPublicGoogleSheet(sheetId, sheetName || undefined);
      return NextResponse.json({
        success: true,
        data: properties,
        count: properties.length,
      });
    }

    // TODO: Implement private sheet fetching using service account
    // This would use google-spreadsheet package with credentials from env
    return NextResponse.json(
      { error: 'Private sheet access not yet implemented. Set public=true or use public sheet.' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in Google Sheets API route:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Google Sheet data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

