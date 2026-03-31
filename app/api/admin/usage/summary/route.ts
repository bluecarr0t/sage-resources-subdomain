import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import type { AdminAuthContext } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface CompsV2UsageRunRow {
  created_at: string;
  route: string;
  tavily_queries_planned: number;
  tavily_queries_completed: number;
  tavily_raw_rows: number;
  firecrawl_attempted: number;
  firecrawl_enriched: number;
  web_geocode_attempts: number;
  web_geocode_hits: number;
  google_geocode_calls: number;
  nominatim_geocode_calls: number;
}

interface AdminAiUsageEventRow {
  created_at: string;
  feature: string;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  request_meta: unknown;
}

function parseRequestMetaTask(meta: unknown): {
  task: string | null;
  propertyName: string | null;
  latencyMs: number | null;
} {
  if (!meta || typeof meta !== 'object') {
    return { task: null, propertyName: null, latencyMs: null };
  }
  const m = meta as Record<string, unknown>;
  return {
    task: typeof m.task === 'string' ? m.task : null,
    propertyName: typeof m.property_name === 'string' ? m.property_name : null,
    latencyMs: typeof m.latency_ms === 'number' && Number.isFinite(m.latency_ms) ? m.latency_ms : null,
  };
}

function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function parseRange(searchParams: URLSearchParams): { fromIso: string; toIso: string } | null {
  const toParam = searchParams.get('to');
  const fromParam = searchParams.get('from');
  const now = new Date();
  const toDate = toParam ? new Date(`${toParam}T23:59:59.999Z`) : now;
  let fromDate: Date;
  if (fromParam) {
    fromDate = new Date(`${fromParam}T00:00:00.000Z`);
  } else {
    fromDate = new Date(toDate);
    fromDate.setUTCDate(fromDate.getUTCDate() - 30);
    fromDate.setUTCHours(0, 0, 0, 0);
  }
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
    return null;
  }
  return { fromIso: fromDate.toISOString(), toIso: toDate.toISOString() };
}

function emptyCompsTotals() {
  return {
    runCount: 0,
    tavily_queries_planned: 0,
    tavily_queries_completed: 0,
    tavily_raw_rows: 0,
    firecrawl_attempted: 0,
    firecrawl_enriched: 0,
    web_geocode_attempts: 0,
    web_geocode_hits: 0,
    google_geocode_calls: 0,
    nominatim_geocode_calls: 0,
    searchRuns: 0,
    gapFillRuns: 0,
  };
}

function addCompsTotals(acc: ReturnType<typeof emptyCompsTotals>, row: CompsV2UsageRunRow) {
  acc.runCount += 1;
  if (row.route === 'search') acc.searchRuns += 1;
  if (row.route === 'gap_fill') acc.gapFillRuns += 1;
  acc.tavily_queries_planned += row.tavily_queries_planned ?? 0;
  acc.tavily_queries_completed += row.tavily_queries_completed ?? 0;
  acc.tavily_raw_rows += row.tavily_raw_rows ?? 0;
  acc.firecrawl_attempted += row.firecrawl_attempted ?? 0;
  acc.firecrawl_enriched += row.firecrawl_enriched ?? 0;
  acc.web_geocode_attempts += row.web_geocode_attempts ?? 0;
  acc.web_geocode_hits += row.web_geocode_hits ?? 0;
  acc.google_geocode_calls += row.google_geocode_calls ?? 0;
  acc.nominatim_geocode_calls += row.nominatim_geocode_calls ?? 0;
}

export const GET = withAdminAuth(async (request: NextRequest, _auth: AdminAuthContext) => {
  const range = parseRange(new URL(request.url).searchParams);
  if (!range) {
    return NextResponse.json({ error: 'Invalid from/to date range' }, { status: 400 });
  }

  const featureFilter = new URL(request.url).searchParams.get('feature')?.trim() || null;

  const supabase = createServerClient();

  const [runsRes, aiRes] = await Promise.all([
    supabase
      .from('comps_v2_usage_runs' as never)
      .select(
        'created_at,route,tavily_queries_planned,tavily_queries_completed,tavily_raw_rows,firecrawl_attempted,firecrawl_enriched,web_geocode_attempts,web_geocode_hits,google_geocode_calls,nominatim_geocode_calls'
      )
      .gte('created_at', range.fromIso)
      .lte('created_at', range.toIso),
    supabase
      .from('admin_ai_usage_events' as never)
      .select('created_at,feature,provider,model,input_tokens,output_tokens,total_tokens,request_meta')
      .gte('created_at', range.fromIso)
      .lte('created_at', range.toIso),
  ]);

  const runs = (runsRes.data ?? []) as CompsV2UsageRunRow[];
  let aiEvents = (aiRes.data ?? []) as AdminAiUsageEventRow[];

  if (runsRes.error) {
    console.error('[api/admin/usage/summary] comps_v2_usage_runs', runsRes.error);
  }
  if (aiRes.error) {
    console.error('[api/admin/usage/summary] admin_ai_usage_events', aiRes.error);
  }

  if (featureFilter) {
    aiEvents = aiEvents.filter((e) => e.feature === featureFilter);
  }

  const compsTotals = emptyCompsTotals();
  const compsByDay = new Map<string, ReturnType<typeof emptyCompsTotals>>();

  for (const row of runs) {
    addCompsTotals(compsTotals, row);
    const day = utcDayKey(row.created_at);
    if (!compsByDay.has(day)) compsByDay.set(day, emptyCompsTotals());
    addCompsTotals(compsByDay.get(day)!, row);
  }

  const aiTotals = {
    eventCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  const aiByDay = new Map<
    string,
    { eventCount: number; inputTokens: number; outputTokens: number; totalTokens: number }
  >();
  const aiByFeature = new Map<
    string,
    { eventCount: number; inputTokens: number; outputTokens: number; totalTokens: number }
  >();

  for (const e of aiEvents) {
    aiTotals.eventCount += 1;
    const inT = e.input_tokens ?? 0;
    const outT = e.output_tokens ?? 0;
    const totT = e.total_tokens ?? 0;
    aiTotals.inputTokens += inT;
    aiTotals.outputTokens += outT;
    aiTotals.totalTokens += totT;

    const day = utcDayKey(e.created_at);
    if (!aiByDay.has(day)) {
      aiByDay.set(day, { eventCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    }
    const d = aiByDay.get(day)!;
    d.eventCount += 1;
    d.inputTokens += inT;
    d.outputTokens += outT;
    d.totalTokens += totT;

    if (!aiByFeature.has(e.feature)) {
      aiByFeature.set(e.feature, { eventCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    }
    const f = aiByFeature.get(e.feature)!;
    f.eventCount += 1;
    f.inputTokens += inT;
    f.outputTokens += outT;
    f.totalTokens += totT;
  }

  const compsByDaySorted = [...compsByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({ date, ...totals }));

  const aiByDaySorted = [...aiByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => ({ date, ...totals }));

  const aiByFeatureObj = Object.fromEntries(aiByFeature.entries());

  const aiSorted = [...aiEvents].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const recentAiEvents = aiSorted.slice(0, 100).map((e) => {
    const meta = parseRequestMetaTask(e.request_meta);
    return {
      created_at: e.created_at,
      feature: e.feature,
      provider: e.provider,
      model: e.model,
      input_tokens: e.input_tokens,
      output_tokens: e.output_tokens,
      total_tokens: e.total_tokens,
      task: meta.task,
      propertyName: meta.propertyName,
      latencyMs: meta.latencyMs,
    };
  });

  return NextResponse.json({
    range: { from: range.fromIso, to: range.toIso },
    warnings: {
      compsRunsLoadFailed: Boolean(runsRes.error),
      aiEventsLoadFailed: Boolean(aiRes.error),
    },
    compsV2: {
      totals: compsTotals,
      byDay: compsByDaySorted,
    },
    adminAi: {
      totals: aiTotals,
      byDay: aiByDaySorted,
      byFeature: aiByFeatureObj,
      recentEvents: recentAiEvents,
    },
  });
});
