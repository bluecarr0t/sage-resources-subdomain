/**
 * GET /api/admin/sage-glamping-data/service-tier-breakdown
 * Property-level tier counts (published + in_progress glamping) for admin breakdown UI.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  GLAMPING_SERVICE_TIERS,
  type GlampingServiceTier,
} from '@/lib/glamping-service-tier';

export const dynamic = 'force-dynamic';

const LIST_ANCHORS_VIEW = 'all_sage_data_list_anchors';
const TABLE = 'all_sage_data';

type AnchorRow = {
  glamping_service_tier: string | null;
  glamping_service_tier_source: string | null;
};

export const GET = withAdminAuth(async () => {
  try {
    const supabase = createServerClient();

    let relation = LIST_ANCHORS_VIEW;
    let { data, error } = await supabase
      .from(relation)
      .select('glamping_service_tier, glamping_service_tier_source')
      .eq('is_glamping_property', 'Yes')
      .in('research_status', ['published', 'in_progress']);

    if (error) {
      const msg = String(error.message ?? '').toLowerCase();
      const missingView =
        msg.includes('list_anchors') ||
        msg.includes('does not exist') ||
        msg.includes('could not find');
      if (missingView) {
        relation = TABLE;
        ({ data, error } = await supabase
          .from(relation)
          .select('glamping_service_tier, glamping_service_tier_source, property_id, property_name')
          .eq('is_glamping_property', 'Yes')
          .in('research_status', ['published', 'in_progress']));
      }
    }

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as AnchorRow[];
    const byTier: Record<GlampingServiceTier, number> = {
      luxury: 0,
      upscale: 0,
      midscale: 0,
      rustic: 0,
    };
    let unset = 0;
    let manual = 0;
    let auto = 0;

    for (const row of rows) {
      const tier = row.glamping_service_tier;
      const source = row.glamping_service_tier_source;
      if (source === 'manual') manual += 1;
      else if (source === 'auto') auto += 1;
      if (tier && (GLAMPING_SERVICE_TIERS as readonly string[]).includes(tier)) {
        byTier[tier as GlampingServiceTier] += 1;
      } else {
        unset += 1;
      }
    }

    return NextResponse.json({
      success: true,
      totalProperties: rows.length,
      byTier,
      unset,
      manual,
      auto,
      listRelation: relation,
    });
  } catch (err) {
    console.error('[admin/sage-glamping-data/service-tier-breakdown]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load service tier breakdown' },
      { status: 500 }
    );
  }
});
