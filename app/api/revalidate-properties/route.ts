import { NextRequest, NextResponse } from 'next/server';
import { revalidatePropertiesCache } from '@/lib/revalidate-properties-cache';
import { revalidatePath } from 'next/cache';

/**
 * API route to revalidate the properties cache
 * 
 * Call this endpoint after adding new properties to force cache refresh
 * This will:
 * - Clear Redis cache for property statistics
 * - Clear all property filter caches
 * - Revalidate Next.js cache tags
 * - Revalidate property pages
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

    // Revalidate all property-related caches (Redis + Next.js)
    const result = await revalidatePropertiesCache();
    
    // Also revalidate property pages paths
    revalidatePath('/', 'layout');
    revalidatePath('/map', 'page');
    revalidatePath('/[locale]/map', 'page');
    revalidatePath('/[locale]/property', 'page');
    
    return NextResponse.json({
      success: true,
      message: 'Properties cache revalidated successfully',
      redisKeysDeleted: result.redisKeysDeleted || 0,
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
