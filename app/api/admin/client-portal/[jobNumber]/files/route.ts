import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { isValidEmail } from '@/lib/gated-access';
import { isClientPortalEnabled } from '@/lib/client-portal/is-enabled';
import { isClientPortalJobEligible } from '@/lib/client-portal/eligibility';
import {
  buildClientPortalStoragePath,
  fetchClientPortalEngagementByJobNumber,
  fetchLatestProjectPipelineJobByNumber,
  insertClientPortalFile,
  uploadClientPortalStorageFile,
} from '@/lib/client-portal/db';
import {
  CLIENT_PORTAL_ALLOWED_MIME_TYPES,
  CLIENT_PORTAL_MAX_FILE_BYTES,
} from '@/lib/client-portal/constants';
import { loadClientPortalWorkspace } from '@/lib/client-portal/load-workspace';
import { notifyClientPortalEmail } from '@/lib/email/client-portal-resend';
import { buildClientPortalFileUploadedEmail } from '@/lib/email/client-portal-email-templates';

export const dynamic = 'force-dynamic';

type ParamsContext = { params: Promise<{ jobNumber: string }> };

function isAllowedMime(value: string): boolean {
  return (CLIENT_PORTAL_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export const POST = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  if (!isClientPortalEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { jobNumber: raw } = await context!.params;
  const jobNumber = decodeURIComponent(raw ?? '');
  const supabase = createServerClient();
  const job = await fetchLatestProjectPipelineJobByNumber(supabase, jobNumber);
  if (!job || !isClientPortalJobEligible(job)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

  const form = await request.formData();
  const file = form.get('file');
  const labelRaw = form.get('label');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required' }, { status: 400 });
  }
  if (file.size > CLIENT_PORTAL_MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File is too large (25MB max)' }, { status: 400 });
  }
  const contentType = file.type || 'application/octet-stream';
  if (!isAllowedMime(contentType)) {
    return NextResponse.json({ error: 'That file type is not allowed' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = buildClientPortalStoragePath({
    jobNumber: job.jobNumber,
    fileName: file.name,
  });
  await uploadClientPortalStorageFile(supabase, {
    storagePath,
    body: buffer,
    contentType,
  });

  const actorEmail = auth.session.user.email ?? '';
  const label =
    typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim() : file.name;

  await insertClientPortalFile(supabase, {
    engagementId: engagement.id,
    label,
    storagePath,
    uploadedByRole: 'staff',
    uploadedByEmail: actorEmail,
  });

  if (isValidEmail(engagement.invitedEmail)) {
    const { subject, html } = buildClientPortalFileUploadedEmail({
      job: {
        jobNumber: job.jobNumber,
        client: job.client,
        propertyLocation: job.propertyLocation,
        service: job.service,
      },
      label,
      uploadedByRole: 'staff',
    });
    notifyClientPortalEmail({
      to: engagement.invitedEmail,
      subject,
      html,
    });
  }

  const workspace = await loadClientPortalWorkspace({ job, engagement });
  return NextResponse.json({
    workspace: {
      ...workspace,
      eligible: true,
      eligibilityReasons: [],
      invitedEmail: engagement.invitedEmail,
    },
  });
});
