import { parseProjectPipelineDueDate } from '@/lib/project-pipeline/due-date-emphasis';
import {
  formatPipelineReminderDateYmd,
  subtractBusinessDaysYmd,
} from '@/lib/project-pipeline/due-date-reminders/business-days';
import { normalizeProjectPipelineProjectStatus } from '@/lib/project-pipeline/project-status';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export function projectPipelineJobDueDateYmd(job: ProjectPipelineJob): string | null {
  const parsed = parseProjectPipelineDueDate(job.dueDate);
  if (parsed == null) return null;

  return formatPipelineReminderDateYmd(new Date(parsed));
}

export function isProjectPipelineJobEligibleForDueDateReminder(
  job: ProjectPipelineJob
): boolean {
  if (!job.jobNumber.trim()) return false;
  if (!projectPipelineJobDueDateYmd(job)) return false;
  if (job.dateCompleted.trim()) return false;

  const status = normalizeProjectPipelineProjectStatus(job.projectStatus);
  if (status === 'Completed' || status === 'Cancelled' || status === 'On Hold') {
    return false;
  }

  return true;
}

export function projectPipelineUpcomingReminderYmd(dueDateYmd: string): string {
  return subtractBusinessDaysYmd(dueDateYmd, 1);
}
