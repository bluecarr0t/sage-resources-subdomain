import {
  canonicalReportService,
  reportServiceLabel,
  REPORT_SERVICE_LABELS,
} from '../report-service-display';

describe('canonicalReportService', () => {
  it('normalizes feasibility variants to feasibility_study', () => {
    expect(canonicalReportService('feasibility_study')).toBe('feasibility_study');
    expect(canonicalReportService('feasibility study')).toBe('feasibility_study');
    expect(canonicalReportService('Feasibility Study')).toBe('feasibility_study');
    expect(canonicalReportService('feasibility-study')).toBe('feasibility_study');
  });

  it('returns null for empty', () => {
    expect(canonicalReportService(null)).toBeNull();
    expect(canonicalReportService('')).toBeNull();
  });

  it('maps glamping_revenue_projection to revenue_projection', () => {
    expect(canonicalReportService('glamping_revenue_projection')).toBe('revenue_projection');
    expect(reportServiceLabel('glamping_revenue_projection', '-')).toBe('Revenue Projection');
  });
});

describe('reportServiceLabel', () => {
  it('uses known labels', () => {
    expect(reportServiceLabel('feasibility_study', 'Not set')).toBe('Feasibility Study');
    expect(reportServiceLabel('appraisal', 'Not set')).toBe('Appraisal');
    expect(REPORT_SERVICE_LABELS.consulting).toBe('Consulting');
  });

  it('labels human-spaced feasibility study as Feasibility Study', () => {
    expect(reportServiceLabel('feasibility study', 'Not set')).toBe('Feasibility Study');
  });

  it('returns notSetLabel for empty', () => {
    expect(reportServiceLabel(null, 'Not set')).toBe('Not set');
    expect(reportServiceLabel('  ', 'Unset')).toBe('Unset');
  });

  it('title-cases unknown snake_case', () => {
    expect(reportServiceLabel('custom_type', 'Not set')).toBe('custom type');
  });
});
