/**
 * GET /api/admin/sage-glamping-data/glamping-discovery-sources
 * Returns a sorted, deduplicated list of `discovery_source` values that exist in
 * `all_glamping_properties` (for the Sage Data table Source filter).
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
        .select('discovery_source')
        .not('discovery_source', 'is', null)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('[glamping-discovery-sources] query error:', error);
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, discoverySources: [] });
        }
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      if (!data?.length) break;
      for (const row of data) {
        const src = row.discovery_source;
        if (typeof src === 'string' && src.trim()) fromDb.add(src.trim());
      }
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const discoverySources = [...fromDb].sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );
    return NextResponse.json({ success: true, discoverySources });
  } catch (err) {
    console.error('[glamping-discovery-sources] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load discovery source list' },
      { status: 500 }
    );
  }
});
