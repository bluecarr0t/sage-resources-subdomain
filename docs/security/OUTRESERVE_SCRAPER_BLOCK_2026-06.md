# OutReserve scraper block (Jun 2026)

## Incident summary

- **User-Agent:** `Mozilla/5.0 (compatible; OutReserveBot/1.0)` (~5.4k requests)
- **IP:** `212.83.77.168` (Netherlands)
- **Targets:** `GET /api/properties`, `GET /api/google-places` (structured data + Google Places billing)

## Code protections (deployed with app)

| Layer | Location |
|-------|----------|
| Blocklist (UA + IP) | `lib/public-map-api-guard.ts` |
| Middleware (early 403) | `middleware.ts` for `/api/properties`, `/api/google-places` |
| Route handlers | Same guard + rate limits on both routes |

### Environment variables

| Variable | Purpose |
|----------|---------|
| `PUBLIC_MAP_API_BYPASS_SECRET` | Optional. Set on Vercel + pass as `x-public-map-api-key` for scripts/CI |
| `PUBLIC_MAP_API_GUARD_DISABLED` | `true` only for local debugging — never in production |
| `PUBLIC_MAP_API_BLOCK_UA_SUBSTRINGS` | Comma-separated extra UA substrings to block |
| `PUBLIC_MAP_API_BLOCK_IPS` | Comma-separated extra IPs to block |
| `PUBLIC_MAP_API_ALLOWED_ORIGINS` | Comma-separated extra allowed origins (preview hosts) |
| `PROPERTIES_PUBLIC_ROUTE_RATELIMIT_PER_MIN` | Default `90` requests/min/IP for `/api/properties` |

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

Add a firewall rate-limit rule on paths `/api/properties` and `/api/google-places` as defense in depth (app already rate-limits per IP).

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

## Follow-up

- Preserve access logs / Vercel observability exports for potential ToS review
- Rotate `PUBLIC_MAP_API_BYPASS_SECRET` if shared widely
- Monitor Google Cloud Places quota after deploy
