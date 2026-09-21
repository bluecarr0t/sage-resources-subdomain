import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireClientPortalJobAccess } from '@/lib/client-portal/auth';
import { updateClientPortalRequest } from '@/lib/client-portal/db';
import {
  canClientSubmitPortalRequest,
  clientPortalRequestStatusAfterClientSubmit,
} from '@/lib/client-portal/request-status';
import { loadClientPortalWorkspace } from '@/lib/client-portal/load-workspace';
import { resolveClientPortalStaffNotificationEmails } from '@/lib/client-portal/staff-recipients';
import { notifyClientPortalEmail } from '@/lib/email/client-portal-resend';
import { buildClientPortalRequestSubmittedEmail } from '@/lib/email/client-portal-email-templates';

export const dynamic = 'force-dynamic';

type ParamsContext = { params: Promise<{ jobNumber: string }> };

export async function POST(request: NextRequest, context: ParamsContext) {
  const { jobNumber: raw } = await context.params;
  const jobNumber = decodeURIComponent(raw ?? '');
  const access = await requireClientPortalJobAccess(jobNumber);
  if (!access.ok) return access.response;

  const { engagement, job, isStaff } = access.access;
  if (!engagement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (isStaff) {
    return NextResponse.json(
      { error: 'Staff should clear requests from Job Pipeline' },
      { status: 400 }
    );
  }

  let body: { requestId?: unknown; response?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  const clientResponse = typeof body.response === 'string' ? body.response.trim() : '';
  if (!requestId) {
    return NextResponse.json({ error: 'Request id is required' }, { status: 400 });
  }

  const workspace = await loadClientPortalWorkspace({ job, engagement });
  const existing = workspace.requests.find((item) => item.id === requestId);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!canClientSubmitPortalRequest(existing.status)) {
    return NextResponse.json({ error: 'This item is no longer open' }, { status: 400 });
  }

  const nextStatus = clientPortalRequestStatusAfterClientSubmit(existing.status);
  if (!nextStatus) {
    return NextResponse.json({ error: 'This item is no longer open' }, { status: 400 });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();
  await updateClientPortalRequest(supabase, requestId, {
    status: nextStatus,
    client_response: clientResponse,
    submitted_at: now,
  });

  const staffEmails = await resolveClientPortalStaffNotificationEmails(job);
  if (staffEmails.length) {
    const { subject, html } = buildClientPortalRequestSubmittedEmail({
      job: {
        jobNumber: job.jobNumber,
        client: job.client,
        propertyLocation: job.propertyLocation,
        service: job.service,
      },
      title: existing.title,
      response: clientResponse,
    });
    notifyClientPortalEmail({ to: staffEmails, subject, html });
  }

  const nextWorkspace = await loadClientPortalWorkspace({ job, engagement });
  return NextResponse.json({ workspace: nextWorkspace });
}
