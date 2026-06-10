# Sage AI (`/admin/sage-ai`)

Internal admin chat for glamping market research. Data comes from Supabase (`all_glamping_properties`, reports, optional RIDB) plus optional web tools. Access requires admin auth (`requireAdminAuth`) and a row in `managed_users`.

## Operator checklist

1. Confirm the user can sign in at `/login` and appears in `managed_users`.
2. Set required env vars in Vercel (see below). Redeploy after changing flags.
3. Open `/admin/sage-ai` and expand the **capabilities** banner if any features show as off.
4. For web research: enable **both** `SAGE_AI_WEB_RESEARCH_ENABLED=true` and the composer toggle (UI is always visible; server ignores requests when env is off).
5. Sessions auto-save ~2s after a turn completes; history is per-user (max 50 listed).

## Feature flags (server)

All default **off** unless set to `true` in the deployment environment.

| Variable | Effect |
|----------|--------|
| `SAGE_AI_VISUALIZATION_TOOLS` | Canvas dashboards and map tools (preferred over Python charts). |
| `SAGE_AI_GEO_TOOLS` | Geocoding / geo helpers. |
| `SAGE_AI_SEMANTIC_SEARCH` | Semantic property search tool. |
| `SAGE_AI_COMPOSED_TOOLS` | Multi-step tools (competitor compare, feasibility brief sections). Requires appropriate `managed_users.role` for some tools. |
| `SAGE_AI_WEB_RESEARCH_ENABLED` | Tavily search + Firecrawl scrape/crawl when the user enables **Web Research** in the composer. |

The UI loads live capability state from `GET /api/admin/sage-ai/capabilities` (admin auth required).

## Tool quotas (optional overrides)

Defaults are defined in `lib/sage-ai/tools.ts`, `semantic-tools.ts`, `composed-tools.ts`, and `geo-tools.ts`. Examples:

- `SAGE_AI_QUOTA_WEB_SEARCH` (default 100)
- `SAGE_AI_QUOTA_SCRAPE` (default 50)
- `SAGE_AI_QUOTA_CRAWL` (default 5)
- `SAGE_AI_QUOTA_GOOGLE_PLACES` (default 200)
- `SAGE_AI_QUOTA_GEOCODE` (default 300)
- `SAGE_AI_QUOTA_SEMANTIC_SEARCH` (default 100)
- `SAGE_AI_QUOTA_COMPETITOR_COMPARE` (default 20)
- `SAGE_AI_QUOTA_FEASIBILITY_BRIEF` (default 10)

## Stream resume (intentionally disabled)

The chat route may mark an in-flight stream in Redis (`sage_ai:stream:{chatId}`), and `GET /api/admin/sage-ai/chat/[id]/resume` currently returns a JSON marker only — **no SSE replay**.

Client reconnect is disabled via `SAGE_AI_CLIENT_STREAM_RESUME_ENABLED` in `lib/sage-ai/server-capabilities.ts` (default `false`). Do not enable until resumable streams are implemented end-to-end.

**Why:** Calling `resumeStream()` on every transport id change caused render loops; probing resume without replay adds noise and failed requests.

## Session persistence

- **List:** `GET /api/admin/sage-ai/sessions` (50 most recent).
- **Save:** `POST /api/admin/sage-ai/sessions` with `{ id?, messages }`.
- **Load:** `GET /api/admin/sage-ai/sessions/[id]`.
- **Rename:** `PATCH /api/admin/sage-ai/sessions/[id]` with `{ title }` (max 200 chars).
- **Delete one / all:** `DELETE` on session routes.
- **Deep link:** `/admin/sage-ai?session=<uuid>` loads that conversation (shareable among admins who own the row).

Loading a session hydrates `useChat` messages but **does not** change the chat transport id (see comments in `SageAiClient` / `useSageAiSessions`) so history is not wiped by SDK re-init.

## Per-thread token usage

Chat requests may send `sessionId` in the POST body. Successful turns log to `admin_ai_usage_events` with `request_meta.session_id`.

- **UI:** composer footer shows last turn + thread totals via `GET /api/admin/sage-ai/sessions/[id]/usage`.
- **Note:** the first turn in a brand-new chat may log before the session row exists (no `sessionId` yet); usage appears from the second turn onward after auto-save assigns an id.

In-app ops doc: `/admin/sage-ai/docs` (renders this file).

## Rate limits and limits

- Chat body size and message count are enforced in `app/api/admin/sage-ai/chat/route.ts`.
- Redis rate limiting applies per admin user (see route implementation).
- `maxDuration` defaults to **120s** (`SAGE_AI_MAX_DURATION`); tool steps default to **10** (`SAGE_AI_MAX_STEPS`, max 20). Long multi-tool turns may still hit the limit — the UI shows a timeout toast.
- System prompts are built in `lib/sage-ai/system-prompt.ts`: optional sections (geo, semantic, composed, web, canvas) are **omitted** when env flags are off to reduce tokens per turn.

## Related code

| Area | Path |
|------|------|
| Chat API | `app/api/admin/sage-ai/chat/route.ts` |
| Tools | `lib/sage-ai/tools.ts` |
| Capabilities | `lib/sage-ai/server-capabilities.ts` |
| Client | `app/admin/sage-ai/SageAiClient.tsx` |
| Sessions hook | `app/admin/sage-ai/useSageAiSessions.ts` |
| Tests | `__tests__/lib/sage-ai/` |

## Market report handoff

Opening Sage AI from a market report uses `?from=market-report` and session storage bootstrap (`lib/sage-ai/market-report-bootstrap.ts`). The query param is stripped after consume.
