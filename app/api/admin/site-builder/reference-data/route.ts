/**
 * API Route: Site Builder reference data (glamping types, RV site types, amenities)
 * GET /api/admin/site-builder/reference-data
 *
 * Cost data sources only (no mock/fallback):
 * - Glamping: Marshall & Swift CCE (cce_cost_rows)
 * - RV: feasibility_development_costs (uploaded .xlsx/.docx)
 * - Amenities: site_builder_amenity_costs (from sync-feasibility-amenities.ts)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { getFeasibilityDerivedRVCosts } from '@/lib/site-builder/feasibility-costs';

export const GET = withAdminAuth(async (_request: NextRequest) => {
  try {
    const supabase = createServerClient();

    const [glampingRes, rvRes, amenityRes] = await Promise.all([
      supabase
        .from('site_builder_glamping_types')
        .select('slug, name, default_sqft, default_diameter_ft, default_quality_type')
        .order('name'),
      supabase
        .from('site_builder_rv_site_types')
        .select('slug, name, width_ft, depth_ft, base_cost_per_site, hookup_type')
        .order('name'),
      supabase
        .from('site_builder_amenity_costs')
        .select('slug, name, cost_per_unit, applies_to, sources')
        .order('name', { ascending: true }),
    ]);

    if (glampingRes.error && glampingRes.error.code !== '42P01') throw glampingRes.error;
    if (rvRes.error && rvRes.error.code !== '42P01') throw rvRes.error;
    if (amenityRes.error && amenityRes.error.code !== '42P01') throw amenityRes.error;

    const rvSiteTypes = rvRes.data ?? [];
    const feasibilityCosts = await getFeasibilityDerivedRVCosts(
      supabase,
      rvSiteTypes.map((r) => ({ slug: r.slug, name: r.name }))
    );

    const rvSiteTypesWithCosts = rvSiteTypes.map((r) => {
      const feasibilityCost = feasibilityCosts.bySlug[r.slug];
      return {
        ...r,
        base_cost_per_site: feasibilityCost ?? 0,
        cost_source: feasibilityCost != null ? ('feasibility' as const) : ('no_data' as const),
      };
    });

    return NextResponse.json({
      success: true,
      glampingTypes: glampingRes.data ?? [],
      rvSiteTypes: rvSiteTypesWithCosts,
      amenityCosts: amenityRes.data ?? [],
    });
  } catch (err) {
    console.error('[api/admin/site-builder/reference-data] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reference data' },
      { status: 500 }
    );
  }
});
