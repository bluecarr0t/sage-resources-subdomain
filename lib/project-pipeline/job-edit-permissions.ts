import type { ManagedUser } from '@/lib/auth-helpers';
import { isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';
import {
  isProjectPipelineSentToClientYes,
  normalizeProjectPipelineSentToClient,
  PROJECT_PIPELINE_SENT_TO_CLIENT_OPTIONS,
} from '@/lib/project-pipeline/sent-to-client';
import { normalizeProjectPipelineFlag } from '@/lib/project-pipeline/project-flag';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export function isManagedUserAdmin(
  user: Pick<ManagedUser, 'role'> | null | undefined
): boolean {
  return user?.role === 'admin';
}

export function canManuallyEditProjectPipelineStatus(
  user: Pick<ManagedUser, 'role'> | null | undefined
): boolean {
  return isManagedUserAdmin(user);
}

export function canEditProjectPipelineFlag(
  user: Pick<ManagedUser, 'role'> | null | undefined
): boolean {
  return isManagedUserAdmin(user);
}

export function canDeleteProjectPipelineJob(
  user: Pick<ManagedUser, 'role'> | null | undefined
): boolean {
  return isManagedUserAdmin(user);
}

export function isProjectPipelineJobAuthor(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant'>,
  displayName: string | null | undefined
): boolean {
  return isJobAuthoredByConsultant(job.appraiserConsultant, displayName ?? '');
}

export function canSetProjectPipelineSentToClientYes(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): boolean {
  if (options?.isAdmin) return true;
  return isProjectPipelineJobAuthor(job, displayName);
}

export function canEditProjectPipelineDueDate(
  _job?: Pick<ProjectPipelineJob, 'appraiserConsultant'>,
  _displayName?: string | null
): boolean {
  return true;
}

export function canEditProjectPipelineReviewStatus(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): boolean {
  if (options?.isAdmin) return true;
  return !isProjectPipelineJobAuthor(job, displayName);
}

export function canEditProjectPipelineSentToClient(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'sentToClient'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): boolean {
  if (options?.isAdmin) return true;
  if (isProjectPipelineJobAuthor(job, displayName)) return true;
  return !isProjectPipelineSentToClientYes(job.sentToClient);
}

export function getAllowedSentToClientOptions(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'sentToClient'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): readonly string[] {
  if (canSetProjectPipelineSentToClientYes(job, displayName, options)) {
    return PROJECT_PIPELINE_SENT_TO_CLIENT_OPTIONS;
  }

  return isProjectPipelineSentToClientYes(job.sentToClient) ? ['Yes'] : ['No'];
}

export function assertProjectPipelineJobFieldEditsAllowed(
  previous: ProjectPipelineJob,
  next: ProjectPipelineJob,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): void {
  const prevSent = normalizeProjectPipelineSentToClient(previous.sentToClient);
  const nextSent = normalizeProjectPipelineSentToClient(next.sentToClient);

  if (prevSent !== nextSent) {
    if (!canEditProjectPipelineSentToClient(previous, displayName, options)) {
      throw new Error('Only the assigned consultant can change sent to client');
    }
    if (nextSent === 'Yes' && !canSetProjectPipelineSentToClientYes(next, displayName, options)) {
      throw new Error('Only the assigned consultant can mark a project as sent to client');
    }
  }

  if (previous.reviewStatus.trim() !== next.reviewStatus.trim()) {
    if (!canEditProjectPipelineReviewStatus(next, displayName, options)) {
      throw new Error('The assigned consultant cannot change review status');
    }
  }

  if (
    normalizeProjectPipelineFlag(previous.flag) !== normalizeProjectPipelineFlag(next.flag)
  ) {
    if (!options?.isAdmin) {
      throw new Error('Only admins can change project flag');
    }
  }
}
