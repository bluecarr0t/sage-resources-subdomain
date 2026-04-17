/**
 * Turn past-report references in assistant markdown into clickable links.
 * - `/admin/reports/{studyId}` → `[studyId](/admin/reports/{studyId})`
 * - Bare job numbers like `26-100A-01` → `[26-100A-01](/admin/reports/26-100A-01)`
 *
 * Skips segments already inside markdown links and IDs that appear only as URL path suffixes.
 */

/** Typical feasibility job # (e.g. 26-100A-01): YY + segment with letter + segment. */
const BARE_STUDY_ID_RE = /(?<![/\[])\b(\d{2}-\d+[A-Za-z]-\d{1,2})\b/g;

/**
 * Raw `/admin/reports/...` in prose (not already in `[text](url)` — there `(` sits
 * immediately before `/`).
 */
const ADMIN_REPORT_PATH_RE = /(?<!\()(\/admin\/reports\/[^\s)\]]+)/g;

export function linkifyPastReportRefsInMarkdown(text: string): string {
  let out = text;

  out = out.replace(ADMIN_REPORT_PATH_RE, (path) => {
    const id = path.replace(/^\/admin\/reports\//, '');
    if (!id) return path;
    return `[${id}](${path})`;
  });

  out = out.replace(BARE_STUDY_ID_RE, (match, id: string) => {
    return `[${id}](/admin/reports/${id})`;
  });

  return out;
}
