/**
 * POST /api/admin/sage-glamping-data/brands/backfill
 * Body: { dryRun?: boolean; brandSlugs?: string[] }
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { applyBrandBackfill } from '@/lib/brand-assignment-audit';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request) => {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      dryRun?: boolean;
      brandSlugs?: string[];
    };

    const result = await applyBrandBackfill({
      dryRun: body.dryRun !== false,
      brandSlugs: Array.isArray(body.brandSlugs) ? body.brandSlugs : undefined,
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('[admin/brands/backfill] POST error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Backfill failed' },
      { status: 500 }
    );
  }
});
