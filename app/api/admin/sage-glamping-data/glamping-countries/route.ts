/**
 * GET /api/admin/sage-glamping-data/glamping-countries
 * Returns a sorted, deduplicated list of `country` values that actually exist in
 * `all_glamping_properties` (for the Sage Data table filter only).
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

const TABLE = 'all_glamping_properties';
const PAGE_SIZE = 3000;

export const GET = withAdminAuth(async () => {
  try {
    const supabase = createServerClient();
    const fromDb = new Set<string>();
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from(TABLE)
        .select('country')
        .not('country', 'is', null)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('[glamping-countries] query error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, countries: [] });
        }
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      if (!data?.length) break;
      for (const row of data) {
        const c = row.country;
        if (typeof c === 'string' && c.trim()) fromDb.add(c.trim());
      }
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const countries = [...fromDb].sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    return NextResponse.json({ success: true, countries });
  } catch (err) {
    console.error('[glamping-countries] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load country list' },
      { status: 500 }
    );
  }
});
