import { createServerClient } from '@/lib/supabase';
import { isClientPortalEnabled } from '@/lib/client-portal/is-enabled';
import {
  fetchClientPortalEngagementByJobNumber,
  fetchLatestProjectPipelineJobByNumber,
} from '@/lib/client-portal/db';
import { isClientPortalJobEligible } from '@/lib/client-portal/eligibility';
import { mapProjectStatusToClientPortalStage } from '@/lib/client-portal/stages';
import { notifyClientPortalEmail } from '@/lib/email/client-portal-resend';
import { buildClientPortalStatusEmail } from '@/lib/email/client-portal-email-templates';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export async function notifyClientPortalStatusChange(
  savedJob: ProjectPipelineJob
): Promise<void> {
  if (!isClientPortalEnabled()) return;

  const supabase = createServerClient();
  const job =
    (await fetchLatestProjectPipelineJobByNumber(supabase, savedJob.jobNumber)) ??
    savedJob;
  if (!isClientPortalJobEligible(job)) return;

  const engagement = await fetchClientPortalEngagementByJobNumber(
    supabase,
    job.jobNumber
  );
  if (!engagement?.enabled || !engagement.invitedEmail) return;

  const stageLabel = mapProjectStatusToClientPortalStage(job.projectStatus);
  const { subject, html } = buildClientPortalStatusEmail({
    job: {
      jobNumber: job.jobNumber,
      client: job.client,
      propertyLocation: job.propertyLocation,
      service: job.service,
    },
    stageLabel,
  });
  notifyClientPortalEmail({
    to: engagement.invitedEmail,
    subject,
    html,
  });
}

export function notifyClientPortalStatusChangeAsync(
  savedJob: ProjectPipelineJob
): void {
  void notifyClientPortalStatusChange(savedJob).catch((err) => {
    console.error('[client-portal-email] status notify failed:', err);
  });
}
