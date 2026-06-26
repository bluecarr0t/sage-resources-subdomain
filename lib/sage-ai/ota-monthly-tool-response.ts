import type {
  OtaMonthlyExportFetchParams,
  OtaMonthlyRadiusExportResult,
} from '@/lib/ota-monthly-radius-export';

/** Slim tool payload for the LLM — full rows are fetched on CSV/Excel download. */
export function buildOtaMonthlyToolResponse(
  result: OtaMonthlyRadiusExportResult,
): Record<string, unknown> {
  const export_fetch: OtaMonthlyExportFetchParams = {
    zip: result.zip ?? undefined,
    city: result.city ?? undefined,
    state: result.state ?? undefined,
    radius_miles: result.radius_miles,
    years: result.years,
    sources: result.sources.map((s) => s.source),
  };

  return {
    source: 'Hipcamp (raw) / Campspot (raw) — site_monthly_analytics',
    location_label: result.location_label,
    zip: result.zip,
    city: result.city,
    state: result.state,
    radius_miles: result.radius_miles,
    years: result.years,
    center: result.center,
    sources: result.sources,
    total_row_count: result.total_row_count,
    sample_rows: result.data.slice(0, 5),
    export_sheets_summary: result.export_sheets.map((sheet) => ({
      name: sheet.name,
      row_count: sheet.data.length,
    })),
    export_fetch,
    export_note:
      'Full row-level export is available via CSV/Excel download buttons. Sample rows only are included in chat context.',
  };
}
