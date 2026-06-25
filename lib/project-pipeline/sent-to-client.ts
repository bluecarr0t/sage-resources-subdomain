export const PROJECT_PIPELINE_SENT_TO_CLIENT_OPTIONS = ['No', 'Yes'] as const;

export type ProjectPipelineSentToClient =
  (typeof PROJECT_PIPELINE_SENT_TO_CLIENT_OPTIONS)[number];

export const DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT: ProjectPipelineSentToClient = 'No';

/** Lead token from sheet values like "Yes — Sent at 03/02/26 08:57AM". */
function sentToClientLeadToken(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(yes|no)\b/i);
  return match ? match[1].toLowerCase() : null;
}

export function isProjectPipelineSentToClientYes(
  value: string | null | undefined
): boolean {
  return sentToClientLeadToken(value ?? '') === 'yes';
}

export function normalizeProjectPipelineSentToClient(
  value: string | null | undefined
): ProjectPipelineSentToClient {
  const lead = sentToClientLeadToken(value ?? '');
  if (lead === 'yes') return 'Yes';
  if (lead === 'no') return 'No';
  return DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT;
}

/** Text color classes for Sent to Client selects (neutral field background). */
export function getSentToClientSelectTextClassName(value: string): string {
  const normalized = normalizeProjectPipelineSentToClient(value);
  if (normalized === 'Yes') {
    return 'font-semibold text-green-700 dark:text-green-300';
  }
  if (normalized === 'No') {
    return 'font-semibold text-red-700 dark:text-red-300';
  }
  return 'font-semibold text-gray-700 dark:text-gray-200';
}

/** Styles for Sent to Client selects in custom wrappers. */
export function getSentToClientSelectClassName(value: string): string {
  return `rounded-md border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-700 disabled:!opacity-100 ${getSentToClientSelectTextClassName(value)}`;
}
