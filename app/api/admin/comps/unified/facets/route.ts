/**
 * API Route: Distinct facet values for the unified comps filter dropdowns.
 * GET /api/admin/comps/unified/facets
 *
 * Returns { sources, states, unit_categories, keywords } sourced from the
 * `unified_comps` matview. Wrapped in a 24h Upstash cache so repeat loads are
 * one Redis GET. Invalidate with:
 *   GET /api/admin/comps/unified/facets?refresh=1   (admin only)
 * or from the materialized-view refresh job, which should call the same URL.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { getRedis } from '@/lib/upstash';
import { normalizeStateToCanonicalAbbrev, STATE_ABBREVIATIONS } from '@/components/map/utils/stateUtils';

const CACHE_KEY = 'admin:comps-unified:facets:v2';
const CACHE_TTL_SECONDS = 24 * 60 * 60;

interface FacetsPayload {
  sources: string[];
  states: string[];
  unit_categories: string[];
  keywords: string[];
}

async function computeFacets(): Promise<FacetsPayload> {
  const supabase = createServerClient();

  const [sourcesRes, statesRes, unitRes, keywordsRes] = await Promise.all([
    supabase
      .from('unified_comps')
      .select('source')
      .not('source', 'is', null)
      .limit(50_000),
    supabase
      .from('unified_comps')
      .select('state')
      .not('state', 'is', null)
      .limit(50_000),
    supabase
      .from('unified_comps')
      .select('unit_category')
      .not('unit_category', 'is', null)
      .limit(50_000),
    supabase
      .from('unified_comps')
      .select('amenity_keywords')
      .not('amenity_keywords', 'is', null)
      .limit(50_000),
  ]);

  if (sourcesRes.error) throw sourcesRes.error;
  if (statesRes.error) throw statesRes.error;
  if (unitRes.error) throw unitRes.error;
  if (keywordsRes.error) throw keywordsRes.error;

  const sources = [
    ...new Set(
      (sourcesRes.data || [])
        .map((r) => String(r.source ?? '').trim())
        .filter(Boolean)
    ),
  ].sort();

  // One entry per region: normalize "AL", "Alabama", "ALABAMA" → "AL"
  const stateAbbrevSet = new Set<string>();
  const unknownStates = new Set<string>();
  for (const row of statesRes.data || []) {
    const raw = String((row as { state?: string }).state ?? '').trim();
    if (!raw) continue;
    const abbr = normalizeStateToCanonicalAbbrev(raw);
    if (abbr) {
      stateAbbrevSet.add(abbr);
    } else {
      unknownStates.add(raw);
    }
  }
  const states = [...stateAbbrevSet, ...unknownStates].sort((a, b) => {
    const la = STATE_ABBREVIATIONS[a] ?? a;
    const lb = STATE_ABBREVIATIONS[b] ?? b;
    return la.localeCompare(lb, undefined, { sensitivity: 'base' });
  });

  const unitCategories = [
    ...new Set(
      (unitRes.data || [])
        .map((r) => String(r.unit_category ?? '').trim())
        .filter(Boolean)
    ),
  ].sort();

  const kwSet = new Set<string>();
  for (const row of keywordsRes.data || []) {
    const arr = (row as { amenity_keywords?: unknown }).amenity_keywords;
    if (!Array.isArray(arr)) continue;
    for (const k of arr) {
      const t = String(k ?? '').trim();
      if (t) kwSet.add(t);
    }
  }
  const keywords = [...kwSet].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  return { sources, states, unit_categories: unitCategories, keywords };
}

export const GET = withAdminAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === '1';
    const redis = getRedis();

    if (!forceRefresh && redis) {
      const cached = await redis.get<FacetsPayload>(CACHE_KEY);
      if (cached) {
        return NextResponse.json({ success: true, cached: true, ...cached });
      }
    }

    const payload = await computeFacets();

    if (redis) {
      await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL_SECONDS });
    }

    return NextResponse.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('[comps/unified/facets] error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch facets' },
      { status: 500 }
    );
  }
});
