import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { revalidatePropertiesCache } from '@/lib/revalidate-properties-cache';

export const dynamic = 'force-dynamic';

/**
 * Clears Redis map/property caches and revalidates public map routes.
 * Same underlying work as POST /api/revalidate-properties, but gated by admin session.
 */
export const POST = withAdminAuth(async () => {
  try {
    const result = await revalidatePropertiesCache();
    revalidatePath('/', 'layout');
    revalidatePath('/map', 'page');
    revalidatePath('/[locale]/map', 'page');
    revalidatePath('/[locale]/property', 'page');

    return NextResponse.json({
      success: true,
      redisKeysDeleted: result.redisKeysDeleted ?? 0,
    });
  } catch (error) {
    console.error('[admin/sage-glamping-data/revalidate-map] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh map caches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
