/**
 * Persist comps v2 web gap-fill diagnostics + candidate rows (Supabase).
 * Uses service role client; failures are swallowed so discovery UX is unaffected.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import {
  compsV2WebCandidateToGlampingRow,
  webPipelineSourceForCandidate,
} from '@/lib/comps-v2/web-research-to-glamping-row';

const BATCH = 40;

export interface PersistCompsV2WebResearchParams {
  supabase: SupabaseClient;
  route: 'search' | 'gap_fill';
  userId: string | null;
  userEmail: string | null;
  diagnostics: WebResearchDiagnostics;
  /** Pipeline output rows (pre-merge with DB list is ideal; post-filter ok if that is what you pass). */
  candidates: CompsV2Candidate[];
  contextJson: Record<string, unknown>;
}

export interface PersistCompsV2WebResearchResult {
  runId: string | null;
  rowsInserted: number;
  error?: string;
}

export async function persistCompsV2WebResearch(
  params: PersistCompsV2WebResearchParams
): Promise<PersistCompsV2WebResearchResult> {
  const { supabase, route, userId, userEmail, diagnostics, candidates, contextJson } = params;
  let rowsInserted = 0;

  try {
    const { data: runRow, error: runErr } = await supabase
      .from('comps_v2_usage_runs' as never)
      .insert({
        user_id: userId,
        user_email: userEmail,
        route,
        tavily_queries_planned: diagnostics.tavily.queriesPlanned,
        tavily_queries_completed: diagnostics.tavily.queriesCompleted,
        tavily_raw_rows: diagnostics.tavily.rawResultRowsFromApi,
        firecrawl_attempted: diagnostics.firecrawl.attempted,
        firecrawl_enriched: diagnostics.firecrawl.enriched,
        web_geocode_attempts: diagnostics.webDistanceGeocodeAttempts ?? 0,
        web_geocode_hits: diagnostics.webDistanceGeocodeHits ?? 0,
        google_geocode_calls: diagnostics.googleGeocodeCalls ?? 0,
        nominatim_geocode_calls: diagnostics.nominatimGeocodeCalls ?? 0,
        context_json: contextJson,
      } as never)
      .select('id')
      .single();

    if (runErr || !runRow) {
      console.error('[persist-web-research] usage run insert failed:', runErr?.message);
      return { runId: null, rowsInserted: 0, error: runErr?.message ?? 'usage run insert failed' };
    }

    const runId = (runRow as { id: string }).id;

    const mappedRows = candidates.map((c) => {
      const pipeline = webPipelineSourceForCandidate(c);
      if (!pipeline) return null;
      const base = compsV2WebCandidateToGlampingRow(c);
      return {
        ...base,
        run_id: runId,
        comps_stable_id: c.stable_id,
        pipeline_source: pipeline,
      };
    });
    const webRows = mappedRows.filter(
      (r): r is NonNullable<(typeof mappedRows)[number]> => r != null
    );

    for (let i = 0; i < webRows.length; i += BATCH) {
      const chunk = webRows.slice(i, i + BATCH);
      const { error: insErr } = await supabase.from('comps_v2_web_research_finds' as never).insert(chunk as never);
      if (insErr) {
        console.error('[persist-web-research] finds batch insert failed:', insErr.message);
        return {
          runId,
          rowsInserted,
          error: insErr.message,
        };
      }
      rowsInserted += chunk.length;
    }

    return { runId, rowsInserted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[persist-web-research]', e);
    return { runId: null, rowsInserted, error: msg };
  }
}
