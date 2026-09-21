import { formatProjectPipelineSheetDate } from '@/lib/project-pipeline/due-date-emphasis';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import {
  isClientPortalBlocked,
  mapProjectStatusToClientPortalStage,
} from '@/lib/client-portal/stages';
import type {
  ClientPortalEngagement,
  ClientPortalFile,
  ClientPortalRequest,
  ClientPortalSafeJob,
  ClientPortalUpdate,
  ClientPortalWorkspace,
} from '@/lib/client-portal/types';

export function toClientPortalSafeJob(
  job: Pick<
    ProjectPipelineJob,
    | 'jobNumber'
    | 'client'
    | 'propertyLocation'
    | 'service'
    | 'dueDate'
    | 'contractStart'
    | 'projectStatus'
  >,
  openRequestCount: number
): ClientPortalSafeJob {
  return {
    jobNumber: job.jobNumber,
    client: job.client,
    propertyLocation: job.propertyLocation,
    service: job.service,
    dueDate: formatProjectPipelineSheetDate(job.dueDate) || job.dueDate,
    contractStart:
      formatProjectPipelineSheetDate(job.contractStart) || job.contractStart,
    projectStatus: job.projectStatus,
    stage: mapProjectStatusToClientPortalStage(job.projectStatus),
    blocked: isClientPortalBlocked(openRequestCount),
  };
}

export function buildClientPortalWorkspace(input: {
  job: ProjectPipelineJob;
  engagement: ClientPortalEngagement | null;
  updates: ClientPortalUpdate[];
  requests: ClientPortalRequest[];
  files: ClientPortalFile[];
}): ClientPortalWorkspace {
  const openRequestCount = input.requests.filter(
    (request) => request.status === 'open'
  ).length;
  return {
    job: toClientPortalSafeJob(input.job, openRequestCount),
    engagement: input.engagement,
    updates: input.updates,
    requests: input.requests,
    files: input.files,
    openRequestCount,
  };
}

export function clientPortalJobPath(jobNumber: string): string {
  return `/client-portal/${encodeURIComponent(jobNumber.trim())}`;
}
