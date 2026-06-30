/**
 * Sage AI tool: raw Hipcamp/Campspot property monthly occupancy & rates export.
 */

import { tool } from 'ai';
import {
  exportOtaPropertyMonthlyByRadius,
  type OtaMonthlySource,
} from '@/lib/ota-monthly-radius-export';
import { otaMonthlyExportParamsSchema } from '@/lib/sage-ai/ota-monthly-export-params';
import { buildOtaMonthlyToolResponse } from '@/lib/sage-ai/ota-monthly-tool-response';

const otaMonthlyToolInputSchema = otaMonthlyExportParamsSchema;

export function createOtaMonthlyExportTool() {
  return {
    export_ota_property_monthly_rates: tool({
      description:
        'Export **property-level month-over-month occupancy and retail daily rates** from raw Hipcamp and Campspot ' +
        '`site_monthly_analytics` (Hipcamp/Campspot warehouse mirrored on Supabase). Returns one row per property per month with median/mean ADR, ' +
        'occupancy %, RevPAR, min/max price, and site counts. Rates are blanked when occupancy ≤ 5% (closed season) or when ' +
        'known placeholder artifacts appear.\n\n' +
        '**Before calling:** ask the user for a **US zip code OR city + state** center point. Do not guess a location. ' +
        'Prefer passing an explicit `zip` when the user provides one (e.g. 78624). Full state names like "Texas" are accepted. ' +
        'Default radius is 50 miles and years are 2025–2026 unless the user specifies otherwise.\n\n' +
        'The UI offers CSV/Excel download of the full export; chat context receives only a summary + sample rows.',
      inputSchema: otaMonthlyToolInputSchema,
      execute: async ({ zip, city, state, radius_miles, years, sources }) => {
        try {
          const result = await exportOtaPropertyMonthlyByRadius({
            zip,
            city,
            state,
            radiusMiles: radius_miles,
            years,
            sources: sources as OtaMonthlySource[],
          });

          if (result.total_row_count === 0) {
            return {
              error: `No monthly analytics rows found within ${radius_miles} miles of ${result.location_label} for years ${years.join(', ')}.`,
              location_label: result.location_label,
              zip: result.zip,
              city: result.city,
              state: result.state,
              radius_miles,
              years,
              center: result.center,
              sources: result.sources,
              total_row_count: 0,
              sample_rows: [],
              export_sheets_summary: [],
            };
          }

          return buildOtaMonthlyToolResponse(result);
        } catch (err) {
          return {
            error:
              err instanceof Error
                ? err.message
                : 'Failed to export OTA monthly property rates.',
            total_row_count: 0,
          };
        }
      },
    }),
  };
}
