import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { isValidEmail } from '@/lib/gated-access';
import { isClientPortalEnabled } from '@/lib/client-portal/is-enabled';
import {
  getClientPortalEligibilityReasons,
  isClientPortalJobEligible,
  normalizeClientPortalEmail,
} from '@/lib/client-portal/eligibility';
import {
  fetchClientPortalEngagementByJobNumber,
  fetchLatestProjectPipelineJobByNumber,
  insertClientPortalFile,
  insertClientPortalRequest,
  insertClientPortalUpdate,
  updateClientPortalRequest,
  upsertClientPortalEngagement,
} from '@/lib/client-portal/db';
import { loadClientPortalWorkspace } from '@/lib/client-portal/load-workspace';
import {
  canStaffClearPortalRequest,
  clientPortalRequestStatusAfterStaffClear,
} from '@/lib/client-portal/request-status';
import {
  getClientPortalRequestOrigin,
  sendClientPortalMagicLinkIsolated,
} from '@/lib/client-portal/send-magic-link';
import { notifyClientPortalEmail } from '@/lib/email/client-portal-resend';
import {
  buildClientPortalAuthorNoteEmail,
  buildClientPortalInviteEmail,
  buildClientPortalFileUploadedEmail,
  buildClientPortalRequestClearedEmail,
  buildClientPortalRequestOpenedEmail,
} from '@/lib/email/client-portal-email-templates';
import type { ClientPortalStaffWorkspace } from '@/lib/client-portal/types';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export const dynamic = 'force-dynamic';

type ParamsContext = { params: Promise<{ jobNumber: string }> };

function productDisabled() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

function emailJob(job: ProjectPipelineJob) {
  return {
    jobNumber: job.jobNumber,
    client: job.client,
    propertyLocation: job.propertyLocation,
    service: job.service,
  };
}

async function staffWorkspace(
  job: ProjectPipelineJob
): Promise<ClientPortalStaffWorkspace> {
  const supabase = createServerClient();
  const engagement = await fetchClientPortalEngagementByJobNumber(
    supabase,
    job.jobNumber
  );
  const workspace = await loadClientPortalWorkspace({ job, engagement });
  return {
    ...workspace,
    eligible: isClientPortalJobEligible(job),
    eligibilityReasons: getClientPortalEligibilityReasons(job),
    invitedEmail: engagement?.invitedEmail || normalizeClientPortalEmail(job.clientEmail),
  };
}

export const GET = withAdminAuth<ParamsContext>(async (_request, _auth, context) => {
  if (!isClientPortalEnabled()) return productDisabled();
  const { jobNumber: raw } = await context!.params;
  const jobNumber = decodeURIComponent(raw ?? '');
  const supabase = createServerClient();
  const job = await fetchLatestProjectPipelineJobByNumber(supabase, jobNumber);
  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ workspace: await staffWorkspace(job) });
});

export const POST = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  if (!isClientPortalEnabled()) return productDisabled();
  const { jobNumber: raw } = await context!.params;
  const jobNumber = decodeURIComponent(raw ?? '');
  const supabase = createServerClient();
  const job = await fetchLatestProjectPipelineJobByNumber(supabase, jobNumber);
  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const managedUser = await getManagedUser(auth.session.user.id);
  const actorEmail = auth.session.user.email ?? '';
  const actorName =
    managedUser?.display_name?.trim() || actorEmail || 'Sage team';

  let body: {
    action?: unknown;
    note?: unknown;
    title?: unknown;
    body?: unknown;
    requestId?: unknown;
    label?: unknown;
    url?: unknown;
    emailClient?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';

  const requireEligible = () => {
    if (!isClientPortalJobEligible(job)) {
      return NextResponse.json(
        {
          error: 'Job is not eligible for the client portal',
          reasons: getClientPortalEligibilityReasons(job),
        },
        { status: 400 }
      );
    }
    return null;
  };

  switch (action) {
    case 'enable':
    case 'invite': {
      const ineligible = requireEligible();
      if (ineligible) return ineligible;
      const invitedEmail = normalizeClientPortalEmail(job.clientEmail);
      const engagement = await upsertClientPortalEngagement(supabase, {
        jobNumber: job.jobNumber,
        enabled: true,
        invitedEmail,
        markInvited: true,
        markWelcomeSent: true,
      });
      const { subject, html } = buildClientPortalInviteEmail({ job: emailJob(job) });
      notifyClientPortalEmail({ to: invitedEmail, subject, html });
      await sendClientPortalMagicLinkIsolated({
        origin: getClientPortalRequestOrigin(request),
        email: invitedEmail,
        jobNumber: job.jobNumber,
      });

      return NextResponse.json({
        workspace: await staffWorkspace(job),
        engagementId: engagement.id,
      });
    }
    case 'disable': {
      const existing = await fetchClientPortalEngagementByJobNumber(
        supabase,
        job.jobNumber
      );
      await upsertClientPortalEngagement(supabase, {
        jobNumber: job.jobNumber,
        enabled: false,
        invitedEmail:
          existing?.invitedEmail || normalizeClientPortalEmail(job.clientEmail),
      });
      return NextResponse.json({ workspace: await staffWorkspace(job) });
    }
    case 'add_update': {
      const ineligible = requireEligible();
      if (ineligible) return ineligible;
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (!note) {
        return NextResponse.json({ error: 'Note is required' }, { status: 400 });
      }
      let engagement = await fetchClientPortalEngagementByJobNumber(
        supabase,
        job.jobNumber
      );
      if (!engagement?.enabled) {
        return NextResponse.json(
          { error: 'Enable the client portal before posting notes' },
          { status: 400 }
        );
      }
      const emailClient = body.emailClient !== false;
      if (emailClient && isValidEmail(engagement.invitedEmail)) {
        const { subject, html } = buildClientPortalAuthorNoteEmail({
          job: emailJob(job),
          note,
        });
        notifyClientPortalEmail({
          to: engagement.invitedEmail,
          subject,
          html,
        });
      }
      await insertClientPortalUpdate(supabase, {
        engagementId: engagement.id,
        body: note,
        createdByEmail: actorEmail,
        createdByDisplayName: actorName,
        emailedAt: emailClient ? new Date().toISOString() : null,
      });
      return NextResponse.json({ workspace: await staffWorkspace(job) });
    }
    case 'add_request': {
      const ineligible = requireEligible();
      if (ineligible) return ineligible;
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const requestBody = typeof body.body === 'string' ? body.body.trim() : '';
      if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
      const engagement = await fetchClientPortalEngagementByJobNumber(
        supabase,
        job.jobNumber
      );
      if (!engagement?.enabled) {
        return NextResponse.json(
          { error: 'Enable the client portal before adding requests' },
          { status: 400 }
        );
      }
      const created = await insertClientPortalRequest(supabase, {
        engagementId: engagement.id,
        title,
        body: requestBody,
        createdByEmail: actorEmail,
        createdByDisplayName: actorName,
      });
      if (isValidEmail(engagement.invitedEmail)) {
        const { subject, html } = buildClientPortalRequestOpenedEmail({
          job: emailJob(job),
          title: created.title,
          body: created.body,
        });
        notifyClientPortalEmail({
          to: engagement.invitedEmail,
          subject,
          html,
        });
      }
      return NextResponse.json({ workspace: await staffWorkspace(job) });
    }
    case 'clear_request': {
      const requestId =
        typeof body.requestId === 'string' ? body.requestId.trim() : '';
      if (!requestId) {
        return NextResponse.json({ error: 'Request id is required' }, { status: 400 });
      }
      const engagement = await fetchClientPortalEngagementByJobNumber(
        supabase,
        job.jobNumber
      );
      if (!engagement) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const workspace = await loadClientPortalWorkspace({ job, engagement });
      const existing = workspace.requests.find((item) => item.id === requestId);
      if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (!canStaffClearPortalRequest(existing.status)) {
        return NextResponse.json({ error: 'Already cleared' }, { status: 400 });
      }
      const nextStatus = clientPortalRequestStatusAfterStaffClear(existing.status);
      if (!nextStatus) {
        return NextResponse.json({ error: 'Already cleared' }, { status: 400 });
      }
      await updateClientPortalRequest(supabase, requestId, {
        status: nextStatus,
        cleared_at: new Date().toISOString(),
        cleared_by_email: actorEmail,
      });
      if (engagement.enabled && isValidEmail(engagement.invitedEmail)) {
        const { subject, html } = buildClientPortalRequestClearedEmail({
          job: emailJob(job),
          title: existing.title,
        });
        notifyClientPortalEmail({
          to: engagement.invitedEmail,
          subject,
          html,
        });
      }
      return NextResponse.json({ workspace: await staffWorkspace(job) });
    }
    case 'add_file_link': {
      const ineligible = requireEligible();
      if (ineligible) return ineligible;
      const url = typeof body.url === 'string' ? body.url.trim() : '';
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      if (!url || !/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: 'A valid https URL is required' }, { status: 400 });
      }
      const engagement = await fetchClientPortalEngagementByJobNumber(
        supabase,
        job.jobNumber
      );
      if (!engagement?.enabled) {
        return NextResponse.json(
          { error: 'Enable the client portal before adding files' },
          { status: 400 }
        );
      }
      await insertClientPortalFile(supabase, {
        engagementId: engagement.id,
        label: label || url,
        externalUrl: url,
        uploadedByRole: 'staff',
        uploadedByEmail: actorEmail,
      });
      if (isValidEmail(engagement.invitedEmail)) {
        const { subject, html } = buildClientPortalFileUploadedEmail({
          job: emailJob(job),
          label: label || url,
          uploadedByRole: 'staff',
        });
        notifyClientPortalEmail({
          to: engagement.invitedEmail,
          subject,
          html,
        });
      }
      return NextResponse.json({ workspace: await staffWorkspace(job) });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
});
