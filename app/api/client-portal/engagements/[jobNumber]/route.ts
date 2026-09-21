import { NextRequest, NextResponse } from 'next/server';
import { requireClientPortalJobAccess } from '@/lib/client-portal/auth';
import { loadClientPortalWorkspace } from '@/lib/client-portal/load-workspace';

export const dynamic = 'force-dynamic';

type ParamsContext = { params: Promise<{ jobNumber: string }> };

export async function GET(_request: NextRequest, context: ParamsContext) {
  const { jobNumber: raw } = await context.params;
  const jobNumber = decodeURIComponent(raw ?? '');
  const access = await requireClientPortalJobAccess(jobNumber);
  if (!access.ok) return access.response;

  const workspace = await loadClientPortalWorkspace({
    job: access.access.job,
    engagement: access.access.engagement,
  });

  return NextResponse.json({
    workspace,
    isStaff: access.access.isStaff,
  });
}
