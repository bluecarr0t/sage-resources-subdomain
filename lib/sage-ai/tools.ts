/**
 * Sage AI Tools — aggregator for the domain tool modules.
 *
 * The actual tool implementations live in:
 *   - property-tools.ts  (Sage table queries: all_sage_data, reports, demographics, attractions)
 *   - ota-tools.ts       (query_ota over flat hipcamp/campspot/roverpass + raw scrape views)
 *   - external-tools.ts  (Google Places + opt-in Tavily/Firecrawl web research)
 *   - ux-tools.ts        (python codegen, follow-up suggestions, clarifying questions)
 * with shared helpers in tool-helpers.ts / quota-gate.ts / untrusted-content.ts.
 *
 * All tools are read-only against Supabase except where a module explicitly
 * routes writes through service-writer.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { withToolTelemetry } from '@/lib/sage-ai/tool-telemetry';
import {
  withToolResultCache,
  type ToolResultCacheContext,
} from '@/lib/sage-ai/tool-result-cache';
import { createGeoTools } from '@/lib/sage-ai/geo-tools';
import { createSemanticTools } from '@/lib/sage-ai/semantic-tools';
import { createComposedTools } from '@/lib/sage-ai/composed-tools';
import { createVisualizationTools } from '@/lib/sage-ai/visualization-tools';
import { createOtaMonthlyExportTool } from '@/lib/sage-ai/ota-monthly-export-tool';
import { createEmptyResultHandler } from '@/lib/sage-ai/tool-helpers';
import { createPropertyTools } from '@/lib/sage-ai/property-tools';
import { createOtaTools } from '@/lib/sage-ai/ota-tools';
import {
  createGooglePlacesTools,
  createWebResearchTools,
} from '@/lib/sage-ai/external-tools';
import { createUxTools } from '@/lib/sage-ai/ux-tools';

// Public API preserved from the pre-split tools.ts.
export {
  RAW_OTA_TABLES,
  HIPCAMP_RAW_TABLES,
  CAMPSPOT_RAW_TABLES,
} from '@/lib/sage-ai/tool-helpers';
export type { RawOtaTable } from '@/lib/sage-ai/tool-helpers';

export interface SageAiToolsContext {
  /** Stable subject for quota tracking (typically auth user id). */
  userId: string;
  /**
   * managed_users.role for the calling user. Used to gate admin-only tools
   * like build_feasibility_brief. Defaults to 'user' when omitted.
   */
  userRole?: 'admin' | 'author' | null;
  /** Correlation id to stitch tool events to the chat turn. */
  correlationId?: string;
  /**
   * When true, Tavily + Firecrawl tools (web_search, scrape_webpage, crawl_website) are registered.
   * Default false — omit so paid web research cannot run unless the user enables it in the UI.
   */
  webResearchEnabled?: boolean;
  /**
   * When true, location/proximity tools (geocode_property, nearest_attractions) and the
   * `near` filter on query_properties are registered. Default gated by env flag
   * SAGE_AI_GEO_TOOLS to allow dark rollout.
   */
  geoToolsEnabled?: boolean;
  /**
   * When true, the `semantic_search_properties` tool is registered. Requires
   * the property_embeddings table to be populated and OPENAI_API_KEY.
   * Default gated by env flag SAGE_AI_SEMANTIC_SEARCH.
   */
  semanticSearchEnabled?: boolean;
  /**
   * When true, composed tools (competitor_comparison, build_feasibility_brief)
   * are registered. Default gated by env flag SAGE_AI_COMPOSED_TOOLS.
   * build_feasibility_brief additionally requires userRole='admin'.
   */
  composedToolsEnabled?: boolean;
  /**
   * When true, the React-rendered visualization tools
   * (generate_dashboard, visualize_on_map) are registered. Default gated by
   * env flag SAGE_AI_VISUALIZATION_TOOLS.
   */
  visualizationToolsEnabled?: boolean;
  /** Session id for per-session tool-result caching. Omit when not in a saved session. */
  sessionId?: string | null;
}

export function createSageAiTools(
  supabase: SupabaseClient,
  context?: SageAiToolsContext
) {
  const userId = context?.userId;
  const telemetryCtx = context
    ? {
        supabase,
        userId: context.userId,
        correlationId: context.correlationId,
      }
    : null;

  // Per-request empty-result retry counter, shared across the data tool
  // modules so the same (tool, args) pair collides into one budget.
  const handleEmptyResult = createEmptyResultHandler();

  const baseTools = {
    ...createPropertyTools(supabase, handleEmptyResult),
    ...createOtaTools(supabase, handleEmptyResult),
    ...createUxTools({
      pythonEnabled: !context?.visualizationToolsEnabled,
    }),
    ...createGooglePlacesTools(userId),
  };

  const webResearchTools = createWebResearchTools(userId);

  const geoTools = context?.geoToolsEnabled
    ? createGeoTools(supabase, userId)
    : {};
  const semanticTools = context?.semanticSearchEnabled
    ? createSemanticTools(supabase, userId)
    : {};
  const composedTools = context?.composedToolsEnabled
    ? createComposedTools(supabase, {
        userId,
        userRole: context?.userRole ?? null,
      })
    : {};
  const visualizationTools = context?.visualizationToolsEnabled
    ? createVisualizationTools()
    : {};
  const otaMonthlyExportTools = createOtaMonthlyExportTool();

  const toolSet = {
    ...baseTools,
    ...otaMonthlyExportTools,
    ...(context?.webResearchEnabled ? webResearchTools : {}),
    ...geoTools,
    ...semanticTools,
    ...composedTools,
    ...visualizationTools,
  };

  return wrapWithTelemetry(toolSet, telemetryCtx, cacheCtxFrom(context));
}

function cacheCtxFrom(
  context?: SageAiToolsContext
): ToolResultCacheContext | null {
  if (!context?.userId || !context.sessionId) return null;
  return { userId: context.userId, sessionId: context.sessionId };
}

function wrapWithTelemetry<T extends Record<string, { execute?: unknown }>>(
  toolSet: T,
  ctx: Parameters<typeof withToolTelemetry>[1],
  cacheCtx: ToolResultCacheContext | null
): T {
  if (!ctx) return toolSet;
  const wrapped: Record<string, unknown> = {};
  for (const [name, original] of Object.entries(toolSet)) {
    const originalExec = (original as { execute?: (...a: unknown[]) => Promise<unknown> }).execute;
    if (typeof originalExec !== 'function') {
      wrapped[name] = original;
      continue;
    }
    const bound = originalExec.bind(original);
    const cached = withToolResultCache(name, cacheCtx, bound);
    wrapped[name] = {
      ...(original as object),
      execute: withToolTelemetry(name, ctx, cached),
    };
  }
  return wrapped as T;
}

export type SageAiTools = ReturnType<typeof createSageAiTools>;
