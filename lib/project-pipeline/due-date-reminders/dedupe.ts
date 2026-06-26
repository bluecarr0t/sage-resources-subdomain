import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PipelineDueDateReminderDispatch,
  PipelineDueDateReminderSentRow,
} from '@/lib/project-pipeline/due-date-reminders/types';

export const PROJECT_PIPELINE_DUE_REMINDER_SENT_TABLE =
  'project_pipeline_due_reminder_sent';

export async function fetchPipelineDueReminderSentKeys(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string; jobNumber: string; dueDateSnapshot: string }
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_DUE_REMINDER_SENT_TABLE)
    .select('reminder_type, reminder_key')
    .eq('sheet_id', input.sheetId)
    .eq('sheet_name', input.sheetName)
    .eq('job_number', input.jobNumber)
    .eq('due_date_snapshot', input.dueDateSnapshot);

  if (error) {
    console.warn('[pipeline-due-reminders] failed to load sent keys', error.message);
    return new Set();
  }

  const keys = new Set<string>();
  for (const row of data ?? []) {
    const type = String(row.reminder_type ?? '');
    const key = String(row.reminder_key ?? '');
    keys.add(`${type}:${key}`);
  }
  return keys;
}

export function pipelineDueReminderDispatchKey(dispatch: PipelineDueDateReminderDispatch): string {
  return `${dispatch.reminderType}:${dispatch.reminderKey}`;
}

export async function recordPipelineDueReminderSent(
  supabase: SupabaseClient,
  input: {
    sheetId: string;
    sheetName: string;
    jobNumber: string;
    dueDateSnapshot: string;
    dispatch: PipelineDueDateReminderDispatch;
    sentAt?: string;
  }
): Promise<void> {
  const row: PipelineDueDateReminderSentRow = {
    sheet_id: input.sheetId,
    sheet_name: input.sheetName,
    job_number: input.jobNumber,
    due_date_snapshot: input.dueDateSnapshot,
    reminder_type: input.dispatch.reminderType,
    reminder_key: input.dispatch.reminderKey,
    sent_at: input.sentAt ?? new Date().toISOString(),
  };

  const { error } = await supabase.from(PROJECT_PIPELINE_DUE_REMINDER_SENT_TABLE).upsert(row, {
    onConflict: 'sheet_id,sheet_name,job_number,due_date_snapshot,reminder_type,reminder_key',
  });

  if (error) {
    console.warn('[pipeline-due-reminders] failed to record sent reminder', error.message);
  }
}
