/**
 * Sage AI tool: raw Hipcamp/Campspot property monthly occupancy & rates export.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  exportOtaPropertyMonthlyByRadius,
  type OtaMonthlySource,
} from '@/lib/ota-monthly-radius-export';

export function createOtaMonthlyExportTool() {
  return {
    export_ota_property_monthly_rates: tool({
      description:
        'Export **property-level month-over-month occupancy and retail daily rates** from raw Hipcamp and Campspot ' +
        '`site_monthly_analytics` (DigitalOcean scrape warehouse). Returns one row per property per month with median/mean ADR, ' +
        'occupancy %, RevPAR, min/max price, and site counts. Rates are blanked when occupancy ≤ 5% (closed season) or when ' +
        'known placeholder artifacts appear. Use when the user asks for monthly occupancy/rate trends by property near a zip, ' +
        'OTA monthly exports, or Hipcamp/Campspot raw monthly analytics within a radius. ' +
        'The UI offers CSV/Excel download of the full export (combined + per-source sheets).',
      inputSchema: z.object({
        zip: z
          .string()
          .min(3)
          .describe('US/CAN postal code center point (e.g. "34205" for Sarasota, FL).'),
        radius_miles: z
          .number()
          .min(1)
          .max(200)
          .optional()
          .default(50)
          .describe('Radius in miles from the zip centroid (default 50).'),
        years: z
          .array(z.number().int().min(2024).max(2030))
          .optional()
          .default([2025, 2026])
          .describe('Calendar years to include (default 2025 and 2026).'),
        sources: z
          .array(z.enum(['hipcamp', 'campspot']))
          .optional()
          .default(['hipcamp', 'campspot'])
          .describe('Which OTA raw sources to include (default both).'),
      }),
      execute: async ({ zip, radius_miles, years, sources }) => {
        try {
          const result = await exportOtaPropertyMonthlyByRadius({
            zip,
            radiusMiles: radius_miles,
            years,
            sources: sources as OtaMonthlySource[],
          });

          if (result.total_row_count === 0) {
            return {
              error: `No monthly analytics rows found within ${radius_miles} miles of zip ${zip} for years ${years.join(', ')}.`,
              zip,
              radius_miles,
              years,
              center: result.center,
              sources: result.sources,
              data: [],
              export_sheets: [],
              total_row_count: 0,
            };
          }

          return {
            source: 'Hipcamp (raw) / Campspot (raw) — site_monthly_analytics',
            zip: result.zip,
            radius_miles: result.radius_miles,
            years: result.years,
            center: result.center,
            sources: result.sources,
            total_row_count: result.total_row_count,
            data: result.data,
            export_sheets: result.export_sheets,
            export_note:
              'Download CSV for the combined export, or Excel for hipcamp / campspot / combined worksheets.',
          };
        } catch (err) {
          return {
            error:
              err instanceof Error
                ? err.message
                : 'Failed to export OTA monthly property rates.',
            data: null,
            total_row_count: 0,
          };
        }
      },
    }),
  };
}
