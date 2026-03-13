# Discovery Pipeline (RSS & News) — Audit Report

**Date:** March 13, 2025  
**Scope:** `scripts/discover-glamping-from-news.ts` and `lib/glamping-discovery/*`  
**Basis:** Test runs (RSS, Tavily, URL) and code review

---

## Executive Summary

The Discovery Pipeline successfully processes glamping articles from **Tavily search** and **direct URLs**, but **RSS mode (Google News) is effectively broken** due to article fetch failures. One **critical bug** in the enrichment prompt was identified. Several infrastructure and robustness improvements are recommended.

---

## 1. Issues Identified

### 1.1 Critical — Enrichment Prompt Placeholder Bug

**File:** `lib/glamping-discovery/enrich-and-insert.ts` (lines 34–39)

The `ENRICHMENT_PROMPT` uses a template literal with `${0}`, `${1}`, etc. In JavaScript, these are evaluated immediately—so the string becomes `"Property Name: 0"`, `"City: 1"`, etc. The subsequent `.replace('${0}', property.property_name)` finds nothing to replace because the literal `'${0}'` no longer exists in the string.

**Impact:** When new properties are inserted, enrichment would send `"Property Name: 0"`, `"City: 1"` to GPT instead of actual values, producing incorrect or useless enrichment.

**Fix:** Use a regular string with non-interpolated placeholders (e.g. `{{0}}`), then replace:

```ts
const ENRICHMENT_PROMPT = `Research and provide detailed information about this glamping property:

Property Name: {{0}}
City: {{1}}
State: {{2}}
Country: {{3}}
...`;

const prompt = ENRICHMENT_PROMPT
  .replace('{{0}}', property.property_name || '')
  .replace('{{1}}', property.city || 'Unknown')
  .replace('{{2}}', property.state || 'Unknown')
  .replace('{{3}}', property.country || 'Unknown');
```

---

### 1.2 Missing Database Table

**Table:** `glamping_discovery_processed_urls`

The pipeline expects this table for tracking processed URLs. Migration exists (`scripts/migrations/create-glamping-discovery-processed-urls.sql`) but is not applied in the test environment.

**Impact:**

- `getProcessedUrls()` logs a warning and returns an empty set.
- `markUrlProcessed()` upserts fail silently; URLs are never recorded.
- No idempotency: the same article can be reprocessed on every run.

---

### 1.3 RSS Mode — Google News URLs Fail

**Observed:** All Google News RSS article URLs failed with "Insufficient content extracted".

**Cause:** Google News RSS returns redirect URLs (`news.google.com/rss/articles/CBMi...`). `fetch-article.ts` fetches the Google News page, tries to extract a canonical URL, and fetches the source article. The canonical extraction or source fetch frequently fails or yields too little content (paywalls, JS-heavy pages, anti-scraping).

**Impact:** RSS mode is ineffective for production use. The cron job (`/api/cron/discover-glamping`) uses `--rss`, so it will always fail.

---

### 1.4 403 Forbidden on Some Sites

**Observed:** Smithsonian (`smithsonianmag.com`) returned 403 Forbidden during Tavily runs.

**Cause:** Bot/security rules blocking non-browser requests. Current fetch uses a simple User-Agent; no retries or alternative strategies.

**Impact:** Some otherwise good articles are skipped. Roughly one-third of Tavily results in the test run were lost.

---

### 1.5 Cron Job Uses Broken RSS Mode

**File:** `app/api/cron/discover-glamping/route.ts`

The cron endpoint runs `--rss --limit 1`. Given RSS failures, each run is likely to process zero articles.

**Recommendation:** Switch cron to Tavily (`--tavily --limit 1`) if `TAVILY_API_KEY` is available, or add a mode flag.

---

### 1.6 No Firecrawl Fallback for Blocked Pages

**Context:** `RESEARCH_PIPELINE_ARCHITECTURE.md` recommends Firecrawl for deep scraping when Cheerio fails or pages are JS-heavy.

**Current state:** The discovery pipeline only uses `fetch` + Cheerio. There is no Firecrawl fallback for 403 or low-content responses.

**Impact:** Articles behind bot protection or heavy JS cannot be processed.

---

### 1.7 Deduplication Can Produce False Positives

**File:** `lib/glamping-discovery/deduplicate.ts` (lines 72–76)

```ts
for (const dbName of dbProperties) {
  if (normalizedName.length > 5 && (dbName.includes(normalizedName) || normalizedName.includes(dbName))) {
    return true;
  }
}
```

Substring matching may mark distinct properties as duplicates (e.g. "Riverside Glamping" vs "Riverside Glamping Resort") or miss real duplicates with different spellings.

---

### 1.8 No Retry Logic for Fetch

**File:** `lib/glamping-discovery/fetch-article.ts`

A single `fetch()` is used. There is no retry for transient errors (network, rate limits, 5xx). A single failure drops the article.

---

### 1.9 Limited RSS Feed Variety

**File:** `lib/glamping-discovery/feeds.ts`

Only two Google News feeds are configured. No industry or regional sources (e.g. Glamping Hub, press releases, travel blogs).

---

## 2. Improvements Recommended

| Priority | Improvement | Status |
|----------|-------------|--------|
| P0 | Fix enrichment prompt placeholder bug | ✅ Done |
| P0 | Apply `create-glamping-discovery-processed-urls.sql` migration | ✅ Done (run `npm run migrate:discovery`) |
| P1 | Switch cron to Tavily or make mode configurable | ✅ Done |
| P1 | Add Firecrawl fallback when Cheerio fetch fails or returns <100 chars | ✅ Done |
| P2 | Add retry with exponential backoff for fetch (3 attempts, 5xx/429) | ✅ Done |
| P2 | Improve User-Agent / headers to reduce 403s (e.g. browser-like) | ✅ Done |
| P2 | Add more RSS feeds (industry news, regional) | ✅ Done |
| P3 | Tighten deduplication: configurable thresholds, optional fuzzy match | ✅ Done |
| P3 | Add structured logging / metrics (articles processed, failed, inserted) | ✅ Done |

---

## 3. Future Features

### 3.1 Multi-Mode Cron

Allow cron to cycle through discovery modes instead of only RSS:

- Week 1: Tavily  
- Week 2: RSS (if RSS is fixed)  
- Week 3: Tavily with different queries  

Configurable via env (e.g. `DISCOVERY_CRON_MODE`).

---

### 3.2 Firecrawl Integration

- Add optional Firecrawl scrape when Cheerio fetch returns <100 chars or 403.
- Gate behind `FIRECRAWL_API_KEY`; fall back to Cheerio if not set.
- Align with `RESEARCH_PIPELINE_ARCHITECTURE.md` patterns.

---

### 3.3 Enhanced Google News Handling

- Resolve Google News redirect URLs to final URLs before fetching.
- Use Firecrawl or a headless browser for aggregator pages when needed.
- Or replace Google News RSS with feeds that link directly to publisher URLs.

---

### 3.4 Discovery Source Expansion

- Add more Tavily queries (by region, unit type, “new opening 2026”).
- Integrate additional RSS sources: industry news, regional travel, glamping blogs.
- Optional: Twitter/X or press-release APIs for “just opened” announcements.

---

### 3.5 Validation Against Inclusion Criteria

- Apply glamping resort inclusion rules from `RESEARCH_PIPELINE_ARCHITECTURE.md` (≥4 units, glamping-focused, etc.).
- Filter out non-qualifying properties before enrichment/insert.
- Reduce noise and maintain data quality.

---

### 3.6 Observability and Alerting

- Track metrics: articles fetched, failed (by reason), properties extracted, inserted, deduped.
- Expose via admin dashboard or `/api/admin/discovery-stats`.
- Optional: Slack/email alerts when discovery run fails or inserts 0 properties for multiple consecutive runs.

---

### 3.7 Batch Processing for Large Runs

- For `npm run discover:glamping`, process in chunks to stay within memory and time limits.
- Persist progress (e.g. last processed URL) for resumable runs.
- Option to run as background job instead of single long-lived process.

---

### 3.8 Confidence / Duplicate Review Queue

- Assign confidence scores to extracted properties.
- Queue low-confidence or possible duplicates for manual review before insert.
- Admin UI to approve or reject candidates.

---

## 4. Test Results Summary (March 13, 2025)

| Mode | Articles Found | Fetched | Extracted | Inserted | Notes |
|------|----------------|---------|-----------|----------|-------|
| RSS (limit 2) | 2 | 0 | — | — | All failed: insufficient content |
| Tavily (limit 1) | 3 | 2 | 2 | 0 | Smithsonian 403; others deduped |
| URL (Skamania) | 1 | 1 | 1 | 0 | Full flow OK; property already in DB |
| URL (example.com) | 1 | 0 | — | — | Expected 404 |

---

## 5. Quick Wins

1. **Apply migration** — Run `create-glamping-discovery-processed-urls.sql` in Supabase.
2. **Fix enrichment bug** — Replace template literal placeholders with safe placeholders (e.g. `{{0}}`) or a function.
3. **Switch cron to Tavily** — Update cron route to use `--tavily --limit 1` when `TAVILY_API_KEY` is set.
4. **Add retries** — Wrap `fetchArticleContent` with 2–3 retries for 5xx/429/network errors.
