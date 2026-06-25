import type { ProjectPipelineJob } from './types';
import { resolveProjectPipelineJobCommercialOutdoor } from './segment';

export type ProjectPipelineMetrics = {
  total: number;
  outdoor: number;
  commercial: number;
  inReview: number;
  dueWithin30Days: number;
  outdoorPastDue: number;
};

function parseSortableDate(value: string): number | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, (_, m, d, y) => {
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  });
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function isOutdoorJobDueWithin30Days(
  job: ProjectPipelineJob,
  now: Date = new Date()
): boolean {
  if (resolveProjectPipelineJobCommercialOutdoor(job) !== 'Outdoor') return false;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueCutoff = startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000;
  const dueDate = parseSortableDate(job.dueDate);

  return (
    dueDate != null && dueDate >= startOfToday.getTime() && dueDate <= dueCutoff
  );
}

export function isOutdoorJobPastDue(
  job: ProjectPipelineJob,
  now: Date = new Date()
): boolean {
  if (resolveProjectPipelineJobCommercialOutdoor(job) !== 'Outdoor') return false;
  if (job.dateCompleted.trim()) return false;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = parseSortableDate(job.dueDate);

  return dueDate != null && dueDate < startOfToday.getTime();
}

function isInReviewStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized.includes('in review') || normalized.includes('changes requested');
}

export function computeProjectPipelineMetrics(
  jobs: readonly ProjectPipelineJob[],
  now: Date = new Date()
): ProjectPipelineMetrics {
  let outdoor = 0;
  let commercial = 0;
  let inReview = 0;
  let dueWithin30Days = 0;
  let outdoorPastDue = 0;

  for (const job of jobs) {
    const segment = resolveProjectPipelineJobCommercialOutdoor(job);
    if (segment === 'Outdoor') outdoor += 1;
    else commercial += 1;
    if (isInReviewStatus(job.reviewStatus)) inReview += 1;
    if (isOutdoorJobDueWithin30Days(job, now)) dueWithin30Days += 1;
    if (isOutdoorJobPastDue(job, now)) outdoorPastDue += 1;
  }

  return {
    total: jobs.length,
    outdoor,
    commercial,
    inReview,
    dueWithin30Days,
    outdoorPastDue,
  };
}
