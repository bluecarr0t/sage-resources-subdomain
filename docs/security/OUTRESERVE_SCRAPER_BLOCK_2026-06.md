# OutReserve scraper block (Jun 2026)

## Incident summary

- **User-Agent:** `Mozilla/5.0 (compatible; OutReserveBot/1.0)` (~5.4k requests)
- **IP:** `212.83.77.168` (Netherlands)
- **Targets:** `GET /api/properties`, `GET /api/google-places`, `GET /api/google-places-photo` (structured data + Google Places billing)

### Additional blocked crawlers

- **PetalBot** (Huawei Clouds, IP range `114.119.x.x`) — added to the default UA
  blocklist after appearing in Vercel Firewall traffic (Jun 4 2026). Crawler,
  not a targeted API scrape, but blocked from the public map APIs anyway.

## Code protections (deployed with app)

| Layer | Location |
|-------|----------|
| Blocklist (UA + IP) + origin guard | `lib/public-map-api-guard.ts` (header/env only, Edge-safe) |
| Middleware (early 403) | `middleware.ts` runs the guard on `/api/properties`, `/api/google-places`, `/api/google-places-photo` |
| Per-IP rate limits | `lib/public-map-api-rate-limit.ts`, called from the **route handlers** (Node runtime — Redis is not available in Edge middleware) |

> Note: rate limiting must NOT run in `middleware.ts`. Middleware uses the Edge
> runtime, and `lib/redis.ts` imports Node-only modules (`redis`, `crypto`,
> `zlib`). Importing it into middleware causes `MIDDLEWARE_INVOCATION_FAILED`
> and 500s the whole site.

### Per-IP rate limits (defaults)

Counts are **shared** across `/api/properties`, `/api/google-places`, and `/api/google-places-photo` so scrapers cannot multiply throughput by alternating paths.

| Bucket | Default | Env override |
|--------|---------|----------------|
| All public map APIs | 60 / minute / IP | `PUBLIC_MAP_API_RATELIMIT_PER_MIN` |
| All public map APIs | 300 / hour / IP | `PUBLIC_MAP_API_RATELIMIT_PER_HOUR` |
| Google Places JSON | 30 / minute / IP (additional) | `GOOGLE_PLACES_PUBLIC_ROUTE_RATELIMIT_PER_MIN` |
| Google Places photos | 40 / minute / IP (additional) | `GOOGLE_PLACES_PHOTO_ROUTE_RATELIMIT_PER_MIN` |

Uses **Redis** when `REDIS_URL` (or `REDIS_HOST`) is configured so limits apply across all Vercel instances; otherwise falls back to in-memory per instance.

Trusted bypass headers skip rate limits (same as origin bypass).

### Environment variables

| Variable | Purpose |
|----------|---------|
| `PUBLIC_MAP_API_BYPASS_SECRET` | Optional. Set on Vercel + pass as `x-public-map-api-key` for scripts/CI |
| `PUBLIC_MAP_API_GUARD_DISABLED` | `true` only for local debugging — never in production |
| `PUBLIC_MAP_API_BLOCK_UA_SUBSTRINGS` | Comma-separated extra UA substrings to block |
| `PUBLIC_MAP_API_BLOCK_IPS` | Comma-separated extra IPs to block |
| `PUBLIC_MAP_API_ALLOWED_ORIGINS` | Comma-separated extra allowed origins (preview hosts) |
| `PUBLIC_MAP_API_RATELIMIT_PER_MIN` | Combined minute cap (default `60`) |
| `PUBLIC_MAP_API_RATELIMIT_PER_HOUR` | Combined hour cap (default `300`) |
| `GOOGLE_PLACES_PUBLIC_ROUTE_RATELIMIT_PER_MIN` | Extra Google Places JSON minute cap (default `30`) |
| `GOOGLE_PLACES_PHOTO_ROUTE_RATELIMIT_PER_MIN` | Extra photo proxy minute cap (default `40`) |
| `PUBLIC_MAP_API_AUTO_BAN_ENABLED` | `true` in production — enables `/api/cron/ban-abusive-ips` firewall writes |

Legitimate browser traffic from the map must send an **Origin** or **Referer** from `resources.sageoutdooradvisory.com` (or `SITE_URL` / `VERCEL_URL` on previews).

## Vercel dashboard (do immediately)

These settings are **not** fully expressible in `vercel.json` for this project; configure in the Vercel project UI.

### 1. Firewall — deny IP

1. Project → **Firewall** → **Rules** → **Add rule**
2. **Condition:** IP address equals `212.83.77.168`
3. **Action:** Deny
4. Save and deploy

### 2. Firewall — deny user agent

1. **Add rule**
2. **Condition:** User-Agent contains `OutReserveBot` (or `OutReserve`)
3. **Action:** Deny

### 3. Bot Protection — blocking mode

1. Project → **Firewall** → **Bot Protection**
2. Change from **Logging** to **Active** (block verified bots)
3. Enable **BotID Deep Analysis** if available on your plan

### 4. Optional: rate limit rule at edge

Add a firewall rate-limit rule on paths `/api/properties`, `/api/google-places`, and `/api/google-places-photo` as defense in depth (app already rate-limits per IP).

## Verification

```bash
# Should 403 (no Origin)
curl -sI "https://resources.sageoutdooradvisory.com/api/properties" | head -1

# Should 403 (blocked UA)
curl -sI -A "OutReserveBot/1.0" \
  -H "Origin: https://resources.sageoutdooradvisory.com" \
  "https://resources.sageoutdooradvisory.com/api/properties" | head -1

# Scripts: use bypass header after setting PUBLIC_MAP_API_BYPASS_SECRET in Vercel
curl -sI -H "x-public-map-api-key: YOUR_SECRET" \
  "https://resources.sageoutdooradvisory.com/api/properties?fields=id" | head -1
```

## Automatic IP banning (opt-in)

Repeat abusers can be promoted to the **Vercel Firewall IP block list** with no
manual intervention.

### How it works

1. The per-IP rate limiter records each 429 as an "offense" in Redis
   (`lib/public-map-api-abuse.ts`).
2. Once an IP exceeds `PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD` offenses within 1h, it
   is added to a Redis candidate set.
3. The cron `/api/cron/ban-abusive-ips` (every 10 min) drains the candidate set
   and submits each IP to the Vercel Firewall via the REST API
   (`ip.insert`, action `deny`, `hostname: *`) — `lib/vercel-firewall.ts`.
4. Each IP is claimed atomically (Redis `SET NX`) so it is submitted only once,
   capped at 25 bans/run.

The hot request path only does a cheap Redis `INCR`; the slower Vercel API calls
happen in the cron, off the request path.

### Setup (all required for auto-ban)

| Variable | Purpose |
|----------|---------|
| `PUBLIC_MAP_API_AUTO_BAN_ENABLED` | `true` to enable (master switch; default off) |
| `PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD` | Offenses within 1h before queuing a ban (default `10`) |
| `VERCEL_FIREWALL_API_TOKEN` | Vercel API token with firewall write access (or reuse `VERCEL_TOKEN`) |
| `VERCEL_PROJECT_ID` | Target project |
| `VERCEL_TEAM_ID` | Required for team-scoped projects |
| `CRON_SECRET` | Authorizes the cron route |
| Redis (`REDIS_URL`/`REDIS_HOST`) | Required to track offenses across instances |

Create the token at **Vercel → Account Settings → Tokens**. Find project/team IDs
under **Project → Settings → General** (or run `vercel project ls`).

### Operating notes

- **Disabled by default.** With `PUBLIC_MAP_API_AUTO_BAN_ENABLED` unset, the cron
  returns `{ enabled: false }` and bans nothing.
- Banned IPs appear in **Firewall → IP Blocking** with an `Auto-banned: ...` note.
- To unban: remove the IP in the Vercel dashboard, and delete the Redis key
  `public_map_api:abuse:banned:<ip>` so it isn't re-submitted.
- Manual trigger / dry-run:
  ```bash
  curl -s -H "Authorization: Bearer $CRON_SECRET" \
    https://resources.sageoutdooradvisory.com/api/cron/ban-abusive-ips | jq
  ```

## Follow-up

- Preserve access logs / Vercel observability exports for potential ToS review
- Rotate `PUBLIC_MAP_API_BYPASS_SECRET` if shared widely
- Monitor Google Cloud Places quota after deploy
