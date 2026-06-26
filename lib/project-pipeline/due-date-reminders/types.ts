export type PipelineDueDateReminderType = 'upcoming' | 'due_today' | 'overdue';

export type PipelineDueDateReminderDispatch = {
  reminderType: PipelineDueDateReminderType;
  /** Empty for upcoming/due_today; `d1`, `d3`, `d7`, or `week-YYYY-Www` for overdue. */
  reminderKey: string;
};

export type PipelineDueDateReminderSentRow = {
  sheet_id: string;
  sheet_name: string;
  job_number: string;
  due_date_snapshot: string;
  reminder_type: PipelineDueDateReminderType;
  reminder_key: string;
  sent_at: string;
};
