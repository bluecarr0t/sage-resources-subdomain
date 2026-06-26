/** Master switch — reminders only run when this is exactly `"true"`. */
export function isPipelineDueDateRemindersEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.PIPELINE_DUE_DATE_REMINDERS_ENABLED?.trim().toLowerCase() === 'true';
}

export const PIPELINE_DUE_DATE_REMINDER_TIME_ZONE = 'America/New_York';
