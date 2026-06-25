import {
  HIDDEN_WORKLOAD_PEOPLE,
  isHiddenWorkloadManagedUser,
  isHiddenWorkloadSheetConsultant,
  jobMatchesHiddenWorkloadAuthor,
} from '@/lib/project-pipeline/workload-authors';
import {
  isBothManagedUserDivision,
  managedUserDivisionMatchesSegmentFilter,
} from '@/lib/managed-users/division';
import {
  getProjectPipelineDueDateEmphasis,
  parseProjectPipelineDueDate,
  type ProjectPipelineDueDateEmphasis,
} from '@/lib/project-pipeline/due-date-emphasis';
import { isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import {
  jobMatchesProjectPipelineSegment,
  resolveProjectPipelineJobSegment,
} from '@/lib/project-pipeline/segment';
import {
  DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER,
  resolvePipelineWorkloadSegmentFilter,
  type PipelineWorkloadSegmentFilter,
} from '@/lib/project-pipeline/workload';

export type PipelineCurrentWorkloadAuthorInput = {
  displayName: string;
  email?: string | null;
  division?: string | null;
};

export type PipelineCurrentWorkloadJob = {
  jobNumber: string;
  client: string;
  propertyLocation: string;
  dueDate: string;
  segment: string;
  service: string;
  reviewStatus: string;
  projMgr: string;
  dueDateEmphasis: ProjectPipelineDueDateEmphasis | null;
};

export type PipelineCurrentWorkloadAuthor = {
  name: string;
  email: string | null;
  division: string | null;
  jobCount: number;
  pastDueCount: number;
  dueSoonCount: number;
  jobs: PipelineCurrentWorkloadJob[];
};

export type PipelineCurrentWorkload = {
  sheetName: string;
  totalIncompleteJobs: number;
  byAuthor: PipelineCurrentWorkloadAuthor[];
};

function isIncomplete(job: ProjectPipelineJob): boolean {
  return !job.dateCompleted?.trim();
}

function jobMatchesSegmentFilter(
  job: ProjectPipelineJob,
  segmentFilter: PipelineWorkloadSegmentFilter
): boolean {
  if (segmentFilter === 'both') return true;
  return jobMatchesProjectPipelineSegment(job.commercialOutdoor, segmentFilter);
}

function isJobAuthoredBy(job: ProjectPipelineJob, displayName: string): boolean {
  return isJobAuthoredByConsultant(job.appraiserConsultant, displayName);
}

function toWorkloadJob(job: ProjectPipelineJob, now: Date): PipelineCurrentWorkloadJob {
  return {
    jobNumber: job.jobNumber,
    client: job.client,
    propertyLocation: job.propertyLocation,
    dueDate: job.dueDate,
    segment: resolveProjectPipelineJobSegment(job.commercialOutdoor),
    service: job.service,
    reviewStatus: job.reviewStatus,
    projMgr: job.projMgr,
    dueDateEmphasis: getProjectPipelineDueDateEmphasis(job, now),
  };
}

function sortJobs(jobs: PipelineCurrentWorkloadJob[]): PipelineCurrentWorkloadJob[] {
  return [...jobs].sort((a, b) => {
    const aDue = parseProjectPipelineDueDate(a.dueDate);
    const bDue = parseProjectPipelineDueDate(b.dueDate);
    if (aDue == null && bDue == null) {
      return a.jobNumber.localeCompare(b.jobNumber, undefined, { numeric: true });
    }
    if (aDue == null) return 1;
    if (bDue == null) return -1;
    if (aDue !== bDue) return aDue - bDue;
    return a.jobNumber.localeCompare(b.jobNumber, undefined, { numeric: true });
  });
}

function summarizeAuthorJobs(jobs: PipelineCurrentWorkloadJob[]): {
  pastDueCount: number;
  dueSoonCount: number;
} {
  let pastDueCount = 0;
  let dueSoonCount = 0;
  for (const job of jobs) {
    if (job.dueDateEmphasis === 'past-due') pastDueCount += 1;
    else if (job.dueDateEmphasis === 'due-soon') dueSoonCount += 1;
  }
  return { pastDueCount, dueSoonCount };
}

function sortAuthors(rows: PipelineCurrentWorkloadAuthor[]): PipelineCurrentWorkloadAuthor[] {
  return [...rows].sort((a, b) => {
    if (a.jobCount !== b.jobCount) return a.jobCount - b.jobCount;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function consolidateAuthorsByDisplayName(
  rows: readonly PipelineCurrentWorkloadAuthor[]
): PipelineCurrentWorkloadAuthor[] {
  const byName = new Map<string, PipelineCurrentWorkloadAuthor>();

  for (const row of rows) {
    if (isHiddenWorkloadManagedUser(row.name)) continue;

    const key = row.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, row);
      continue;
    }

    const jobByNumber = new Map<string, PipelineCurrentWorkloadJob>();
    for (const job of [...existing.jobs, ...row.jobs]) {
      jobByNumber.set(job.jobNumber, job);
    }
    const jobs = sortJobs([...jobByNumber.values()]);
    const { pastDueCount, dueSoonCount } = summarizeAuthorJobs(jobs);

    byName.set(key, {
      name: existing.name,
      email: existing.email ?? row.email,
      division: existing.division ?? row.division,
      jobCount: jobs.length,
      pastDueCount,
      dueSoonCount,
      jobs,
    });
  }

  return sortAuthors([...byName.values()]);
}

export function buildPipelineCurrentWorkload(
  jobs: readonly ProjectPipelineJob[],
  authors: readonly PipelineCurrentWorkloadAuthorInput[],
  sheetName: string,
  options: {
    segmentFilter?: PipelineWorkloadSegmentFilter | string | null;
    now?: Date;
  } = {}
): PipelineCurrentWorkload {
  const segmentFilter = resolvePipelineWorkloadSegmentFilter(
    options.segmentFilter ?? DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER
  );
  const now = options.now ?? new Date();

  const scoped = jobs.filter(
    (job) => isIncomplete(job) && jobMatchesSegmentFilter(job, segmentFilter)
  );

  const assignedJobNumbers = new Set<string>();
  const byAuthor: PipelineCurrentWorkloadAuthor[] = [];

  for (const author of authors) {
    const displayName = author.displayName.trim();
    if (!displayName || isHiddenWorkloadManagedUser(displayName)) continue;
    if (
      segmentFilter !== 'both' &&
      !managedUserDivisionMatchesSegmentFilter(author.division, segmentFilter)
    ) {
      continue;
    }

    const authorJobs = scoped
      .filter((job) => !assignedJobNumbers.has(job.jobNumber) && isJobAuthoredBy(job, displayName))
      .map((job) => {
        assignedJobNumbers.add(job.jobNumber);
        return toWorkloadJob(job, now);
      });

    const sortedJobs = sortJobs(authorJobs);
    const { pastDueCount, dueSoonCount } = summarizeAuthorJobs(sortedJobs);

    byAuthor.push({
      name: displayName,
      email: author.email ?? null,
      division: author.division ?? null,
      jobCount: sortedJobs.length,
      pastDueCount,
      dueSoonCount,
      jobs: sortedJobs,
    });
  }

  const unmatched = new Map<string, PipelineCurrentWorkloadJob[]>();

  for (const job of scoped) {
    if (assignedJobNumbers.has(job.jobNumber)) continue;
    if (isJobAuthoredByHiddenPerson(job)) continue;

    const appraiserName = job.appraiserConsultant?.trim() || '(Unassigned)';
    if (isHiddenWorkloadSheetConsultant(appraiserName)) continue;
    const bucket = unmatched.get(appraiserName) ?? [];
    bucket.push(toWorkloadJob(job, now));
    unmatched.set(appraiserName, bucket);
  }

  for (const [name, authorJobs] of unmatched) {
    if (isHiddenWorkloadSheetConsultant(name)) continue;
    const sortedJobs = sortJobs(authorJobs);
    const { pastDueCount, dueSoonCount } = summarizeAuthorJobs(sortedJobs);
    byAuthor.push({
      name,
      email: null,
      division: null,
      jobCount: sortedJobs.length,
      pastDueCount,
      dueSoonCount,
      jobs: sortedJobs,
    });
  }

  return {
    sheetName,
    totalIncompleteJobs: scoped.filter((job) => !isJobAuthoredByHiddenPerson(job)).length,
    byAuthor: consolidateAuthorsByDisplayName(byAuthor),
  };
}

function isJobAuthoredByHiddenPerson(job: ProjectPipelineJob): boolean {
  if (isHiddenWorkloadSheetConsultant(job.appraiserConsultant)) return true;
  return HIDDEN_WORKLOAD_PEOPLE.some((hidden) =>
    jobMatchesHiddenWorkloadAuthor(job.appraiserConsultant, hidden)
  );
}

export { resolveManagedUserPipelineDisplayName } from '@/lib/project-pipeline/workload-authors';

/** Authors shown on the Current Workload tab (active jobs only). */
export function filterCurrentWorkloadAuthorsForDisplay(
  authors: readonly PipelineCurrentWorkloadAuthor[],
  segmentFilter: PipelineWorkloadSegmentFilter | string = 'both'
): PipelineCurrentWorkloadAuthor[] {
  const activeSegment = segmentFilter === 'both' ? '' : segmentFilter;

  return authors.filter((author) => {
    if (isHiddenWorkloadManagedUser(author.name)) return false;
    if (activeSegment && !managedUserDivisionMatchesSegmentFilter(author.division, activeSegment)) {
      return false;
    }
    if (author.jobCount > 0) return true;
    return isBothManagedUserDivision(author.division);
  });
}
