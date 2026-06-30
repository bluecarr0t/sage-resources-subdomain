import { parseGoogleServiceAccountFromEnv } from '@/lib/google-sheets-export';

export function isGoogleSheetsPermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /caller does not have permission/i.test(message) ||
    /permission denied/i.test(message) ||
    /does not have access/i.test(message) ||
    /\b403\b/.test(message)
  );
}

export function getProjectPipelineServiceAccountEmail(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  return parseGoogleServiceAccountFromEnv(env)?.client_email ?? null;
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
  if (!serviceAccountEmail) {
    return 'Google Sheets denied access. Share the pipeline spreadsheet with the configured service account as Viewer.';
  }

  return `Google Sheets denied access. In Google Sheets, click Share and add ${serviceAccountEmail} as Viewer (or Editor), then try Refresh again.`;
}
