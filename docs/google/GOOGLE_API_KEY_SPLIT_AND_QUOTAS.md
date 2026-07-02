# Google API key split and GCP quotas

Operational guide to cap Google Places spend and separate browser vs server credentials.

## Why split keys?

| Key | Env var | Use in GCP restrictions |
|-----|---------|-------------------------|
| Browser | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | HTTP referrers only; Maps JavaScript API + Places Autocomplete (client) |
| Server | `GOOGLE_PLACES_SERVER_API_KEY` | IP restriction (Vercel) or none + API restriction; Places API (New), legacy Place Photo, Geocoding for server routes |

Server routes resolve the key via `lib/google-places-server-api-key.ts` (`GOOGLE_PLACES_SERVER_API_KEY` → `GOOGLE_MAPS_API_KEY` → public key fallback for local dev).

## GCP setup (one-time)

### 1. Create server key

1. Google Cloud Console → **APIs & Services** → **Credentials** → **Create credentials** → **API key**
2. Name: `Sage Places Server`
3. **Application restrictions:** IP addresses (add Vercel egress IPs if known) or none for serverless (rely on API + app guard)
4. **API restrictions:** Restrict key → enable only:
   - Places API (New)
   - Places API (Legacy) — if photo proxy uses legacy endpoint
   - Geocoding API — if server geocoding uses same key
5. Copy key → Vercel env `GOOGLE_PLACES_SERVER_API_KEY` (production + preview)

### 2. Lock browser key

1. Edit existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. **Application restrictions:** HTTP referrers:
   - `https://resources.sageoutdooradvisory.com/*`
   - `https://*.sageoutdooradvisory.com/*`
   - `http://localhost:3003/*` (dev port)
   - `https://*.vercel.app/*` (previews, optional)
3. **API restrictions:** Maps JavaScript API, Places API (for Autocomplete in `LocationSearch`)

### 3. Quotas and budgets

1. **Billing** → **Budgets & alerts** → create budget (e.g. $50/month) with email alerts at 50%, 90%, 100%
2. **APIs & Services** → **Places API** → **Quotas** → set per-day request caps on expensive SKUs (Text Search, Place Details, Photo Media) as a hard ceiling
3. Review **APIs & Services** → **Dashboard** weekly after deploy

## Vercel production checklist

Set in **Project → Environment Variables** (Production):

| Variable | Value |
|----------|--------|
| `PUBLIC_MAP_API_AUTO_BAN_ENABLED` | `true` |
| `PUBLIC_MAP_API_BYPASS_SECRET` | strong random secret |
| `CRON_SECRET` | strong random secret |
| `VERCEL_FIREWALL_API_TOKEN` | Vercel token with firewall scope |
| `VERCEL_PROJECT_ID` | project id |
| `VERCEL_TEAM_ID` | team id (if applicable) |
| `REDIS_URL` | Upstash/Redis for cross-instance rate limits |
| `GOOGLE_PLACES_SERVER_API_KEY` | server-restricted key |

**Firewall UI (not in `vercel.json`):**

1. **Firewall → Bot Protection** → **Active** (not Logging only)
2. Deny rules for known scraper UA (`OutReserveBot`) and IPs (see `docs/security/OUTRESERVE_SCRAPER_BLOCK_2026-06.md`)

## Verify

```bash
npm run verify:api-key
# Scripts/CI against production APIs:
curl -H "x-public-map-api-key: $PUBLIC_MAP_API_BYPASS_SECRET" \
  "https://resources.sageoutdooradvisory.com/api/google-places?propertyName=Test"
```

## Related code

- `lib/public-map-api-guard.ts` — origin + scraper blocklist
- `lib/public-map-api-rate-limit.ts` — per-IP limits including `/api/google-places-photo`
- `app/api/cron/ban-abusive-ips/route.ts` — promotes repeat offenders to Vercel Firewall
