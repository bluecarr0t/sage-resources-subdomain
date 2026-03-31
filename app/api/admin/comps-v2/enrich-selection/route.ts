/**
 * POST /api/admin/comps-v2/enrich-selection
 *
 * **Data sources (server env):** `AI_GATEWAY_API_KEY` (Vercel AI Gateway for the LLM step; preferred), or
 * legacy `OPENAI_API_KEY` for direct OpenAI; `TAVILY_API_KEY`, optional `FIRECRAWL_API_KEY` for the
 * property URL, and Google Places API (New) text search when `GOOGLE_PLACES_SERVER_API_KEY` or
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set with Places API enabled (server IP / unrestricted key may be
 * required for production). Extraction defaults to `anthropic/claude-sonnet-4.6` on the gateway; override with
 * `COMPS_V2_DEEP_ENRICH_MODEL` (or legacy `OPENAI_DEEP_ENRICH_MODEL`), or set `COMPS_V2_MODEL_DEFAULT` for
 * all comps-v2 tasks that use it. Optional long-context condense: `COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL` and
 * `COMPS_V2_DEEP_ENRICH_CONDENSE_MIN_CHARS` (see `lib/comps-v2/comps-v2-llm-config.ts`).
 *
 * **Usage:** Each successful LLM call (condense + extraction per property) is logged to
 * `admin_ai_usage_events` with `feature: comps_v2_deep_enrich` for `/admin/usage-panel`.
 * **Correlation:** Body `correlationId` wins if set; otherwise `X-Correlation-Id` / `x-correlation-id` header.
 * Stored in `request_meta` (plus `correlation_source`: `body` | `header`). Logged to stdout when present for Vercel.
 *
 * **Gateway (env):** `COMPS_V2_GATEWAY_MODEL_FALLBACKS` (comma-separated model ids), `COMPS_V2_GATEWAY_PROMPT_CACHING=auto`,
 * `COMPS_V2_LLM_MAX_RETRIES` (default 2 retries after first attempt).
 *
 * **Contract (aligned with admin UI):** `items` must contain **3–5** elements. Each item should
 * include `property_name` (required), plus optional `city`, `state`, `url`. The API is stricter
 * than a generic 1–5 tool: fewer than 3 items returns 400. Programmatic clients must send at least
 * three valid property rows (same as “Select for deep dive” in `/admin/comps-v2`).
 *
 * Error responses include `errorCode` for i18n mapping on the client; `message` is English fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import type { AdminAuthContext } from '@/lib/require-admin-auth';
import { enrichCompSelectionDeep, type DeepEnrichInput } from '@/lib/comps-v2/deep-enrich';
import { resolveCompsV2EnrichCorrelationId } from '@/lib/comps-v2/resolve-enrich-correlation-id';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** Pro/Enterprise: raise if your host allows longer serverless runs (Vercel default 10s on Hobby). */
export const maxDuration = 180;

export const POST = withAdminAuth(async (request: NextRequest, auth: AdminAuthContext) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const itemsRaw = body.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'ITEMS_ARRAY_REQUIRED',
          message: 'Request body must include a non-empty items array.',
        },
        { status: 400 }
      );
    }
    if (itemsRaw.length < 3) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'MIN_ITEMS_COUNT',
          message: 'Deep enrichment requires at least 3 properties (same as the admin UI).',
        },
        { status: 400 }
      );
    }
    if (itemsRaw.length > 5) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'MAX_ITEMS_COUNT',
          message: 'Select at most 5 properties.',
        },
        { status: 400 }
      );
    }

    const items: DeepEnrichInput[] = [];
    for (const row of itemsRaw) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const name = typeof o.property_name === 'string' ? o.property_name.trim() : '';
      if (!name) continue;
      items.push({
        property_name: name,
        city: typeof o.city === 'string' ? o.city : undefined,
        state: typeof o.state === 'string' ? o.state : undefined,
        url: typeof o.url === 'string' ? o.url : null,
      });
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'NO_VALID_ITEMS',
          message: 'No items with a non-empty property_name.',
        },
        { status: 400 }
      );
    }
    if (items.length < 3) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'INSUFFICIENT_VALID_ITEMS',
          message: 'At least 3 properties with names are required.',
        },
        { status: 400 }
      );
    }

    const { correlationId, source: correlationSource } = resolveCompsV2EnrichCorrelationId(
      request.headers.get('x-correlation-id'),
      body.correlationId
    );
    if (correlationId) {
      console.log('[comps-v2/enrich-selection]', { correlationId, correlationSource });
    }

    const results = await enrichCompSelectionDeep(items, {
      userId: auth.session.user.id,
      userEmail: auth.session.user.email ?? null,
      correlationId,
      correlationSource,
    });
    return NextResponse.json({ success: true, results });
  } catch (e) {
    console.error('[comps-v2/enrich-selection]', e);
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL',
        message: e instanceof Error ? e.message : 'Enrichment failed',
      },
      { status: 500 }
    );
  }
});
