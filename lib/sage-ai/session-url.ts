/** Query param for deep-linking a saved Sage AI conversation. */
export const SAGE_AI_SESSION_SEARCH_PARAM = 'session';

export function sageAiPathWithSession(
  basePath: string,
  sessionId: string | null,
  existingSearch?: string
): string {
  const params = new URLSearchParams(existingSearch ?? '');
  if (sessionId) {
    params.set(SAGE_AI_SESSION_SEARCH_PARAM, sessionId);
  } else {
    params.delete(SAGE_AI_SESSION_SEARCH_PARAM);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
