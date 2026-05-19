/**
 * GET /api/admin/sage-glamping-data/brands
 * Returns all rows from `glamping_brands` for the property editor brand picker.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  sortGlampingBrandsForSelect,
  type GlampingBrand,
} from '@/lib/glamping-brands';

export const dynamic = 'force-dynamic';

const TABLE = 'glamping_brands';

export const GET = withAdminAuth(async () => {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, slug, display_name, parent_brand_id, brand_tier, legacy_chain_key, website_url, reported_location_count, notes'
      )
      .order('display_name', { ascending: true });

    if (error) {
      const code = String((error as { code?: string }).code ?? '');
      const msg = String(error.message ?? '').toLowerCase();
      if (code === '42P01' || msg.includes('glamping_brands')) {
        return NextResponse.json({
          success: true,
          brands: [],
          options: [],
          hint: 'Apply scripts/migrations/create-glamping-brands-2026-05-18.sql',
        });
      }
      console.error('[admin/sage-data/brands] GET error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const brands = (data ?? []) as GlampingBrand[];
    const options = sortGlampingBrandsForSelect(brands);

    return NextResponse.json({ success: true, brands, options });
  } catch (err) {
    console.error('[admin/sage-data/brands] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load brands' },
      { status: 500 }
    );
  }
});
