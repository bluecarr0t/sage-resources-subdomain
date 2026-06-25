import type { ProjectPipelineWorkloadApiResponse } from '@/lib/project-pipeline/build-workload-api-response';
import { filterPipelineWorkloadChartsBySegment } from '@/lib/project-pipeline/workload-charts';
import type {
  PipelineWorkloadPersonRow,
  PipelineWorkloadSegmentFilter,
} from '@/lib/project-pipeline/workload';

function summarizePersonRowJobs(
  row: PipelineWorkloadPersonRow,
  segmentFilter: PipelineWorkloadSegmentFilter
): PipelineWorkloadPersonRow {
  const jobs =
    segmentFilter === 'both'
      ? row.jobs
      : row.jobs.filter((job) => job.segment === segmentFilter);

  const outdoor = jobs.filter((job) => job.segment === 'Outdoor').length;
  const commercial = jobs.filter((job) => job.segment === 'Commercial').length;

  return {
    ...row,
    jobs,
    outdoor,
    commercial,
    unknown: 0,
    total: jobs.length,
  };
}

export function filterWorkloadPersonRows(
  rows: readonly PipelineWorkloadPersonRow[],
  segmentFilter: PipelineWorkloadSegmentFilter
): PipelineWorkloadPersonRow[] {
  if (segmentFilter === 'both') return [...rows];

  return rows
    .map((row) => summarizePersonRowJobs(row, segmentFilter))
    .filter((row) => row.total > 0);
}

export function sumSegmentCountsFromPersonRows(
  rows: readonly PipelineWorkloadPersonRow[],
  segmentFilter: PipelineWorkloadSegmentFilter
): number {
  if (segmentFilter === 'both') {
    return rows.reduce((sum, row) => sum + row.total, 0);
  }

  return rows.reduce(
    (sum, row) =>
      sum + (segmentFilter === 'Outdoor' ? row.outdoor : row.commercial),
    0
  );
}

export function applyWorkloadSegmentFilter(
  data: ProjectPipelineWorkloadApiResponse,
  segmentFilter: PipelineWorkloadSegmentFilter
): ProjectPipelineWorkloadApiResponse {
  if (segmentFilter === 'both' || data.requiresOAuth) {
    return data;
  }

  if (data.view === 'byYear') {
    const byAppraiser = filterWorkloadPersonRows(data.byAppraiser, segmentFilter);
    const byProjMgr = filterWorkloadPersonRows(data.byProjMgr, segmentFilter);
    const incompleteJobs = sumSegmentCountsFromPersonRows(data.byAppraiser, segmentFilter);
    const totalJobs = incompleteJobs;

    return {
      ...data,
      segmentFilter,
      byAppraiser,
      byProjMgr,
      incompleteJobs,
      totalJobs,
    };
  }

  return {
    ...data,
    segmentFilter,
    ...filterPipelineWorkloadChartsBySegment(data, segmentFilter),
  };
}
