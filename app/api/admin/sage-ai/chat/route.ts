/**
 * API Route: Sage AI Chat
 * POST /api/admin/sage-ai/chat
 *
 * Streaming chat endpoint using Vercel AI Gateway with read-only Supabase tools.
 * Traffic is attributed to the sage-resources-subdomain Vercel project (OIDC on Vercel,
 * optional AI_GATEWAY_API_KEY locally) with dashboard tags and app attribution headers.
 * Requires admin authentication. Logs usage to admin_ai_usage_events.
 */

import { streamText, convertToModelMessages, stepCountIs, gateway } from 'ai';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { getManagedUser } from '@/lib/auth-helpers';
import { normalizeManagedUserRole } from '@/lib/managed-user-roles';
import { createSageAiTools } from '@/lib/sage-ai/tools';
import { logSageAiUsage } from '@/lib/sage-ai/log-usage';
import {
  buildSageAiGatewayHeaders,
  buildSageAiGatewayTags,
} from '@/lib/sage-ai/vercel-ai-gateway';
import { resolveChatModelForTurn } from '@/lib/sage-ai/resolve-chat-model';
import { limit as redisLimit, getRedis, enforceDailyQuota } from '@/lib/upstash';
import { compactMessages } from '@/lib/sage-ai/compact-messages';
import { sanitizeUiMessagesForModel, sanitizeModelMessagesForProvider } from '@/lib/sage-ai/sanitize-ui-messages-for-model';
import {
  injectThreadSummary,
  loadThreadSummaryForSession,
} from '@/lib/sage-ai/thread-summary';
import { buildSageAiSystemPrompt } from '@/lib/sage-ai/system-prompt';
import {
  getSageAiChatMaxDuration,
  getSageAiChatMaxSteps,
} from '@/lib/sage-ai/chat-limits';
import { isValidSageUuid, sageMessageSchema } from '@/lib/sage-ai/route-schemas';

export const dynamic = 'force-dynamic';
export const maxDuration = getSageAiChatMaxDuration();

const MAX_OUTPUT_TOKENS = 8_192;

/**
 * Caps on incoming chat payload size. The model itself enforces a context
 * window, but a malicious client can still ship 10s of MB of messages just to
 * tie up the route + AI Gateway. These limits reject obvious abuse before we
 * spend any cycles on `convertToModelMessages` / `compactMessages`.
 */
const MAX_INCOMING_MESSAGES = 200;
/** Raw POST body cap before JSON parse. Tool-heavy threads exceed 1MB easily; compacted after parse. Override with SAGE_AI_MAX_INCOMING_BODY_BYTES (capped at 10MB). */
const MAX_INCOMING_BODY_BYTES = (() => {
  const env = process.env.SAGE_AI_MAX_INCOMING_BODY_BYTES;
  const raw =
    env != null && env !== ''
      ? Number(env.replace(/_/g, ''))
      : 4_000_000;
  if (!Number.isFinite(raw) || raw <= 0) return 4_000_000;
  return Math.min(Math.floor(raw), 10_000_000);
})();

/** Per-user chat request cap (default 30 req / 5 min, env-overridable). */
const CHAT_RATE_LIMIT = Number(process.env.SAGE_AI_CHAT_RATE_LIMIT ?? 30);
const CHAT_RATE_WINDOW = (process.env.SAGE_AI_CHAT_RATE_WINDOW ?? '5 m') as `${number} ${'s' | 'm' | 'h' | 'd'}`;

/**
 * Per-user daily turn budget. The sliding window above bounds burst rate; this
 * bounds sustained daily spend (the sliding window resets every 5 min, so a
 * determined user could otherwise run thousands of paid turns/day). Default
 * 500 turns/day; set SAGE_AI_CHAT_DAILY_TURNS=0 to disable.
 */
const CHAT_DAILY_TURN_BUDGET = (() => {
  const raw = process.env.SAGE_AI_CHAT_DAILY_TURNS;
  if (raw == null || raw === '') return 500;
  const n = Number(raw.replace(/_/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 500;
})();

export async function POST(request: Request) {
  const startTime = Date.now();

  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  // Read raw bytes first so we can reject oversized payloads cheaply, before
  // JSON parse forces the entire string into V8.
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_INCOMING_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request body too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (rawBody.length > MAX_INCOMING_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request body too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    id?: string;
    messages?: unknown;
    model?: unknown;
    webResearch?: unknown;
    sessionId?: unknown;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: 'messages must be an array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (body.messages.length > MAX_INCOMING_MESSAGES) {
    return new Response(
      JSON.stringify({
        error: `Too many messages (max ${MAX_INCOMING_MESSAGES}). Start a new chat to continue.`,
      }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // Structurally validate each message envelope (role + optional id/content/
  // parts) WITHOUT reserializing — `body.messages` stays the original UIMessage
  // objects so convertToModelMessages/compactMessages keep every SDK field.
  for (const m of body.messages) {
    if (!sageMessageSchema.safeParse(m).success) {
      return new Response(
        JSON.stringify({ error: 'Each message must have a valid role and shape.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  // sessionId (when present) is a UUID used for usage attribution; reject a
  // malformed non-empty value rather than silently polluting per-session usage.
  if (
    body.sessionId != null &&
    body.sessionId !== '' &&
    !isValidSageUuid(body.sessionId)
  ) {
    return new Response(
      JSON.stringify({ error: 'Invalid sessionId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rl = await redisLimit(
    'chat',
    authResult.session.user.id,
    CHAT_RATE_LIMIT,
    CHAT_RATE_WINDOW
  );
  if (!rl.success) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rl.reset - Date.now()) / 1000)
    );
    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please slow down and retry shortly.',
        limit: rl.limit,
        remaining: rl.remaining,
        reset: rl.reset,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset': String(rl.reset),
        },
      }
    );
  }

  if (CHAT_DAILY_TURN_BUDGET > 0) {
    const daily = await enforceDailyQuota(
      'chat_daily_turns',
      authResult.session.user.id,
      CHAT_DAILY_TURN_BUDGET
    );
    if (!daily.allowed) {
      return new Response(
        JSON.stringify({
          error: `Daily chat limit reached (${daily.used} of ${daily.quota}). Resets at 00:00 UTC. Ask an admin to raise SAGE_AI_CHAT_DAILY_TURNS if you need more.`,
          used: daily.used,
          quota: daily.quota,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const messages = body.messages;
  /** Server env + explicit client opt-in — ignores forged requests when env is off. */
  const webResearchEnabled =
    process.env.SAGE_AI_WEB_RESEARCH_ENABLED === 'true' && body.webResearch === true;

  const modelResolved = resolveChatModelForTurn({
    requestedModel: body.model,
    messages,
    webResearchEnabled,
  });
  if (!modelResolved.ok) {
    return new Response(JSON.stringify({ error: modelResolved.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const modelId = modelResolved.modelId;

  const correlationId = crypto.randomUUID();
  const chatId = typeof body.id === 'string' && body.id ? body.id : correlationId;
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.length > 0
      ? body.sessionId
      : null;
  const parseEnvPositiveInt = (name: string, fallback: number): number => {
    const raw = process.env[name]?.replace(/_/g, '');
    if (raw == null || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  const sageAiCompactOpts = {
    hardPayloadCharCap: parseEnvPositiveInt('SAGE_AI_COMPACT_HARD_CHAR_CAP', 160_000),
    maxRowsPerToolResultRecent: parseEnvPositiveInt('SAGE_AI_COMPACT_RECENT_ROWS', 16),
    charBudget: parseEnvPositiveInt('SAGE_AI_COMPACT_CHAR_BUDGET', 100_000),
  };
  const geoToolsEnabled = process.env.SAGE_AI_GEO_TOOLS === 'true';
  const semanticSearchEnabled =
    process.env.SAGE_AI_SEMANTIC_SEARCH === 'true';
  const composedToolsEnabled =
    process.env.SAGE_AI_COMPOSED_TOOLS === 'true';
  const visualizationToolsEnabled =
    process.env.SAGE_AI_VISUALIZATION_TOOLS === 'true';
  // Only fetch the managed-users row when composed tools are on, since the
  // only consumer today is build_feasibility_brief's admin gate.
  const managed = composedToolsEnabled
    ? await getManagedUser(authResult.session.user.id)
    : null;
  const tools = createSageAiTools(authResult.supabase, {
    userId: authResult.session.user.id,
    userRole: managed ? normalizeManagedUserRole(managed.role) : null,
    correlationId,
    sessionId,
    webResearchEnabled,
    geoToolsEnabled,
    semanticSearchEnabled,
    composedToolsEnabled,
    visualizationToolsEnabled,
  });
  const systemPrompt = buildSageAiSystemPrompt({
    webResearchEnabled,
    geoToolsEnabled,
    semanticSearchEnabled,
    composedToolsEnabled,
    visualizationToolsEnabled,
  });

  let messagesForModel = messages;
  if (sessionId) {
    const threadSummary = await loadThreadSummaryForSession(
      authResult.supabase,
      sessionId,
      authResult.session.user.id
    );
    if (threadSummary) {
      messagesForModel = injectThreadSummary(messages, threadSummary);
    }
  }

  // Convert (and compact) up front so a malformed client payload becomes a
  // clean 400 instead of an unhandled throw inside streamText (which would
  // surface as a 500 with a stack trace and leave the stream marker dangling).
  let modelMessages;
  try {
    modelMessages = sanitizeModelMessagesForProvider(
      await convertToModelMessages(
        compactMessages(
          sanitizeUiMessagesForModel(messagesForModel),
          sageAiCompactOpts
        )
      )
    );
  } catch (err) {
    console.error('[sage-ai/chat] Failed to convert messages', {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response(
      JSON.stringify({ error: 'Invalid message format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Record an "active stream" marker so the resume endpoint can decide whether
  // to attempt reconnection. Best-effort; Redis outages are non-fatal.
  const redis = getRedis();
  const streamMarkerKey = `sage_ai:stream:${chatId}`;
  const clearStreamMarker = async () => {
    if (!redis) return;
    try {
      await redis.del(streamMarkerKey);
    } catch (err) {
      console.warn('[sage-ai/chat] Failed to clear active stream marker', err);
    }
  };
  if (redis) {
    try {
      await redis.set(
        streamMarkerKey,
        JSON.stringify({
          userId: authResult.session.user.id,
          correlationId,
          startedAt: startTime,
        }),
        { ex: 15 * 60 }
      );
    } catch (err) {
      console.warn('[sage-ai/chat] Failed to mark active stream', err);
    }
  }

  const result = streamText({
    model: gateway(modelId),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    headers: buildSageAiGatewayHeaders(),
    // Propagate client disconnects (browser tab closed, "Stop" button pressed,
    // network drop) all the way down to the gateway and tool fetches. Without
    // this the LLM keeps streaming tokens we'll never read while still costing
    // the user — a big deal for the multi-step / long-running cases.
    abortSignal: request.signal,
    providerOptions: {
      gateway: {
        user: authResult.session.user.id,
        tags: [...buildSageAiGatewayTags(), `sage_ai_model:${modelId.replace(/\//g, '_')}`],
      },
    },
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(getSageAiChatMaxSteps()),
    onError(error) {
      console.error('[sage-ai/chat] streamText error', {
        correlationId,
        userId: authResult.session.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Errored/aborted streams must release the marker too, otherwise the
      // resume endpoint reports a stale "active" stream for up to 15 min.
      void clearStreamMarker();
      void logSageAiUsage({
        userId: authResult.session.user.id,
        userEmail: authResult.session.user.email ?? null,
        model: modelId,
        provider: 'vercel_ai_gateway',
        usage: null,
        latencyMs: Date.now() - startTime,
        messageCount: messages.length,
        toolCallCount: 0,
        correlationId,
        sessionId,
        errorCode:
          error instanceof Error ? error.name || 'stream_error' : 'stream_error',
      });
    },
    async onFinish({ usage, steps }) {
      const latencyMs = Date.now() - startTime;
      const toolCallCount = steps?.reduce(
        (count, step) => count + (step.toolCalls?.length ?? 0),
        0
      ) ?? 0;

      await clearStreamMarker();

      await logSageAiUsage({
        userId: authResult.session.user.id,
        userEmail: authResult.session.user.email ?? null,
        model: modelId,
        provider: 'vercel_ai_gateway',
        usage: usage ? {
          promptTokens: usage.inputTokens,
          completionTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        } : null,
        latencyMs,
        messageCount: messages.length,
        toolCallCount,
        correlationId,
        sessionId,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
