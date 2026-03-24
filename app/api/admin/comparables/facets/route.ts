/**
 * API Route: Facets for comparables filters
 * GET /api/admin/comparables/facets
 *
 * Returns distinct unit_categories, states, and amenity keywords for filter dropdowns.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const GET = withAdminAuth(async (_request) => {
  try {
    const supabaseAdmin = createServerClient();

    const [unitsRes, reportsRes, keywordsRes] = await Promise.all([
      supabaseAdmin
        .from('feasibility_comp_units')
        .select('unit_category')
        .not('unit_category', 'is', null),
      supabaseAdmin
        .from('reports')
        .select('state')
        .eq('has_comparables', true)
        .not('state', 'is', null),
      supabaseAdmin
        .from('feasibility_comparables')
        .select('amenity_keywords')
        .not('amenity_keywords', 'is', null)
        .limit(15000),
    ]);

    if (unitsRes.error) throw unitsRes.error;
    if (reportsRes.error) throw reportsRes.error;
    if (keywordsRes.error) throw keywordsRes.error;

    const unitCategories = [
      ...new Set(
        (unitsRes.data || [])
          .map((r) => (r.unit_category || '').trim())
          .filter(Boolean)
      ),
    ].sort();

    const states = [
      ...new Set(
        (reportsRes.data || [])
          .map((r) => (r.state || '').trim().toUpperCase())
          .filter(Boolean)
      ),
    ].sort();

    const keywordSet = new Set<string>();
    for (const row of keywordsRes.data || []) {
      const arr = row.amenity_keywords as string[] | null | undefined;
      if (!Array.isArray(arr)) continue;
      for (const k of arr) {
        const t = String(k ?? '').trim();
        if (t) keywordSet.add(t);
      }
    }
    const keywords = [...keywordSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    return NextResponse.json({
      success: true,
      unit_categories: unitCategories,
      states,
      keywords,
    });
  } catch (err) {
    console.error('[comparables/facets] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch facets' },
      { status: 500 }
    );
  }
});
