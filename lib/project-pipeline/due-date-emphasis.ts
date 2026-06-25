import type { ProjectPipelineJob } from './types';
import { normalizeProjectPipelineProjectStatus } from './project-status';

export type ProjectPipelineDueDateEmphasis = 'past-due' | 'due-soon';

export function isProjectPipelineDueDateParseable(value: string): boolean {
  if (!value?.trim()) return true;
  return parseProjectPipelineDueDate(value) != null;
}

/** HTML date input value (YYYY-MM-DD) from a pipeline sheet date string. */
export function projectPipelineDueDateToInputValue(value: string): string {
  const parsed = parseProjectPipelineDueDate(value);
  if (parsed == null) return '';

  const date = new Date(parsed);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Pipeline sheet date (m/d/yy) from an HTML date input value. */
export function projectPipelineDueDateFromInputValue(isoDate: string): string {
  if (!isoDate.trim()) return '';
  return formatProjectPipelineSheetDate(isoDate);
}

export function parseProjectPipelineDueDate(value: string): number | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, (_, m, d, y) => {
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  });
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Display pipeline sheet dates as m/d/yy (month without a leading zero). */
export function formatProjectPipelineSheetDate(value: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  const parsed = parseProjectPipelineDueDate(trimmed);
  if (parsed == null) return trimmed;

  const date = new Date(parsed);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = String(date.getUTCFullYear() % 100).padStart(2, '0');

  return `${month}/${day}/${year}`;
}

export function getProjectPipelineDueDateEmphasis(
  job: ProjectPipelineJob,
  now: Date = new Date()
): ProjectPipelineDueDateEmphasis | null {
  if (job.dateCompleted.trim()) return null;

  if (normalizeProjectPipelineProjectStatus(job.projectStatus) === 'Completed') {
    return null;
  }

  const dueDate = parseProjectPipelineDueDate(job.dueDate);
  if (dueDate == null) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMs = startOfToday.getTime();
  const dueSoonCutoff = startMs + 30 * 24 * 60 * 60 * 1000;

  if (dueDate < startMs) return 'past-due';
  if (dueDate <= dueSoonCutoff) return 'due-soon';
  return null;
}

export function getProjectPipelineDueDateRowClassName(
  emphasis: ProjectPipelineDueDateEmphasis | null
): string {
  if (emphasis === 'past-due') {
    return 'bg-red-50/80 hover:bg-red-50 dark:bg-red-950/25 dark:hover:bg-red-950/35';
  }
  if (emphasis === 'due-soon') {
    return 'bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30';
  }
  return 'hover:bg-neutral-50/80 dark:hover:bg-neutral-900/40';
}

export function getProjectPipelineJobRowClassName(
  job: Pick<ProjectPipelineJob, 'projectStatus'>,
  dueEmphasis: ProjectPipelineDueDateEmphasis | null
): string {
  if (normalizeProjectPipelineProjectStatus(job.projectStatus) === 'Completed') {
    return 'bg-green-50/80 hover:bg-green-50 dark:bg-green-950/25 dark:hover:bg-green-950/35';
  }
  return getProjectPipelineDueDateRowClassName(dueEmphasis);
}
