import type { SupabaseClient } from '@supabase/supabase-js';
import type { PipelineSentToClientReminderSentRow } from '@/lib/project-pipeline/sent-to-client-reminders/types';

export const PROJECT_PIPELINE_SENT_TO_CLIENT_REMINDER_SENT_TABLE =
  'project_pipeline_sent_to_client_reminder_sent';

export async function hasPipelineSentToClientReminderBeenSent(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string; jobNumber: string; reminderDay: string }
): Promise<boolean> {
  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_SENT_TO_CLIENT_REMINDER_SENT_TABLE)
    .select('job_number')
    .eq('sheet_id', input.sheetId)
    .eq('sheet_name', input.sheetName)
    .eq('job_number', input.jobNumber)
    .eq('reminder_day', input.reminderDay)
    .maybeSingle();

  if (error) {
    console.warn(
      '[pipeline-sent-to-client-reminders] failed to load sent key',
      error.message
    );
    return false;
  }

  return Boolean(data);
}

export async function recordPipelineSentToClientReminderSent(
  supabase: SupabaseClient,
  input: {
    sheetId: string;
    sheetName: string;
    jobNumber: string;
    reminderDay: string;
    sentAt?: string;
  }
): Promise<void> {
  const row: PipelineSentToClientReminderSentRow = {
    sheet_id: input.sheetId,
    sheet_name: input.sheetName,
    job_number: input.jobNumber,
    reminder_day: input.reminderDay,
    sent_at: input.sentAt ?? new Date().toISOString(),
  };

  const { error } = await supabase
    .from(PROJECT_PIPELINE_SENT_TO_CLIENT_REMINDER_SENT_TABLE)
    .upsert(row, {
      onConflict: 'sheet_id,sheet_name,job_number,reminder_day',
    });

  if (error) {
    console.warn(
      '[pipeline-sent-to-client-reminders] failed to record sent reminder',
      error.message
    );
  }
}
