import {
  addCalendarDaysYmd,
  firstBusinessDayAfterYmd,
  isMondayYmd,
  isoWeekKeyFromYmd,
} from '@/lib/project-pipeline/due-date-reminders/business-days';
import type { PipelineDueDateReminderDispatch } from '@/lib/project-pipeline/due-date-reminders/types';
import { projectPipelineUpcomingReminderYmd } from '@/lib/project-pipeline/due-date-reminders/eligibility';

export function getPipelineDueDateRemindersForDay(input: {
  dueDateYmd: string;
  todayYmd: string;
}): PipelineDueDateReminderDispatch[] {
  const { dueDateYmd, todayYmd } = input;
  const dispatches: PipelineDueDateReminderDispatch[] = [];

  if (todayYmd === projectPipelineUpcomingReminderYmd(dueDateYmd)) {
    dispatches.push({ reminderType: 'upcoming', reminderKey: '' });
  }

  if (todayYmd === dueDateYmd) {
    dispatches.push({ reminderType: 'due_today', reminderKey: '' });
  }

  if (todayYmd > dueDateYmd) {
    const overdueD1 = firstBusinessDayAfterYmd(dueDateYmd);
    const overdueD3 = addCalendarDaysYmd(dueDateYmd, 3);
    const overdueD7 = addCalendarDaysYmd(dueDateYmd, 7);

    if (todayYmd === overdueD1) {
      dispatches.push({ reminderType: 'overdue', reminderKey: 'd1' });
    }
    if (todayYmd === overdueD3) {
      dispatches.push({ reminderType: 'overdue', reminderKey: 'd3' });
    }
    if (todayYmd === overdueD7) {
      dispatches.push({ reminderType: 'overdue', reminderKey: 'd7' });
    }

    if (isMondayYmd(todayYmd) && todayYmd > overdueD7) {
      dispatches.push({
        reminderType: 'overdue',
        reminderKey: `week-${isoWeekKeyFromYmd(todayYmd)}`,
      });
    }
  }

  return dispatches;
}
