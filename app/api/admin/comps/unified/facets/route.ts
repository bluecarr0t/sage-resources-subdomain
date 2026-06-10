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
import { buildCountryFilterOptions } from '@/lib/comps-unified/country-filter';

import { COMPS_UNIFIED_FACETS_CACHE_KEY } from '@/lib/comps-unified/facets-cache-keys';

const CACHE_KEY = COMPS_UNIFIED_FACETS_CACHE_KEY;
const CACHE_TTL_SECONDS = 24 * 60 * 60;

interface FacetsPayload {
  sources: string[];
  countries: string[];
  states: string[];
  unit_categories: string[];
  keywords: string[];
  sage_property_types: string[];
}

function normalizeStatesFromRaw(rawStates: string[]): string[] {
  const stateAbbrevSet = new Set<string>();
  const unknownStates = new Set<string>();
  for (const raw of rawStates) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) continue;
    const abbr = normalizeStateToCanonicalAbbrev(trimmed);
    if (abbr) {
      stateAbbrevSet.add(abbr);
    } else {
      unknownStates.add(trimmed);
    }
  }
  return [...stateAbbrevSet, ...unknownStates].sort((a, b) => {
    const la = STATE_ABBREVIATIONS[a] ?? a;
    const lb = STATE_ABBREVIATIONS[b] ?? b;
    return la.localeCompare(lb, undefined, { sensitivity: 'base' });
  });
}

async function computeFacets(): Promise<FacetsPayload> {
  const supabase = createServerClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc('unified_comps_facets');

  if (!rpcError && rpcData && typeof rpcData === 'object') {
    const payload = rpcData as {
      sources?: unknown;
      countries?: unknown;
      states?: unknown;
      unit_categories?: unknown;
      keywords?: unknown;
      sage_property_types?: unknown;
    };
    const sources = Array.isArray(payload.sources)
      ? payload.sources.map((s) => String(s).trim()).filter(Boolean).sort()
      : [];
    const rawCountries = Array.isArray(payload.countries)
      ? payload.countries.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const rawStates = Array.isArray(payload.states)
      ? payload.states.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const unitCategories = Array.isArray(payload.unit_categories)
      ? payload.unit_categories.map((c) => String(c).trim()).filter(Boolean).sort()
      : [];
    const keywords = Array.isArray(payload.keywords)
      ? payload.keywords
          .map((k) => String(k).trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      : [];
    const sagePropertyTypes = Array.isArray(payload.sage_property_types)
      ? payload.sage_property_types
          .map((pt) => String(pt).trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      : [];

    return {
      sources,
      countries: buildCountryFilterOptions(rawCountries).map((o) => o.value),
      states: normalizeStatesFromRaw(rawStates),
      unit_categories: unitCategories,
      keywords,
      sage_property_types: sagePropertyTypes,
    };
  }

  if (rpcError) {
    console.warn('[comps/unified/facets] unified_comps_facets RPC failed, using paginated scan:', rpcError.message);
  }

  return computeFacetsPaginated(supabase);
}

/** Fallback when unified_comps_facets() is not deployed yet. */
async function computeFacetsPaginated(supabase: ReturnType<typeof createServerClient>): Promise<FacetsPayload> {
  const PAGE = 10_000;
  const sourceSet = new Set<string>();
  const rawCountrySet = new Set<string>();
  const rawStateSet = new Set<string>();
  const unitSet = new Set<string>();
  const kwSet = new Set<string>();
  const sagePropertyTypeSet = new Set<string>();

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('unified_comps')
      .select('source, country, state, unit_category, amenity_keywords, property_type')
      .range(offset, offset + PAGE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const src = String(row.source ?? '').trim();
      if (src) sourceSet.add(src);
      const co = String(row.country ?? '').trim();
      if (co) rawCountrySet.add(co);
      const st = String(row.state ?? '').trim();
      if (st) rawStateSet.add(st);
      const uc = String(row.unit_category ?? '').trim();
      if (uc) unitSet.add(uc);
      const arr = row.amenity_keywords;
      if (Array.isArray(arr)) {
        for (const k of arr) {
          const t = String(k ?? '').trim();
          if (t) kwSet.add(t);
        }
      }
      if (src === 'all_sage_data') {
        const pt = String(row.property_type ?? '').trim();
        if (pt) sagePropertyTypeSet.add(pt);
      }
    }

    if (data.length < PAGE) break;
  }

  return {
    sources: [...sourceSet].sort(),
    countries: buildCountryFilterOptions([...rawCountrySet]).map((o) => o.value),
    states: normalizeStatesFromRaw([...rawStateSet]),
    unit_categories: [...unitSet].sort(),
    keywords: [...kwSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    sage_property_types: [...sagePropertyTypeSet].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    ),
  };
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
