/**
 * GET /api/admin/site-builder/amenity-costs
 * List all rows from amenities (catalog slugs + all_glamping_properties dataset fields).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { withAdminAuth } from '@/lib/require-admin-auth';

export const GET = withAdminAuth(async (_request: NextRequest, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('amenities')
      .select(
        'id, slug, glamping_property_column, name, cost_per_unit, applies_to, scope, glamping_fields, default_cost_basis, default_cost_source_url, sort_order'
      );

    if (error && error.code !== '42P01') {
      const msg = error.message ?? '';
      if (/default_cost_basis|column .* does not exist/i.test(msg)) {
        const retry = await auth.supabase
          .from('amenities')
          .select(
            'id, slug, glamping_property_column, name, cost_per_unit, applies_to, scope, glamping_fields, sort_order'
          );
        if (retry.error && retry.error.code !== '42P01') throw retry.error;
        return NextResponse.json({
          success: true,
          rows: (retry.data ?? []).map((r) => ({
            ...r,
            default_cost_basis: null as string | null,
            default_cost_source_url: null as string | null,
          })),
        });
      }
      throw error;
    }

    const rows = [...(data ?? [])].sort((a, b) => {
      const aCat = a.slug != null;
      const bCat = b.slug != null;
      if (aCat !== bCat) return aCat ? -1 : 1;
      if (aCat) {
        const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (so !== 0) return so;
        return String(a.name).localeCompare(String(b.name));
      }
      return String(a.glamping_property_column ?? '').localeCompare(
        String(b.glamping_property_column ?? '')
      );
    });

    return NextResponse.json({ success: true, rows });
  } catch (err) {
    console.error('[api/admin/site-builder/amenity-costs GET]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load amenities' },
      { status: 500 }
    );
  }
});
