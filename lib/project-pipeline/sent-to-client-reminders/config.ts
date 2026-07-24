/** Master switch — reminders only run when this is exactly `"true"`. */
export function isPipelineSentToClientRemindersEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.PIPELINE_SENT_TO_CLIENT_REMINDERS_ENABLED?.trim().toLowerCase() === 'true';
}
