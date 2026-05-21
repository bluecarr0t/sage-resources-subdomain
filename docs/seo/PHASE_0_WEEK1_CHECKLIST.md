# Phase 0 — Week 1 (Technical & Measurement)

**Domain:** https://resources.sageoutdooradvisory.com  
**Code changes:** duplicate HTML fix, sitemap hub locales, `llms.txt` canonical URLs.

## Completed in repo

| Task | Status |
|------|--------|
| 0.1 Single `<html>` / `<body>` (root layout only) | Done |
| 0.2 `main.xml` — en-only for `/guides` and `/glossary` hubs | Done |
| 0.5 `public/llms.txt` — canonical `/en/...` URLs | Done |

## Manual steps (Vercel + GSC)

### 0.3 Environment variables (Vercel → Project → Environment Variables)

Set for **Production** (and Preview if you want staging audits):

```bash
# GA4 — Admin → Data Streams → Web → Measurement ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional if not using public/google*.html for GSC
NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE=your-verification-string

# IndexNow — generate once: openssl rand -hex 16
INDEXNOW_KEY=your-32-char-hex-key

# Protects daily cron POST to /api/indexnow
CRON_SECRET=your-random-secret

# Optional override (defaults to resources subdomain)
SITE_URL=https://resources.sageoutdooradvisory.com
```

After deploy:

```bash
npm run seo:audit-instrumentation
# Expect: Ready: YES (when vars are set in the shell or production)
```

Verify IndexNow key file: `https://resources.sageoutdooradvisory.com/{INDEXNOW_KEY}.txt`

### 0.4 Google Search Console

1. [Search Console](https://search.google.com/search-console) → property `resources.sageoutdooradvisory.com`
2. **Sitemaps** → submit `https://resources.sageoutdooradvisory.com/sitemap.xml`
3. **Performance** → export last 28 days (queries + pages) as Phase 0 baseline
4. After deploy, check **Pages** → “Page with redirect” — should drop for `/es/guides`, `/fr/glossary` hub URLs

### Post-deploy verification

```bash
# One <html> on locale routes
curl -s "https://resources.sageoutdooradvisory.com/en" | grep -o "<html" | wc -l
# Expected: 1

# Sitemap should not list redirecting guide/glossary hubs
curl -s "https://resources.sageoutdooradvisory.com/sitemaps/main.xml" | grep -E "/(es|fr|de)/(guides|glossary)" | wc -l
# Expected: 0

# llms.txt uses /en paths
curl -s "https://resources.sageoutdooradvisory.com/llms.txt" | head -15
```

### IndexNow after large content deploys

```bash
INDEXNOW_KEY=xxx SITE_URL=https://resources.sageoutdooradvisory.com npm run indexnow:submit
```

## Related docs

- [PHASE_0_INSTRUMENTATION.md](./PHASE_0_INSTRUMENTATION.md)
- [INDEXNOW_SETUP.md](../INDEXNOW_SETUP.md)
