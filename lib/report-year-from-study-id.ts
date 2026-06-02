/**
 * Sage job / study IDs start with a two-digit year prefix: "25-101A-01" → 2025, "16-202A-10" → 2016.
 * Uses 2000 + YY (same rule for all 00–99).
 */
export function reportYearFromStudyId(studyId: string | null | undefined): string | null {
  const s = String(studyId ?? '').trim();
  const m = /^(\d{2})-/.exec(s);
  if (!m) return null;
  const yy = parseInt(m[1], 10);
  if (Number.isNaN(yy) || yy < 0 || yy > 99) return null;
  return String(2000 + yy);
}

/** Study-id prefix first; else calendar year from `report_date` (YYYY-MM-DD). */
export function resolveReportYear(
  studyId: string | null | undefined,
  reportDate?: string | null | undefined
): string | null {
  const fromId = reportYearFromStudyId(studyId);
  if (fromId) return fromId;
  const d = String(reportDate ?? '').trim();
  if (/^\d{4}/.test(d)) return d.slice(0, 4);
  return null;
}
