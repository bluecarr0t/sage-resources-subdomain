/**
 * Shared comps-v2 discovery search pipeline for JSON and NDJSON stream responses.
 */

import { createServerClient } from '@/lib/supabase';
import {
  coalesceUsStateAbbrForComps,
  resolveGeocodeForCompsSearch,
} from '@/lib/geocode';
import { resolveAnchorCityForWebSearch } from '@/lib/comps-v2/web-search-anchor-city';
import { compsV2WebVsMarketDedupeKey } from '@/lib/comps-v2/candidate-dedupe-keys';
import { compareCompsV2Candidates, discoverCompsV2 } from '@/lib/comps-v2/discover';
import { passesAdrRange, passesQualityTiers } from '@/lib/comps-v2/filters';
import { rowPassesGlampingUnitGate } from '@/lib/comps-v2/glamping-unit-classify';
import { runGapFillPipeline } from '@/lib/comps-v2/gap-fill';
import { dedupeUniqueProperties } from '@/lib/comps-v2/unique-properties';
import { rowMatchesPropertyKinds } from '@/lib/comps-v2/kind-matcher';
import { canonicalUrlKeyForDedupe } from '@/lib/comps-v2/tavily-gap';
import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';
import {
  parsePropertyKinds,
  parseQualityTiers,
  parseSourceToggles,
  parseMaxResults,
  parseTavilyMaxQueries,
  parseTavilyResultsPerQuery,
  clamp,
  COMPS_V2_ROW_LIMIT_PER_TABLE_DEFAULT,
} from '@/lib/comps-v2/parse-body';
import { persistCompsV2WebResearch } from '@/lib/comps-v2/persist-web-research';
import type { AdminAuthContext } from '@/lib/require-admin-auth';
import type { SourceToggles } from '@/lib/comps-v2/types';
import type { CompsV2SearchStreamEvent } from '@/lib/comps-v2/search-stream-events';
import type { SearchStreamSuccessPayload } from '@/lib/comps-v2/search-stream-events';

function buildMarketWarnings(sources: SourceToggles, counts: Record<string, number>): string[] {
  const w: string[] = [];
  if (sources.all_glamping_properties && (counts.all_glamping_properties ?? 0) === 0) {
    w.push('Sage Glamping Data returned 0 rows for this area and filters.');
  }
  if (sources.hipcamp && (counts.hipcamp ?? 0) === 0) {
    w.push('Hipcamp returned 0 rows for this area and filters.');
  }
  if (sources.all_roverpass_data_new && (counts.all_roverpass_data_new ?? 0) === 0) {
    w.push('RoverPass returned 0 rows for this area and filters.');
  }
  if (sources.campspot && (counts.campspot ?? 0) === 0) {
    w.push('Campspot returned 0 rows for this area and filters.');
  }
  if (sources.pastReports && (counts.past_reports ?? 0) === 0) {
    w.push('Past reports returned 0 comps near this anchor.');
  }
  return w;
}

export async function executeCompsV2Search(
  body: Record<string, unknown>,
  auth: AdminAuthContext,
  emit?: (e: CompsV2SearchStreamEvent) => void,
  ctx?: { correlationId: string }
): Promise<
  { ok: true; payload: SearchStreamSuccessPayload } | { ok: false; status: number; message: string }
> {
  const push = (e: CompsV2SearchStreamEvent) => {
    emit?.(e);
  };

  const locationLine =
    typeof body.locationLine === 'string' && body.locationLine.trim()
      ? body.locationLine.trim()
      : '';
  const address1 = typeof body.address1 === 'string' ? body.address1.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const stateRaw = typeof body.state === 'string' ? body.state.trim() : '';
  const zip = typeof body.zip === 'string' ? body.zip.trim() : '';

  const coords = await resolveGeocodeForCompsSearch({
    locationLine: locationLine || undefined,
    address1: address1 || undefined,
    city: city || undefined,
    state: stateRaw || undefined,
    zip: zip || undefined,
  });

  if (!coords) {
    return {
      ok: false,
      status: 400,
      message:
        'Geocoding failed. Enter a place in “Address or place” (include state when possible, e.g. Bend, OR). ' +
        'If you use Google Geocoding, ensure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) is set and Geocoding API is enabled; otherwise OpenStreetMap fallback is used.',
    };
  }

  const stateResolved = coalesceUsStateAbbrForComps(stateRaw, coords, locationLine);
  if (stateResolved.length !== 2) {
    return {
      ok: false,
      status: 400,
      message:
        'Could not determine US state for regional filters. Include a 2-letter state in the address (e.g. Austin, TX).',
    };
  }

  push({ type: 'phase', step: 'geocode', status: 'complete' });

  const anchorCityForWeb = await resolveAnchorCityForWebSearch({
    structuredCity: city,
    locationLine,
    lat: coords.lat,
    lng: coords.lng,
  });

  const radiusMiles = clamp(
    typeof body.radiusMiles === 'number' ? body.radiusMiles : Number(body.radiusMiles) || 100,
    10,
    400
  );
  const maxResults = parseMaxResults(body.maxResults);

  const sources = parseSourceToggles(body.sources);
  const propertyKinds = parsePropertyKinds(body.propertyKinds);
  const minAdr = body.minAdr != null && body.minAdr !== '' ? Number(body.minAdr) : null;
  const maxAdr = body.maxAdr != null && body.maxAdr !== '' ? Number(body.maxAdr) : null;
  const qualityTiers = parseQualityTiers(body.qualityTiers);
  const glampingStrict =
    propertyKinds.includes('glamping') &&
    !propertyKinds.includes('rv') &&
    !propertyKinds.includes('campground');

  const supabase = createServerClient();
  let { candidates, counts, sourceTimingsMs } = await discoverCompsV2(supabase, {
    lat: coords.lat,
    lng: coords.lng,
    stateInput: stateResolved,
    radiusMiles,
    maxResults,
    propertyKinds,
    minAdr,
    maxAdr,
    qualityTiers,
    sources,
    rowLimitPerTable:
      typeof body.rowLimitPerTable === 'number'
        ? clamp(body.rowLimitPerTable, 50, 800)
        : COMPS_V2_ROW_LIMIT_PER_TABLE_DEFAULT,
    maxPastReportGeocodes:
      typeof body.maxPastReportGeocodes === 'number'
        ? clamp(body.maxPastReportGeocodes, 0, 80)
        : 25,
  });

  const marketWarnings = buildMarketWarnings(sources, counts);
  push({
    type: 'phase',
    step: 'markets',
    status: 'complete',
    counts: { ...counts },
    warnings: marketWarnings.length ? marketWarnings : undefined,
    sourceTimingsMs: { ...sourceTimingsMs },
  });

  push({ type: 'phase', step: 'merge', status: 'complete' });

  let webResearch: WebResearchDiagnostics | null = null;

  if (sources.web_search) {
    push({ type: 'phase', step: 'web', status: 'started' });
    const nameKeys = new Set<string>();
    for (const c of candidates) {
      const rowState = (c.state ?? '').trim().toUpperCase().slice(0, 2);
      const stateForKey = rowState.length === 2 ? rowState : stateResolved;
      const k = compsV2WebVsMarketDedupeKey(c.property_name, c.city, stateForKey);
      if (k) nameKeys.add(k);
    }
    const urlKeys = new Set<string>();
    for (const c of candidates) {
      if (c.url) {
        const k = canonicalUrlKeyForDedupe(c.url);
        if (k) urlKeys.add(k);
      }
    }
    const firecrawlTopN =
      typeof body.firecrawlTopN === 'number' ? clamp(body.firecrawlTopN, 0, 8) : 4;
    const maxGapComps =
      typeof body.maxGapComps === 'number' ? clamp(body.maxGapComps, 4, 40) : undefined;
    const tavilyMaxQueries = parseTavilyMaxQueries(body.tavilyMaxQueries);
    const tavilyResultsPerQuery = parseTavilyResultsPerQuery(body.tavilyResultsPerQuery);
    const { candidates: addedRaw, diagnostics } = await runGapFillPipeline(
      anchorCityForWeb,
      stateResolved,
      propertyKinds,
      nameKeys,
      urlKeys,
      {
        firecrawlTopN,
        radiusMiles,
        qualityTiers,
        maxGapComps,
        anchorLat: coords.lat,
        anchorLng: coords.lng,
        tavilyMaxQueries,
        tavilyResultsPerQuery,
        onWebResearchProgress: (snap) => {
          push({ type: 'web_progress', diagnostics: { ...snap, anchorCityForQueries: anchorCityForWeb } });
        },
      }
    );
    diagnostics.anchorCityForQueries = anchorCityForWeb;
    let added = addedRaw;
    added = added.filter(
      (c) =>
        rowMatchesPropertyKinds(c, propertyKinds, c.property_type ?? null) &&
        passesAdrRange(c, minAdr, maxAdr) &&
        passesQualityTiers(c, qualityTiers)
    );
    if (glampingStrict) {
      added = added.filter((c) => rowPassesGlampingUnitGate(c));
    }
    diagnostics.addedAfterFilters = added.length;
    webResearch = diagnostics;

    push({ type: 'web_progress', diagnostics });

    const persistClient = createServerClient();
    void persistCompsV2WebResearch({
      supabase: persistClient,
      route: 'search',
      userId: auth.session.user.id,
      userEmail: auth.session.user.email ?? null,
      diagnostics,
      candidates: addedRaw,
      contextJson: {
        anchorCity: anchorCityForWeb,
        stateAbbr: stateResolved,
        radiusMiles,
        firecrawlTopN,
        maxGapComps,
        tavilyMaxQueries,
        tavilyResultsPerQuery,
        locationLine: locationLine || undefined,
      },
    }).catch((e) => console.error('[comps-v2/search] persist web research', e));

    counts = {
      ...counts,
      web_search_tavily_raw_hits: diagnostics.tavily.rawResultRowsFromApi,
      web_search_pipeline_candidates: diagnostics.pipelineOutputCount,
      web_search: added.length,
    };

    const merged = [...candidates, ...added];
    merged.sort(compareCompsV2Candidates);
    candidates = dedupeUniqueProperties(merged).slice(0, Math.max(1, Math.min(maxResults, 2000)));

    push({ type: 'phase', step: 'web', status: 'complete' });
  }

  const payload: SearchStreamSuccessPayload = {
    geocode: coords,
    counts,
    candidates,
    webResearch,
    searchContext: {
      anchorCity: anchorCityForWeb,
      stateAbbr: stateResolved,
    },
    correlationId: ctx?.correlationId,
    sourceTimingsMs: { ...sourceTimingsMs },
  };

  return { ok: true, payload };
}
