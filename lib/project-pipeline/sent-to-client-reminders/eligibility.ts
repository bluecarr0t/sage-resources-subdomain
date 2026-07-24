import {
  firstBusinessDayAfterYmd,
  formatPipelineReminderDateYmd,
  isWeekendYmd,
} from '@/lib/project-pipeline/due-date-reminders/business-days';
import { normalizeProjectPipelineProjectStatus } from '@/lib/project-pipeline/project-status';
import {
  isProjectPipelineReviewStatusApproved,
} from '@/lib/project-pipeline/review-workflow';
import { parseProjectPipelineReviewNotes } from '@/lib/project-pipeline/review-notes';
import { isProjectPipelineSentToClientYes } from '@/lib/project-pipeline/sent-to-client';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export function isProjectPipelineJobEligibleForSentToClientReminder(
  job: ProjectPipelineJob
): boolean {
  if (!job.jobNumber.trim()) return false;
  if (!isProjectPipelineReviewStatusApproved(job.reviewStatus)) return false;
  if (isProjectPipelineSentToClientYes(job.sentToClient)) return false;
  if (job.dateCompleted.trim()) return false;

  const status = normalizeProjectPipelineProjectStatus(job.projectStatus);
  if (status === 'Completed' || status === 'Cancelled' || status === 'On Hold') {
    return false;
  }

  return true;
}

/** Latest review_feedback note with an Approved status, as YYYY-MM-DD (ET). */
export function projectPipelineApprovalYmd(job: ProjectPipelineJob): string | null {
  const notes = parseProjectPipelineReviewNotes(job.reviewNotes ?? []);
  const approvedFeedback = notes
    .filter(
      (note) =>
        note.type === 'review_feedback' &&
        isProjectPipelineReviewStatusApproved(note.reviewStatus)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latest = approvedFeedback[0];
  if (!latest) return null;

  const created = new Date(latest.createdAt);
  if (Number.isNaN(created.getTime())) return null;
  return formatPipelineReminderDateYmd(created);
}

/**
 * First reminder is the next business day after approval.
 * If approval time is unknown, eligible on any business day (backlog / first cron scan).
 */
export function shouldSendPipelineSentToClientReminderOnDay(input: {
  approvalYmd: string | null;
  todayYmd: string;
}): boolean {
  const { approvalYmd, todayYmd } = input;
  if (isWeekendYmd(todayYmd)) return false;

  if (!approvalYmd) return true;

  const firstEligibleYmd = firstBusinessDayAfterYmd(approvalYmd);
  return todayYmd >= firstEligibleYmd;
}
