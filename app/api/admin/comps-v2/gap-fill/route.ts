/**
 * POST /api/admin/comps-v2/gap-fill — Tavily + optional Firecrawl without re-running DB discovery.
 * Same pipeline as search when `sources.web_search` is on; callable from the admin UI or any HTTP client.
 *
 * **`existingCandidates`:** send a minimal dedupe payload per row: `property_name`, `city`, `url`
 * (optional), `stable_id` (optional, ignored for dedupe today). Full comp objects are not required.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import type { AdminAuthContext } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { runGapFillPipeline } from '@/lib/comps-v2/gap-fill';
import { persistCompsV2WebResearch } from '@/lib/comps-v2/persist-web-research';
import { COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES } from '@/lib/comps-v2/gap-fill-limits';
import {
  clamp,
  parsePropertyKinds,
  parseQualityTiers,
  parseTavilyMaxQueries,
  parseTavilyResultsPerQuery,
} from '@/lib/comps-v2/parse-body';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import { canonicalUrlKeyForDedupe } from '@/lib/comps-v2/tavily-gap';
import { compsV2WebVsMarketDedupeKey } from '@/lib/comps-v2/candidate-dedupe-keys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export const POST = withAdminAuth(async (request: NextRequest, auth: AdminAuthContext) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const state = typeof body.state === 'string' ? body.state.trim().toUpperCase().slice(0, 2) : '';
    if (!state || state.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'STATE_REQUIRED',
          message: 'city and state (2-letter) required',
        },
        { status: 400 }
      );
    }
    if (!city) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'CITY_REQUIRED',
          message: 'city is required (use the discovery search anchor).',
        },
        { status: 400 }
      );
    }

    const existing = Array.isArray(body.existingCandidates) ? body.existingCandidates : [];
    if (existing.length > COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'EXISTING_PAYLOAD_TOO_LARGE',
          message: `Too many existing comps for gap-fill (${existing.length}). Maximum ${COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES}. Narrow filters or run discovery with a smaller result set.`,
        },
        { status: 413 }
      );
    }
    const nameKeys = new Set<string>();
    const urlKeys = new Set<string>();
    for (const row of existing) {
      if (row && typeof row === 'object' && 'property_name' in row) {
        const r = row as { property_name?: string; city?: string; state?: string };
        const rowSt = (r.state ?? '').trim().toUpperCase().slice(0, 2);
        const stateForKey = rowSt.length === 2 ? rowSt : state;
        const nk = compsV2WebVsMarketDedupeKey(String(r.property_name ?? ''), r.city, stateForKey);
        if (nk) nameKeys.add(nk);
      }
      if (row && typeof row === 'object' && 'url' in row) {
        const u = String((row as { url?: string }).url ?? '').trim();
        if (u) {
          const k = canonicalUrlKeyForDedupe(u);
          if (k) urlKeys.add(k);
        }
      }
    }

    const kinds = parsePropertyKinds(body.propertyKinds);
    const qualityTiers = parseQualityTiers(body.qualityTiers);
    const radiusMiles = clamp(
      typeof body.radiusMiles === 'number' ? body.radiusMiles : Number(body.radiusMiles) || 100,
      10,
      400
    );
    const firecrawlTopN =
      typeof body.firecrawlTopN === 'number' ? Math.min(8, Math.max(0, body.firecrawlTopN)) : 4;
    const maxGapComps =
      typeof body.maxGapComps === 'number' ? clamp(body.maxGapComps, 4, 40) : undefined;
    const tavilyMaxQueries = parseTavilyMaxQueries(body.tavilyMaxQueries);
    const tavilyResultsPerQuery = parseTavilyResultsPerQuery(body.tavilyResultsPerQuery);
    const anchorLat =
      typeof body.anchorLat === 'number' && Number.isFinite(body.anchorLat) ? body.anchorLat : undefined;
    const anchorLng =
      typeof body.anchorLng === 'number' && Number.isFinite(body.anchorLng) ? body.anchorLng : undefined;

    const { candidates: newRows, diagnostics } = await runGapFillPipeline(
      city,
      state,
      kinds,
      nameKeys,
      urlKeys,
      {
        firecrawlTopN,
        radiusMiles,
        qualityTiers,
        maxGapComps,
        anchorLat,
        anchorLng,
        tavilyMaxQueries,
        tavilyResultsPerQuery,
      }
    );
    diagnostics.anchorCityForQueries = city.trim() || undefined;
    diagnostics.addedAfterFilters = newRows.length;

    const persistClient = createServerClient();
    void persistCompsV2WebResearch({
      supabase: persistClient,
      route: 'gap_fill',
      userId: auth.session.user.id,
      userEmail: auth.session.user.email ?? null,
      diagnostics,
      candidates: newRows,
      contextJson: {
        city: city.trim(),
        state,
        radiusMiles,
        firecrawlTopN,
        maxGapComps,
        tavilyMaxQueries,
        tavilyResultsPerQuery,
      },
    }).catch((e) => console.error('[comps-v2/gap-fill] persist web research', e));

    return NextResponse.json({
      success: true,
      added: newRows as CompsV2Candidate[],
      webResearch: diagnostics,
    });
  } catch (e) {
    console.error('[comps-v2/gap-fill]', e);
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Gap fill failed' },
      { status: 500 }
    );
  }
});
