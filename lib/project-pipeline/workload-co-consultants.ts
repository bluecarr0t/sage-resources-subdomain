import { parseAppraiserConsultantValues } from '@/lib/project-pipeline/appraiser-consultant-display';
import { isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

/** Sheet consultant names on this job excluding the workload section owner. */
export function getWorkloadCoConsultantLabels(
  job: ProjectPipelineJob,
  groupConsultantName: string
): string[] {
  const consultants = parseAppraiserConsultantValues(job.appraiserConsultant);
  if (consultants.length <= 1) return [];

  return consultants.filter(
    (name) => !isJobAuthoredByConsultant(name, groupConsultantName)
  );
}

export function workloadJobHasMultipleConsultants(job: ProjectPipelineJob): boolean {
  return parseAppraiserConsultantValues(job.appraiserConsultant).length > 1;
}

/** Individual consultant buckets for workload grouping (splits Greg/Shari, Greg, Luke). */
export function workloadConsultantBucketNames(
  appraiserConsultant: string | null | undefined
): string[] {
  const parsed = parseAppraiserConsultantValues(appraiserConsultant);
  if (parsed.length) return parsed;
  const fallback = appraiserConsultant?.trim();
  return fallback ? [fallback] : ['(Unassigned)'];
}
