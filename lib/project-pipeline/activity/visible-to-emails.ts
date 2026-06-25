import { isJobAssignedToUser } from '@/lib/project-pipeline/filter-jobs';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? '';
}

export function resolveProjectPipelineActivityVisibleEmails(input: {
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'projMgr'>;
  actorEmail: string | null | undefined;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
}): string[] {
  const emails = new Set<string>();
  const actor = normalizeEmail(input.actorEmail);
  if (actor) emails.add(actor);

  for (const row of input.managedUsers) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    if (isJobAssignedToUser(input.job, row.display_name)) {
      emails.add(email);
    }
  }

  return [...emails];
}
