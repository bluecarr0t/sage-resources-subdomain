import type { ProjectPipelineJob } from './types';
import { extractNameAliases, fieldMatchesNameAliases, isJobAuthoredByConsultant } from './name-aliases';

export interface FilterJobsForUserInput {
  email: string | null | undefined;
  displayName: string | null | undefined;
  pipelineViewAll?: boolean;
}

export function isJobAssignedToUser(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'projMgr'>,
  displayName: string | null | undefined
): boolean {
  const aliases = extractNameAliases(displayName);
  if (!aliases.length) return false;

  return (
    isJobAuthoredByConsultant(job.appraiserConsultant, displayName ?? '') ||
    fieldMatchesNameAliases(job.projMgr, aliases)
  );
}

export function filterJobsForUser(
  jobs: readonly ProjectPipelineJob[],
  input: FilterJobsForUserInput
): ProjectPipelineJob[] {
  if (input.pipelineViewAll) {
    return [...jobs];
  }

  const aliases = extractNameAliases(input.displayName);
  if (!aliases.length) return [];

  return jobs.filter((job) => isJobAssignedToUser(job, input.displayName));
}

export function userNeedsDisplayNameForPipeline(
  input: FilterJobsForUserInput
): boolean {
  if (input.pipelineViewAll) return false;
  return !input.displayName?.trim();
}
