import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireClientPortalJobAccess } from '@/lib/client-portal/auth';
import {
  buildClientPortalStoragePath,
  insertClientPortalFile,
  uploadClientPortalStorageFile,
} from '@/lib/client-portal/db';
import {
  CLIENT_PORTAL_ALLOWED_MIME_TYPES,
  CLIENT_PORTAL_MAX_FILE_BYTES,
} from '@/lib/client-portal/constants';
import { loadClientPortalWorkspace } from '@/lib/client-portal/load-workspace';
import { resolveClientPortalStaffNotificationEmails } from '@/lib/client-portal/staff-recipients';
import { notifyClientPortalEmail } from '@/lib/email/client-portal-resend';
import { buildClientPortalFileUploadedEmail } from '@/lib/email/client-portal-email-templates';

export const dynamic = 'force-dynamic';

type ParamsContext = { params: Promise<{ jobNumber: string }> };

function isAllowedMime(value: string): boolean {
  return (CLIENT_PORTAL_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest, context: ParamsContext) {
  const { jobNumber: raw } = await context.params;
  const jobNumber = decodeURIComponent(raw ?? '');
  const access = await requireClientPortalJobAccess(jobNumber);
  if (!access.ok) return access.response;

  const { engagement, job, user } = access.access;
  if (!engagement?.enabled) {
    return NextResponse.json({ error: 'Portal is not enabled for this job' }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const labelRaw = form.get('label');
  const requestIdRaw = form.get('requestId');
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
  const supabase = createServerClient();
  await uploadClientPortalStorageFile(supabase, {
    storagePath,
    body: buffer,
    contentType,
  });

  const label =
    typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim() : file.name;
  const requestId =
    typeof requestIdRaw === 'string' && requestIdRaw.trim() ? requestIdRaw.trim() : null;

  await insertClientPortalFile(supabase, {
    engagementId: engagement.id,
    requestId,
    label,
    storagePath,
    uploadedByRole: access.access.isStaff ? 'staff' : 'client',
    uploadedByEmail: user.email,
  });

  if (!access.access.isStaff) {
    const staffEmails = await resolveClientPortalStaffNotificationEmails(job);
    if (staffEmails.length) {
      const { subject, html } = buildClientPortalFileUploadedEmail({
        job: {
          jobNumber: job.jobNumber,
          client: job.client,
          propertyLocation: job.propertyLocation,
          service: job.service,
        },
        label,
        uploadedByRole: 'client',
      });
      notifyClientPortalEmail({ to: staffEmails, subject, html });
    }
  }

  const workspace = await loadClientPortalWorkspace({ job, engagement });
  return NextResponse.json({ workspace });
}
