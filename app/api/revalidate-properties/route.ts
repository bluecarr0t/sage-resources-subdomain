import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * API route to revalidate the properties cache
 * 
 * Call this endpoint after adding new properties to force cache refresh
 * 
 * Usage:
 * POST /api/revalidate-properties
 * 
 * Optional: Add authentication/authorization if needed
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Revalidate the 'properties' tag
    revalidateTag('properties');
    
    return NextResponse.json({
      success: true,
      message: 'Properties cache revalidated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error revalidating properties cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to revalidate cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support GET for convenience (though POST is recommended)
export async function GET(request: NextRequest) {
  return POST(request);
}
