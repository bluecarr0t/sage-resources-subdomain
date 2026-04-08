/**
 * Collapse multiple `reports` rows that share the exact same `study_id` (case-insensitive).
 * CSV import assigns `JOB__2`, `JOB__3` when the same job number appears on multiple lines
 * (different locations); those remain separate pins on the client map.
 */
export function clientMapReportDedupeKey(studyId: string | null | undefined): string {
  const s = String(studyId ?? '').trim();
  if (!s) return '';
  return s.toUpperCase();
}
