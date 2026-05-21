/**
 * GET /api/admin/sage-glamping-data/brands/audit
 * Published-property brand assignment audit report.
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { runBrandAssignmentAudit } from '@/lib/brand-assignment-audit';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
  try {
    const report = await runBrandAssignmentAudit();
    return NextResponse.json({ success: true, report });
  } catch (err) {
    console.error('[admin/brands/audit] GET error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Audit failed' },
      { status: 500 }
    );
  }
});
