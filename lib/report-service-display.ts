/** Canonical `reports.service` values → admin display labels (Past Reports + CSV import). */
export const REPORT_SERVICE_LABELS: Record<string, string> = {
  feasibility_study: 'Feasibility Study',
  appraisal: 'Appraisal',
  revenue_projection: 'Revenue Projection',
  market_study: 'Market Study',
  update: 'Update',
  consulting: 'Consulting',
  outdoor_hospitality: 'Outdoor Hospitality',
};

/**
 * Normalize raw `reports.service` to a single snake_case key so
 * "feasibility study", "Feasibility Study", and "feasibility_study" collapse to `feasibility_study`.
 */
export function canonicalReportService(service: string | null | undefined): string | null {
  const raw = String(service ?? '').trim();
  if (!raw) return null;
  const key = raw
    .toLowerCase()
    .replace(/[\s_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!key) return null;
  if (key === 'glamping_revenue_projection') return 'revenue_projection';
  if (REPORT_SERVICE_LABELS[key]) return key;
  const lettersOnly = key.replace(/_/g, '');
  if (lettersOnly === 'feasibilitystudy') return 'feasibility_study';
  return key;
}

export function reportServiceLabel(
  service: string | null | undefined,
  notSetLabel: string
): string {
  const canon = canonicalReportService(service);
  if (!canon) return notSetLabel;
  return REPORT_SERVICE_LABELS[canon] ?? canon.replace(/_/g, ' ');
}
