import { resolveConsultantEmailsForField } from '@/lib/project-pipeline/notifications/resolve-recipients';
import { resolveProjMgrEmailsForField } from '@/lib/project-pipeline/notifications/resolve-review-recipients';
import { loadActiveManagedUsersForPipeline } from '@/lib/project-pipeline/notifications/load-managed-users';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { createServerClient } from '@/lib/supabase';

export async function resolveClientPortalStaffNotificationEmails(
  job: ProjectPipelineJob
): Promise<string[]> {
  const supabase = createServerClient();
  const managedUsers = await loadActiveManagedUsersForPipeline(supabase);
  const consultant = resolveConsultantEmailsForField(
    job.appraiserConsultant,
    managedUsers
  );
  const projMgr = resolveProjMgrEmailsForField(job.projMgr, managedUsers);
  return [...new Set([...consultant, ...projMgr].filter(Boolean))];
}
