import {
  getProjectPipelineDueDateEmphasis,
  parseProjectPipelineDueDate,
} from '@/lib/project-pipeline/due-date-emphasis';
import type { PipelineCurrentWorkloadAuthorInput } from '@/lib/project-pipeline/current-workload';
import { parseAppraiserConsultantValues } from '@/lib/project-pipeline/appraiser-consultant-display';
import { isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';
import {
  isBothManagedUserDivision,
} from '@/lib/managed-users/division';
import { isHiddenWorkloadManagedUser, isHiddenWorkloadSheetConsultant } from '@/lib/project-pipeline/workload-authors';
import { jobMatchesProjectPipelineSegment } from '@/lib/project-pipeline/segment';
import { isConsultantWorkloadVisibleProjectStatus } from '@/lib/project-pipeline/project-status';
import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import { workloadConsultantBucketNames } from '@/lib/project-pipeline/workload-co-consultants';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type PipelineConsultantJobGroup = {
  consultantName: string;
  jobCount: number;
  pastDueCount: number;
  dueSoonCount: number;
  jobs: ProjectPipelineJob[];
};

function isWorkloadVisibleJob(job: ProjectPipelineJob): boolean {
  const status = withDerivedProjectPipelineProjectStatus(job).projectStatus;
  return isConsultantWorkloadVisibleProjectStatus(status);
}

function jobMatchesSegment(job: ProjectPipelineJob, segmentFilter: string): boolean {
  if (!segmentFilter) return true;
  return jobMatchesProjectPipelineSegment(job.commercialOutdoor, segmentFilter as 'Outdoor' | 'Commercial');
}

function isJobAuthoredBy(job: ProjectPipelineJob, displayName: string): boolean {
  const consultants = parseAppraiserConsultantValues(job.appraiserConsultant);
  if (!consultants.length) {
    return isJobAuthoredByConsultant(job.appraiserConsultant, displayName);
  }

  return consultants.some((consultant) =>
    isJobAuthoredByConsultant(consultant, displayName)
  );
}

function sortJobsByDueDate(jobs: readonly ProjectPipelineJob[]): ProjectPipelineJob[] {
  return [...jobs].sort((a, b) => {
    const aDue = parseProjectPipelineDueDate(a.dueDate);
    const bDue = parseProjectPipelineDueDate(b.dueDate);
    if (aDue == null && bDue == null) {
      return a.jobNumber.localeCompare(b.jobNumber, undefined, { numeric: true });
    }
    if (aDue == null) return 1;
    if (bDue == null) return -1;
    if (aDue !== bDue) return bDue - aDue;
    return a.jobNumber.localeCompare(b.jobNumber, undefined, { numeric: true });
  });
}

function summarizeJobs(jobs: readonly ProjectPipelineJob[]) {
  let pastDueCount = 0;
  let dueSoonCount = 0;
  for (const job of jobs) {
    const emphasis = getProjectPipelineDueDateEmphasis(job);
    if (emphasis === 'past-due') pastDueCount += 1;
    else if (emphasis === 'due-soon') dueSoonCount += 1;
  }
  return { pastDueCount, dueSoonCount };
}

function consultantFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function sortGroups(groups: PipelineConsultantJobGroup[]): PipelineConsultantJobGroup[] {
  return [...groups].sort((a, b) => {
    const firstNameCmp = consultantFirstName(a.consultantName).localeCompare(
      consultantFirstName(b.consultantName),
      undefined,
      { sensitivity: 'base' }
    );
    if (firstNameCmp !== 0) return firstNameCmp;

    return a.consultantName.localeCompare(b.consultantName, undefined, { sensitivity: 'base' });
  });
}

function addJobToConsultantBucket(
  grouped: Map<string, ProjectPipelineJob[]>,
  consultantName: string,
  job: ProjectPipelineJob
) {
  const bucket = grouped.get(consultantName) ?? [];
  bucket.push(job);
  grouped.set(consultantName, bucket);
}

function groupJobsOnly(
  jobs: readonly ProjectPipelineJob[],
  segmentFilter: string
): PipelineConsultantJobGroup[] {
  const visibleJobs = jobs.filter(isWorkloadVisibleJob);
  const grouped = new Map<string, ProjectPipelineJob[]>();

  for (const job of visibleJobs) {
    for (const consultantName of workloadConsultantBucketNames(job.appraiserConsultant)) {
      if (isHiddenWorkloadSheetConsultant(consultantName)) continue;
      addJobToConsultantBucket(grouped, consultantName, job);
    }
  }

  let groups = [...grouped.entries()].map(([consultantName, consultantJobs]) => {
    const sortedJobs = sortJobsByDueDate(consultantJobs);
    const { pastDueCount, dueSoonCount } = summarizeJobs(sortedJobs);
    return {
      consultantName,
      jobCount: sortedJobs.length,
      pastDueCount,
      dueSoonCount,
      jobs: sortedJobs,
    };
  });

  if (segmentFilter) {
    groups = groups.filter((group) =>
      group.jobs.some((job) => jobMatchesSegment(job, segmentFilter))
    );
  }

  return sortGroups(groups);
}

function groupJobsWithManagedAuthors(
  jobs: readonly ProjectPipelineJob[],
  authors: readonly PipelineCurrentWorkloadAuthorInput[],
  segmentFilter: string
): PipelineConsultantJobGroup[] {
  const visibleJobs = jobs.filter(isWorkloadVisibleJob);
  const segmentMatchedJobs = segmentFilter
    ? visibleJobs.filter((job) => jobMatchesSegment(job, segmentFilter))
    : visibleJobs;

  const eligibleAuthors = authors.filter((author) => {
    const displayName = author.displayName.trim();
    if (!displayName || isHiddenWorkloadManagedUser(displayName)) return false;
    return true;
  });

  const groups: PipelineConsultantJobGroup[] = [];
  const authorDivisionByName = new Map<string, string | null | undefined>();

  for (const author of eligibleAuthors) {
    const consultantName = author.displayName.trim();
    authorDivisionByName.set(consultantName.toLowerCase(), author.division);

    const allAuthorJobs = visibleJobs.filter((job) => isJobAuthoredBy(job, consultantName));

    const sortedJobs = sortJobsByDueDate(allAuthorJobs);
    const { pastDueCount, dueSoonCount } = summarizeJobs(sortedJobs);
    groups.push({
      consultantName,
      jobCount: sortedJobs.length,
      pastDueCount,
      dueSoonCount,
      jobs: sortedJobs,
    });
  }

  const unmatchedNames = new Set<string>();
  for (const job of segmentMatchedJobs) {
    for (const bucketName of workloadConsultantBucketNames(job.appraiserConsultant)) {
      if (isHiddenWorkloadSheetConsultant(bucketName)) continue;

      const hasManagedAuthor = eligibleAuthors.some((author) =>
        isJobAuthoredByConsultant(bucketName, author.displayName.trim())
      );
      if (hasManagedAuthor) continue;

      unmatchedNames.add(bucketName);
    }
  }

  for (const consultantName of unmatchedNames) {
    const allConsultantJobs = visibleJobs.filter((job) =>
      workloadConsultantBucketNames(job.appraiserConsultant).some((bucketName) =>
        isJobAuthoredByConsultant(bucketName, consultantName)
      )
    );
    const sortedJobs = sortJobsByDueDate(allConsultantJobs);
    const { pastDueCount, dueSoonCount } = summarizeJobs(sortedJobs);
    groups.push({
      consultantName,
      jobCount: sortedJobs.length,
      pastDueCount,
      dueSoonCount,
      jobs: sortedJobs,
    });
  }

  const visibleGroups = groups.filter((group) => {
    if (!segmentFilter) {
      if (group.jobCount > 0) return true;
      const division = authorDivisionByName.get(group.consultantName.toLowerCase());
      return isBothManagedUserDivision(division);
    }

    const hasSegmentJob = segmentMatchedJobs.some((job) => isJobAuthoredBy(job, group.consultantName));
    if (hasSegmentJob) return true;

    const division = authorDivisionByName.get(group.consultantName.toLowerCase());
    return isBothManagedUserDivision(division);
  });

  return sortGroups(visibleGroups);
}

/** Groups incomplete jobs by appraiser / consultant (matches admin workload Current view). */
export function groupPipelineJobsByConsultant(
  jobs: readonly ProjectPipelineJob[],
  options?: {
    authors?: readonly PipelineCurrentWorkloadAuthorInput[];
    segmentFilter?: string;
  }
): PipelineConsultantJobGroup[] {
  if (options?.authors?.length) {
    return groupJobsWithManagedAuthors(jobs, options.authors, options.segmentFilter ?? '');
  }

  return groupJobsOnly(jobs, options?.segmentFilter ?? '');
}
