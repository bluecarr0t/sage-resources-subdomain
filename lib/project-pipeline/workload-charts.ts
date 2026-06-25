import {
  formatProjectPipelineJobNumberMonthLabel,
  parseProjectPipelineJobNumberMonth,
} from '@/lib/project-pipeline/job-number-month';
import {
  jobMatchesProjectPipelineSegment,
  resolveProjectPipelineJobSegment,
} from '@/lib/project-pipeline/segment';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import type { PipelineWorkloadSegmentFilter } from '@/lib/project-pipeline/workload';

export type PipelineWorkloadMonthlyRow = {
  year: number;
  month: number;
  monthLabel: string;
  sortKey: number;
  total: number;
  outdoor: number;
  commercial: number;
  unknown: number;
  incomplete: number;
  outdoorIncomplete: number;
  commercialIncomplete: number;
  monthOverMonthChange: number | null;
};

export type PipelineWorkloadCharts = {
  sheetName: string;
  byMonth: PipelineWorkloadMonthlyRow[];
  unparsedJobCount: number;
};

function normalizeSegment(job: ProjectPipelineJob): 'Outdoor' | 'Commercial' {
  return resolveProjectPipelineJobSegment(job.commercialOutdoor);
}

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

function emptyMonthRow(year: number, month: number): Omit<PipelineWorkloadMonthlyRow, 'monthOverMonthChange'> {
  return {
    year,
    month,
    monthLabel: formatProjectPipelineJobNumberMonthLabel(year, month),
    sortKey: year * 100 + month,
    total: 0,
    outdoor: 0,
    commercial: 0,
    unknown: 0,
    incomplete: 0,
    outdoorIncomplete: 0,
    commercialIncomplete: 0,
  };
}

function attachMonthOverMonthChange(
  rows: Omit<PipelineWorkloadMonthlyRow, 'monthOverMonthChange'>[]
): PipelineWorkloadMonthlyRow[] {
  return rows.map((row, index) => ({
    ...row,
    monthOverMonthChange:
      index === 0 ? null : row.total - (rows[index - 1]?.total ?? 0),
  }));
}

export function buildPipelineWorkloadCharts(
  jobs: readonly ProjectPipelineJob[],
  sheetName: string,
  options: {
    segmentFilter?: PipelineWorkloadSegmentFilter;
    sheetYear?: number | null;
  } = {}
): PipelineWorkloadCharts {
  const segmentFilter = options.segmentFilter ?? 'both';
  const sheetYear = options.sheetYear ?? null;
  const bucketMap = new Map<number, Omit<PipelineWorkloadMonthlyRow, 'monthOverMonthChange'>>();
  let unparsedJobCount = 0;

  if (sheetYear != null) {
    for (let month = 1; month <= 12; month += 1) {
      const row = emptyMonthRow(sheetYear, month);
      bucketMap.set(row.sortKey, row);
    }
  }

  for (const job of jobs) {
    if (!jobMatchesSegmentFilter(job, segmentFilter)) continue;

    const parsed = parseProjectPipelineJobNumberMonth(job.jobNumber);
    if (!parsed) {
      unparsedJobCount += 1;
      continue;
    }

    if (sheetYear != null && parsed.year !== sheetYear) continue;

    const existing = bucketMap.get(parsed.sortKey) ?? emptyMonthRow(parsed.year, parsed.month);
    const segment = normalizeSegment(job);

    existing.total += 1;
    if (segment === 'Outdoor') existing.outdoor += 1;
    else existing.commercial += 1;
    if (isIncomplete(job)) {
      existing.incomplete += 1;
      if (segment === 'Outdoor') existing.outdoorIncomplete += 1;
      else existing.commercialIncomplete += 1;
    }

    bucketMap.set(parsed.sortKey, existing);
  }

  const sorted = [...bucketMap.values()].sort((a, b) => a.sortKey - b.sortKey);
  const byMonth = attachMonthOverMonthChange(sorted);

  return {
    sheetName,
    byMonth,
    unparsedJobCount,
  };
}

export function filterPipelineWorkloadChartsBySegment(
  charts: PipelineWorkloadCharts,
  segmentFilter: PipelineWorkloadSegmentFilter
): PipelineWorkloadCharts {
  if (segmentFilter === 'both') return charts;

  const byMonth = charts.byMonth
    .map((row) => {
      const outdoor = segmentFilter === 'Outdoor' ? row.outdoor : 0;
      const commercial = segmentFilter === 'Commercial' ? row.commercial : 0;
      const total = outdoor + commercial;
      const incomplete =
        segmentFilter === 'Outdoor'
          ? row.outdoorIncomplete
          : segmentFilter === 'Commercial'
            ? row.commercialIncomplete
            : row.incomplete;
      return {
        ...row,
        outdoor,
        commercial,
        unknown: 0,
        total,
        incomplete,
        outdoorIncomplete: segmentFilter === 'Outdoor' ? row.outdoorIncomplete : 0,
        commercialIncomplete: segmentFilter === 'Commercial' ? row.commercialIncomplete : 0,
      };
    })
    .map((row, index, rows) => ({
      ...row,
      monthOverMonthChange: index === 0 ? null : row.total - (rows[index - 1]?.total ?? 0),
    }));

  return { ...charts, byMonth };
}
