import {
  addCalendarDaysYmd,
  firstBusinessDayAfterYmd,
  subtractBusinessDaysYmd,
} from '@/lib/project-pipeline/due-date-reminders/business-days';
import { getPipelineDueDateRemindersForDay } from '@/lib/project-pipeline/due-date-reminders/schedule';
import { projectPipelineUpcomingReminderYmd } from '@/lib/project-pipeline/due-date-reminders/eligibility';
import { isPipelineDueDateRemindersEnabled } from '@/lib/project-pipeline/due-date-reminders/config';

describe('pipeline due date reminder business days', () => {
  it('subtracts one business day before a Monday due date to Friday', () => {
    expect(subtractBusinessDaysYmd('2026-06-29', 1)).toBe('2026-06-26');
  });

  it('finds the first business day after a Friday due date', () => {
    expect(firstBusinessDayAfterYmd('2026-06-26')).toBe('2026-06-29');
  });

  it('adds calendar days', () => {
    expect(addCalendarDaysYmd('2026-06-01', 7)).toBe('2026-06-08');
  });
});

describe('getPipelineDueDateRemindersForDay', () => {
  const dueDateYmd = '2026-06-29';

  it('schedules upcoming one business day before due', () => {
    const upcoming = projectPipelineUpcomingReminderYmd(dueDateYmd);
    expect(getPipelineDueDateRemindersForDay({ dueDateYmd, todayYmd: upcoming })).toEqual([
      { reminderType: 'upcoming', reminderKey: '' },
    ]);
  });

  it('schedules due today on the due date', () => {
    expect(getPipelineDueDateRemindersForDay({ dueDateYmd, todayYmd: dueDateYmd })).toEqual([
      { reminderType: 'due_today', reminderKey: '' },
    ]);
  });

  it('schedules overdue milestones and weekly Monday reminders', () => {
    expect(
      getPipelineDueDateRemindersForDay({ dueDateYmd, todayYmd: firstBusinessDayAfterYmd(dueDateYmd) })
    ).toEqual([{ reminderType: 'overdue', reminderKey: 'd1' }]);

    expect(
      getPipelineDueDateRemindersForDay({ dueDateYmd, todayYmd: addCalendarDaysYmd(dueDateYmd, 3) })
    ).toEqual([{ reminderType: 'overdue', reminderKey: 'd3' }]);

    expect(
      getPipelineDueDateRemindersForDay({ dueDateYmd, todayYmd: addCalendarDaysYmd(dueDateYmd, 7) })
    ).toEqual([{ reminderType: 'overdue', reminderKey: 'd7' }]);

    const weeklyMonday = '2026-07-13';
    expect(getPipelineDueDateRemindersForDay({ dueDateYmd, todayYmd: weeklyMonday })).toEqual([
      { reminderType: 'overdue', reminderKey: 'week-2026-W29' },
    ]);
  });
});

describe('isPipelineDueDateRemindersEnabled', () => {
  it('is disabled unless explicitly enabled', () => {
    expect(isPipelineDueDateRemindersEnabled({})).toBe(false);
    expect(isPipelineDueDateRemindersEnabled({ PIPELINE_DUE_DATE_REMINDERS_ENABLED: 'false' })).toBe(
      false
    );
    expect(isPipelineDueDateRemindersEnabled({ PIPELINE_DUE_DATE_REMINDERS_ENABLED: 'true' })).toBe(
      true
    );
  });
});
