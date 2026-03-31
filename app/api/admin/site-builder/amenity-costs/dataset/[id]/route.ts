/**
 * PATCH /api/admin/site-builder/amenity-costs/dataset/[id]
 * Update name, cost_per_unit, and/or applies_to for a dataset-only amenities row (slug IS NULL).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { withAdminAuth } from '@/lib/require-admin-auth';
import { SITE_BUILDER_AMENITY_OVERRIDE_MAX } from '@/lib/site-builder/amenity-cost-resolve';

const APPLIES = new Set(['glamping', 'rv', 'both']);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ParamsContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  try {
    const { id: rawId } = await context!.params;
    const id = decodeURIComponent(rawId).trim();
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
    }

    const patch: Record<string, string | number> = {};

    if ('name' in body) {
      const name = String((body as { name?: unknown }).name ?? '').trim();
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
      }
      patch.name = name;
    }

    if ('cost_per_unit' in body) {
      const n = Number((body as { cost_per_unit?: unknown }).cost_per_unit);
      if (!Number.isFinite(n) || n < 0 || n > SITE_BUILDER_AMENITY_OVERRIDE_MAX) {
        return NextResponse.json(
          { success: false, error: 'Invalid cost_per_unit' },
          { status: 400 }
        );
      }
      patch.cost_per_unit = Math.round(n);
    }

    if ('applies_to' in body) {
      const ap = String((body as { applies_to?: unknown }).applies_to ?? '');
      if (!APPLIES.has(ap)) {
        return NextResponse.json(
          { success: false, error: 'applies_to must be glamping, rv, or both' },
          { status: 400 }
        );
      }
      patch.applies_to = ap;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from('amenities')
      .update(patch)
      .eq('id', id)
      .is('slug', null)
      .select(
        'id, slug, glamping_property_column, name, cost_per_unit, applies_to, scope, default_cost_basis, default_cost_source_url'
      )
      .maybeSingle();

    if (error) {
      console.error('[api/admin/site-builder/amenity-costs/dataset PATCH]', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Update failed' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Dataset amenity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, row: data });
  } catch (err) {
    console.error('[api/admin/site-builder/amenity-costs/dataset/[id] PATCH]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update amenity' },
      { status: 500 }
    );
  }
});
