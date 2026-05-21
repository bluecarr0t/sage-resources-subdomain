# Phase 0 — SEO Instrumentation (Week 1)

Operational runbook for measuring organic traffic on `resources.sageoutdooradvisory.com` before Phase 1 technical work.

**Last updated:** May 2026

---

## Quick start

```bash
# Automated checks (production URLs + local env)
npm run seo:audit-instrumentation

# Save first baseline snapshot
npm run seo:audit-instrumentation:baseline

# Live JSON report (after deploy)
curl -s https://resources.sageoutdooradvisory.com/api/seo/instrumentation | jq .
```

Exit code `0` = all required checks pass; `1` = fix blockers listed in output.

---

## 1. Environment variables (Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Yes | GA4 property for subdomain |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE` | Yes* | GSC HTML-tag verification |
| `INDEXNOW_KEY` | Yes | Bing/Yandex fast indexing |
| `CRON_SECRET` | Recommended | Secures daily IndexNow cron |
| `SITE_URL` | Optional | Defaults to `https://resources.sageoutdooradvisory.com` |

\* Alternatively use the HTML file in `public/google*.html` (already present: `googleb0db5a8d66acbfa9.html`).

Template: [ENV.example](./ENV.example)

### IndexNow key

```bash
openssl rand -hex 16
```

Add to Vercel → redeploy. Prebuild writes `public/{INDEXNOW_KEY}.txt`. Cron runs daily (`vercel.json` → `/api/indexnow` at 06:00 UTC).

---

## 2. Google Search Console

### Property setup

1. Open [Google Search Console](https://search.google.com/search-console)
2. Add property: **URL prefix** → `https://resources.sageoutdooradvisory.com`
3. Verify via **HTML tag** (`NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE`) or existing `googleb0db5a8d66acbfa9.html`
4. **Sitemaps** → Submit: `https://resources.sageoutdooradvisory.com/sitemap.xml`

### Week 1 exports (baseline)

Save these on Day 1 and weekly thereafter:

| Export | Path in GSC | Filename suggestion |
|--------|-------------|---------------------|
| Performance (28 days) | Performance → Search results → Export | `gsc-performance-YYYY-MM-DD.csv` |
| Pages | Performance → Pages → Export | `gsc-pages-YYYY-MM-DD.csv` |
| Indexing | Indexing → Pages | Note "Indexed" vs "Not indexed" counts |
| Sitemaps | Sitemaps | Screenshot or note "Success" / errors |

Store exports in a shared drive or `docs/seo/baselines/gsc/` (gitignored if large).

### Segment by site area (GSC regex)

Use **Page** filter in Performance:

| Section | URL contains regex |
|---------|-------------------|
| Landing | `/landing/` |
| Guides | `/guides/` |
| Glossary | `/glossary/` |
| Properties | `/property/` |
| Map | `/map` |
| Glamping hubs | `/glamping/` |

---

## 3. Google Analytics 4

### Property

- Use the same GA4 property as the root site **or** a dedicated subdomain property (either works with cross-domain linker already in `components/GoogleAnalytics.tsx`).
- Confirm realtime shows traffic on `/en/map` after deploy.

### Register custom dimensions (one-time)

**Admin → Data display → Custom definitions → Create custom dimensions**

| Dimension name | Event parameter | Scope |
|----------------|-----------------|-------|
| SEO Section | `seo_section` | Event |
| SEO Content Slug | `seo_content_slug` | Event |

`seo_section` values: `home`, `landing`, `guides`, `glossary`, `property`, `map`, `map_location`, `brand`, `glamping_hub`, `market_overview`, `partners`, `other`.

Code sends these on every page view via `getSeoPageContextParams()` in `components/GoogleAnalytics.tsx`.

### Explore report: Organic by SEO section

1. **Explore** → Blank
2. Dimensions: `Session source/medium`, `SEO Section` (custom), `Page path`
3. Metrics: Sessions, Engaged sessions, Conversions (if configured)
4. Filter: Session medium = `organic`
5. Save as **Organic traffic by SEO section**

### Explore report: Landing page organic

1. Filter: Page path contains `/landing/`, medium = organic
2. Dimensions: `Page path`, `SEO Content Slug`
3. Metrics: Sessions, `seo_conversion_click` events (after CTAs use `trackSeoConversionClick`)

### Conversion event

Use `trackSeoConversionClick()` from `@/lib/analytics` on primary CTAs to `sageoutdooradvisory.com` (register as key event in GA4).

---

## 4. Weekly KPI checklist

Copy into your weekly notes:

| Metric | Source | This week |
|--------|--------|-----------|
| Organic clicks | GSC Performance | |
| Organic impressions | GSC Performance | |
| Average position (top 10 queries) | GSC Performance | |
| Indexed pages | GSC Indexing | |
| Organic sessions (total) | GA4 | |
| Organic sessions — landing | GA4 Explore (`seo_section=landing`) | |
| Organic sessions — guides | GA4 Explore | |
| Organic sessions — map | GA4 Explore | |
| Organic sessions — property | GA4 Explore | |
| Sitemap URL count | `npm run seo:audit-instrumentation` | |
| IndexNow cron | Vercel → Cron → last success | |

**Targets for Week 1:** instrumentation green (audit exit 0), GSC verified, sitemap submitted, baseline CSVs saved.

---

## 5. API & automation

| Endpoint / script | Purpose |
|-------------------|---------|
| `GET /api/seo/instrumentation` | JSON health report (no secrets) |
| `npm run seo:audit-instrumentation` | CLI audit vs production |
| `npm run seo:audit-instrumentation:baseline` | Writes `docs/seo/baselines/instrumentation-baseline.json` |
| `npm run indexnow:submit` | Manual IndexNow ping after large deploys |

---

## 6. Definition of done (Phase 0)

- [ ] `npm run seo:audit-instrumentation` exits 0 against production
- [ ] GSC property verified and sitemap submitted
- [ ] GSC + GA4 baseline exports saved (date-stamped)
- [ ] GA4 custom dimensions `seo_section` and `seo_content_slug` created
- [ ] Explore report **Organic traffic by SEO section** saved
- [ ] `INDEXNOW_KEY` set in Vercel; key file URL returns the key
- [ ] `CRON_SECRET` set (optional but recommended)

When complete, proceed to **Phase 1** — see [PHASE_1_TECHNICAL_CRAWL.md](./PHASE_1_TECHNICAL_CRAWL.md).

---

## Related docs

- [GOOGLE_SEARCH_CONSOLE_SETUP.md](./GOOGLE_SEARCH_CONSOLE_SETUP.md)
- [INDEXNOW_SETUP.md](../INDEXNOW_SETUP.md)
- [GA4_IMPLEMENTATION_GUIDE.md](../analytics/GA4_IMPLEMENTATION_GUIDE.md)
- [GA4_CROSS_DOMAIN_SETUP.md](../analytics/GA4_CROSS_DOMAIN_SETUP.md)
