/**
 * API Route: Site Builder export to Cost Analysis XLSX
 * POST /api/admin/site-builder/export-xlsx
 *
 * Body: { configs: SiteBuilderConfig[] }
 * Returns: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { withAdminAuth } from '@/lib/require-admin-auth';
import { buildAndExportCostAnalysisXlsx } from '@/lib/site-builder/export-cost-analysis-xlsx';
import type { SiteBuilderConfig } from '@/lib/site-builder/cost-calculator';
import {
  parseAmenityCostOverridesFromBody,
  parseAmenityCostOverridesPerConfigFromBody,
} from '@/lib/site-builder/amenity-cost-resolve';
import type { SiteBuilderCostOptions } from '@/lib/site-builder/cost-calculator';

function parseCostOptions(body: unknown, configCount: number): SiteBuilderCostOptions {
  const perConfig = parseAmenityCostOverridesPerConfigFromBody(body, configCount);
  if (perConfig) return { amenityCostOverridesPerConfig: perConfig };
  return { amenityCostOverrides: parseAmenityCostOverridesFromBody(body) };
}

function parseConfigs(body: unknown): SiteBuilderConfig[] | null {
  if (!body || typeof body !== 'object' || !('configs' in body)) return null;
  const arr = (body as { configs: unknown }).configs;
  if (!Array.isArray(arr)) return null;

  const result: SiteBuilderConfig[] = [];
  for (const c of arr) {
    if (!c || typeof c !== 'object') continue;
    const type = (c as { type?: string }).type;
    if (type === 'glamping') {
      const slug = (c as { unitTypeSlug?: string }).unitTypeSlug;
      const quantity = Number((c as { quantity?: number }).quantity) || 0;
      const sqft = Number((c as { sqft?: number }).sqft) || 0;
      const qualityType = String((c as { qualityType?: string }).qualityType || 'Premium');
      const amenitySlugs = Array.isArray((c as { amenitySlugs?: unknown }).amenitySlugs)
        ? ((c as { amenitySlugs: unknown[] }).amenitySlugs).filter((s): s is string => typeof s === 'string')
        : [];
      const catalogUnitId = (c as { catalogUnitId?: string | null }).catalogUnitId;
      const hasCatalogUnit = catalogUnitId && typeof catalogUnitId === 'string';
      const validForCatalog = hasCatalogUnit && slug && quantity > 0;
      const validForGeneric = !hasCatalogUnit && slug && quantity > 0 && sqft > 0;
      if (validForCatalog || validForGeneric) {
        result.push({
          type: 'glamping',
          unitTypeSlug: slug,
          quantity,
          sqft: sqft || 0,
          qualityType,
          amenitySlugs,
          catalogUnitId: hasCatalogUnit ? catalogUnitId : null,
        });
      }
    } else if (type === 'rv') {
      const slug = (c as { siteTypeSlug?: string }).siteTypeSlug;
      const quantity = Number((c as { quantity?: number }).quantity) || 0;
      const qualityType = String((c as { qualityType?: string }).qualityType || 'Premium');
      const amenitySlugs = Array.isArray((c as { amenitySlugs?: unknown }).amenitySlugs)
        ? ((c as { amenitySlugs: unknown[] }).amenitySlugs).filter((s): s is string => typeof s === 'string')
        : [];
      if (slug && quantity > 0) {
        result.push({ type: 'rv', siteTypeSlug: slug, quantity, qualityType, amenitySlugs });
      }
    }
  }
  return result;
}

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json().catch(() => null);
    const configs = parseConfigs(body);
    if (!configs || configs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or empty configs' },
        { status: 400 }
      );
    }

    const buffer = await buildAndExportCostAnalysisXlsx(auth.supabase, configs, parseCostOptions(body, configs.length));

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="site-builder-cost-analysis.xlsx"',
      },
    });
  } catch (err) {
    console.error('[api/admin/site-builder/export-xlsx] Error:', err);
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
});
