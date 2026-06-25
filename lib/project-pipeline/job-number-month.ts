/** Parsed calendar period from a pipeline job number (e.g. 26-215A-06 → Jun 2026). */
export type ProjectPipelineJobNumberMonth = {
  year: number;
  month: number;
  sortKey: number;
};

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Job numbers like `26-215A-06`: leading two digits = year (26 → 2026),
 * trailing two digits = month (06 → June).
 */
export function parseProjectPipelineJobNumberMonth(
  jobNumber: string | null | undefined
): ProjectPipelineJobNumberMonth | null {
  const trimmed = jobNumber?.trim();
  if (!trimmed) return null;

  const yearMatch = trimmed.match(/^(\d{2})/);
  const monthMatch = trimmed.match(/(\d{2})$/);
  if (!yearMatch || !monthMatch) return null;

  const yearSuffix = Number.parseInt(yearMatch[1], 10);
  const month = Number.parseInt(monthMatch[1], 10);
  if (!Number.isFinite(yearSuffix) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;

  const year = 2000 + yearSuffix;
  return {
    year,
    month,
    sortKey: year * 100 + month,
  };
}

export function formatProjectPipelineJobNumberMonthLabel(
  year: number,
  month: number
): string {
  const label = MONTH_SHORT[month - 1];
  return label ? `${label} ${year}` : `${month}/${year}`;
}
