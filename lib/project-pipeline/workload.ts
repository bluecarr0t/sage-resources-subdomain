import type { ProjectPipelineJob } from './types';
import type { ProjectPipelineSegment } from './segment';
import { resolveProjectPipelineJobSegment } from './segment';
import { filterHiddenWorkloadPersonRows, isHiddenWorkloadPerson } from './workload-authors';

export type PipelineWorkloadPersonJob = {
  jobNumber: string;
  client: string;
  propertyLocation: string;
  segment: ProjectPipelineSegment;
  service: string;
  dueDate: string;
  reviewStatus: string;
  appraiserConsultant: string;
  projMgr: string;
};

export type PipelineWorkloadPersonRow = {
  name: string;
  outdoor: number;
  commercial: number;
  unknown: number;
  total: number;
  jobs: PipelineWorkloadPersonJob[];
};

export type PipelineWorkloadSummary = {
  sheetName: string;
  totalJobs: number;
  incompleteJobs: number;
  byAppraiser: PipelineWorkloadPersonRow[];
  byProjMgr: PipelineWorkloadPersonRow[];
};

export type PipelineWorkloadSegmentFilter = 'both' | ProjectPipelineSegment;

export const DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER: PipelineWorkloadSegmentFilter = 'both';

export function resolvePipelineWorkloadSegmentFilter(
  value: string | null | undefined
): PipelineWorkloadSegmentFilter {
  if (value === 'Outdoor' || value === 'Commercial') return value;
  return DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER;
}

function jobMatchesSegmentFilter(
  job: ProjectPipelineJob,
  segmentFilter: PipelineWorkloadSegmentFilter
): boolean {
  if (segmentFilter === 'both') return true;
  return normalizeSegment(job) === segmentFilter;
}

function normalizeSegment(job: ProjectPipelineJob): ProjectPipelineSegment {
  return resolveProjectPipelineJobSegment(job.commercialOutdoor);
}

function isIncomplete(job: ProjectPipelineJob): boolean {
  return !job.dateCompleted?.trim();
}

function toWorkloadPersonJob(job: ProjectPipelineJob): PipelineWorkloadPersonJob {
  return {
    jobNumber: job.jobNumber,
    client: job.client,
    propertyLocation: job.propertyLocation,
    segment: normalizeSegment(job),
    service: job.service,
    dueDate: job.dueDate,
    reviewStatus: job.reviewStatus,
    appraiserConsultant: job.appraiserConsultant,
    projMgr: job.projMgr,
  };
}

function personKey(rawName: string | null | undefined): string {
  return rawName?.trim() || '(Unassigned)';
}

function bumpBucket(
  map: Map<string, PipelineWorkloadPersonRow>,
  rawName: string | null | undefined,
  segment: ProjectPipelineSegment,
  job: PipelineWorkloadPersonJob
) {
  const name = personKey(rawName);
  const existing = map.get(name) ?? {
    name,
    outdoor: 0,
    commercial: 0,
    unknown: 0,
    total: 0,
    jobs: [],
  };

  if (segment === 'Outdoor') existing.outdoor += 1;
  else existing.commercial += 1;
  existing.total += 1;
  existing.jobs.push(job);

  map.set(name, existing);
}

function sortPersonJobs(jobs: PipelineWorkloadPersonJob[]): PipelineWorkloadPersonJob[] {
  return [...jobs].sort((a, b) =>
    a.jobNumber.localeCompare(b.jobNumber, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function rowsFromMap(map: Map<string, PipelineWorkloadPersonRow>): PipelineWorkloadPersonRow[] {
  return [...map.values()]
    .map((row) => ({ ...row, jobs: sortPersonJobs(row.jobs) }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

export function buildPipelineWorkloadSummary(
  jobs: readonly ProjectPipelineJob[],
  sheetName: string,
  options: {
    incompleteOnly?: boolean;
    segmentFilter?: PipelineWorkloadSegmentFilter;
  } = {}
): PipelineWorkloadSummary {
  const {
    incompleteOnly = true,
    segmentFilter = DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER,
  } = options;

  const segmentScoped = jobs.filter((job) => jobMatchesSegmentFilter(job, segmentFilter));
  const scoped = incompleteOnly ? segmentScoped.filter(isIncomplete) : [...segmentScoped];

  const appraiserMap = new Map<string, PipelineWorkloadPersonRow>();
  const projMgrMap = new Map<string, PipelineWorkloadPersonRow>();

  for (const job of scoped) {
    const segment = normalizeSegment(job);
    const personJob = toWorkloadPersonJob(job);
    if (!isHiddenWorkloadPerson(job.appraiserConsultant)) {
      bumpBucket(appraiserMap, job.appraiserConsultant, segment, personJob);
    }
    if (!isHiddenWorkloadPerson(job.projMgr)) {
      bumpBucket(projMgrMap, job.projMgr, segment, personJob);
    }
  }

  return {
    sheetName,
    totalJobs: segmentScoped.length,
    incompleteJobs: segmentScoped.filter(isIncomplete).length,
    byAppraiser: filterHiddenWorkloadPersonRows(rowsFromMap(appraiserMap)),
    byProjMgr: filterHiddenWorkloadPersonRows(rowsFromMap(projMgrMap)),
  };
}
