import {
  GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
  parseGoogleServiceAccountFromEnv,
} from '@/lib/google-sheets-export';
import { isGoogleSheetsPermissionError } from '@/lib/project-pipeline/google-sheets-client-errors';

export {
  isGoogleSheetsOAuthAuthError,
  isGoogleSheetsPermissionError,
} from '@/lib/project-pipeline/google-sheets-client-errors';

export function getProjectPipelineServiceAccountEmail(
  env: NodeJS.ProcessEnv = process.env
): string {
  return (
    parseGoogleServiceAccountFromEnv(env)?.client_email ??
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ??
    GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL
  );
}

/** Turn opaque Google 403s into an actionable share-the-sheet message. */
export function formatProjectPipelineSheetsAccessError(
  error: unknown,
  env: NodeJS.ProcessEnv = process.env
): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Unknown error');

  if (!isGoogleSheetsPermissionError(error)) {
    return raw;
  }

  const serviceAccountEmail = getProjectPipelineServiceAccountEmail(env);
  return `Google Sheets denied access. In Google Sheets, click Share and add ${serviceAccountEmail} as Viewer (or Editor), then try Refresh again.`;
}
