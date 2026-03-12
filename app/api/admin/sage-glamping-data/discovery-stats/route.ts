/**
 * API Route: Get glamping discovery pipeline stats
 * GET /api/admin/sage-glamping-data/discovery-stats
 *
 * Returns counts of properties added via the RSS/news discovery pipeline
 * (Google News RSS, Tavily Search, Manual Article, Local Text File)
 * with time-based breakdown: Last 30 days, 90 days, 6 months, All-time
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

const DISCOVERY_SOURCES = [
  'Google News RSS',
  'Tavily Search',
  'Manual Article',
  'Local Text File',
];

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export const GET = withAdminAuth(async () => {
  try {
    const supabase = createServerClient();

    const { data: rows, error } = await supabase
      .from('all_glamping_properties')
      .select('discovery_source, created_at, date_added')
      .in('discovery_source', DISCOVERY_SOURCES);

    if (error) {
      console.error('[api/admin/sage-glamping-data/discovery-stats] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const now = new Date();
    const cutoff30 = new Date(now);
    cutoff30.setDate(cutoff30.getDate() - 30);
    const cutoff90 = new Date(now);
    cutoff90.setDate(cutoff90.getDate() - 90);
    const cutoff6mo = new Date(now);
    cutoff6mo.setMonth(cutoff6mo.getMonth() - 6);

    const bySource: Record<string, number> = {};
    for (const src of DISCOVERY_SOURCES) {
      bySource[src] = 0;
    }
    let total = 0;
    let last30 = 0;
    let last90 = 0;
    let last6mo = 0;

    for (const row of rows || []) {
      const src = row.discovery_source;
      if (!src || bySource[src] === undefined) continue;

      const created = parseDate(row.created_at) ?? parseDate(row.date_added);
      if (!created) continue;

      bySource[src]++;
      total++;
      if (created >= cutoff30) last30++;
      if (created >= cutoff90) last90++;
      if (created >= cutoff6mo) last6mo++;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalFromPipeline: total,
        bySource,
        byPeriod: {
          last30Days: last30,
          last90Days: last90,
          last6Months: last6mo,
          allTime: total,
        },
      },
    });
  } catch (err) {
    console.error('[api/admin/sage-glamping-data/discovery-stats] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discovery stats' },
      { status: 500 }
    );
  }
});
