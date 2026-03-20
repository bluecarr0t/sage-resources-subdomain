/**
 * API Route: CCE filter facets (building classes, quality types, sections, categories, occupancies)
 * GET /api/admin/cce-filters
 *
 * Returns distinct values for filter dropdowns on the CCE Cost Explorer admin page.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { getCanonicalQualityTypes } from '@/lib/cce-quality-types';
import { getLatestCceExtractionDate } from '@/lib/cce-latest-extraction';

export const GET = withAdminAuth(async (_request: NextRequest) => {
  try {
    const supabase = createServerClient();
    const latestExtractionDate = await getLatestCceExtractionDate(supabase);

    let costQuery = supabase.from('cce_cost_rows').select('building_class, quality_type');
    if (latestExtractionDate) {
      costQuery = costQuery.eq('extraction_date', latestExtractionDate);
    }
    const costRes = await costQuery;

    const [pctRes, catalogRes, componentRes] = await Promise.all([
      supabase.from('cce_cost_percentages').select('section_name, category, occupancy'),
      supabase.from('cce_catalog_units').select('manufacturer'),
      supabase.from('cce_component_costs').select('section_name'),
    ]);

    if (costRes.error && costRes.error.code !== '42P01') throw costRes.error;
    if (pctRes.error && pctRes.error.code !== '42P01') throw pctRes.error;
    if (catalogRes.error && catalogRes.error.code !== '42P01') throw catalogRes.error;
    if (componentRes.error && componentRes.error.code !== '42P01') throw componentRes.error;

    const buildingClasses = [
      ...new Set(
        (costRes.data || [])
          .map((r) => (r.building_class || '').trim())
          .filter(Boolean)
      ),
    ].sort();

    const rawQualityTypes = [
      ...new Set(
        (costRes.data || [])
          .map((r) => (r.quality_type || '').trim())
          .filter(Boolean)
      ),
    ];
    const qualityTypes = getCanonicalQualityTypes(rawQualityTypes);

    const sections = [
      ...new Set(
        (pctRes.data || [])
          .map((r) => (r.section_name || '').trim())
          .filter(Boolean)
      ),
    ].sort();

    const categories = [
      ...new Set(
        (pctRes.data || [])
          .map((r) => (r.category || '').trim())
          .filter(Boolean)
      ),
    ].sort();

    const occupancies = [
      ...new Set(
        (pctRes.data || [])
          .map((r) => (r.occupancy || '').trim())
          .filter(Boolean)
      ),
    ].sort();

    const manufacturers = [
      ...new Set(
        (catalogRes.data || [])
          .map((r) => (r.manufacturer || '').trim())
          .filter(Boolean)
      ),
    ].sort();

    const componentSections = [
      ...new Set(
        (componentRes.data || [])
          .map((r) => (r.section_name || '').trim())
          .filter(Boolean)
      ),
    ].sort();

    return NextResponse.json({
      success: true,
      building_classes: buildingClasses,
      quality_types: qualityTypes,
      sections,
      categories,
      occupancies,
      manufacturers,
      component_sections: componentSections,
    });
  } catch (err) {
    console.error('[cce-filters] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CCE filters' },
      { status: 500 }
    );
  }
});
