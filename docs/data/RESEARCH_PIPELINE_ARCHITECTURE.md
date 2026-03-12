# Research Pipeline Architecture: Reusable AI Data Collection

This document describes the high-accuracy research pipeline used for the ski resort data collection. The architecture is **domain-agnostic** and can be adapted for any entity research task (e.g. hotels, restaurants, campgrounds, venues, companies).

## Overview

```
Discovery (GPT list entities)
        ↓
Pass 1: Stable Data (Tavily multi-source → GPT structured output)
        ↓
Pass 2: Volatile Data (Tavily multi-source → GPT structured output)
        ↓
Validation (range checks, bounding box, confidence filter)
        ↓
Database insert
```

**Core idea:** Use Tavily for web search with raw markdown content, GPT with strict JSON schemas for extraction, and programmatic validation to catch hallucinations. Split data into **stable** (rarely changes) vs **volatile** (changes often) so each pass can be tuned and refreshed independently.

---

## 1. Dependencies

| Package | Purpose |
|---------|---------|
| `@tavily/core` | Web search with `includeRawContent: 'markdown'` |
| `openai` | GPT-4.1 structured outputs |
| `@supabase/supabase-js` | Database insert (or swap for your DB client) |
| `dotenv` | Load `.env.local` |

**Env vars:**
- `OPENAI_API_KEY` (required)
- `TAVILY_API_KEY` (required – free tier at tavily.com)
- `NEXT_PUBLIC_SUPABASE_URL` (or your DB URL)
- `SUPABASE_SERVICE_ROLE_KEY` (or your DB secret)

---

## 2. Tavily Multi-Source Search

**Why multi-source?** A single query often misses key facts. Running 2–4 targeted queries per entity and merging results yields better coverage.

**Why raw markdown?** `includeRawContent: 'markdown'` returns the actual page content instead of snippets. GPT can extract structured data from full paragraphs and tables.

### Implementation pattern

```ts
type SearchQuery = { query: string; domains?: string[] };

async function tavilyMultiSearch(
  queries: SearchQuery[],
): Promise<{ content: string; sourceUrls: string[] }> {
  const allResults: Array<{ content: string; url: string; score: number }> = [];

  for (const { query, domains } of queries) {
    const response = await tavilyClient.search(query, {
      searchDepth: 'advanced',
      maxResults: 3,
      includeAnswer: true,
      includeRawContent: 'markdown',
      ...(domains?.length ? { includeDomains: domains } : {}),
    });
    for (const r of response.results) {
      const text = (r.rawContent || r.content || '').slice(0, 10000);
      if (text) allResults.push({ content: text, url: r.url, score: r.score });
    }
    await sleep(600); // Rate limit
  }

  // Sort by score, merge, truncate to ~40k chars
  allResults.sort((a, b) => b.score - a.score);
  let totalLen = 0;
  const parts: string[] = [];
  for (const r of allResults) {
    if (totalLen + r.content.length > 40000) break;
    parts.push(`[Source: ${r.url}]\n${r.content}`);
    totalLen += r.content.length;
  }
  return { content: parts.join('\n\n---\n\n'), sourceUrls: [...] };
}
```

### Query design

**Pass 1 (stable data):** Use domain filters to hit authoritative sources.

- `"{entity name}" site:authoritative-source.com` – primary stats
- `"{entity name}" site:wikipedia.org` – history, facts
- `"{entity name}" site:industry-directory.com` – comprehensive stats

**Pass 2 (volatile data):** Broader queries for current info.

- `"{entity name}" prices 2025` – pricing
- `"{entity name}" hours schedule season` – operating hours, dates

---

## 3. GPT Structured Outputs with Confidence

**Why JSON schema instead of `json_object`?** Strict schemas enforce exact field names and types, reducing hallucination and malformed output.

**Why field-level confidence?** GPT returns `high`/`medium`/`low` per category. You can filter low-confidence rows or flag them for manual review.

### Schema builder pattern

```ts
function buildExtractionSchema(
  schemaName: string,
  fields: readonly string[],
  confidenceCats: readonly string[],
): object {
  const resortProps: Record<string, object> = {};
  for (const f of fields) {
    resortProps[f] = f === 'name' ? { type: 'string' } : { anyOf: [{ type: 'string' }, { type: 'null' }] };
  }
  const confProps: Record<string, object> = {};
  for (const c of confidenceCats) {
    confProps[c] = { type: 'string', enum: ['high', 'medium', 'low'] };
  }
  return {
    name: schemaName,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        entity: { type: 'object', properties: resortProps, required: [...fields], additionalProperties: false },
        confidence: { type: 'object', properties: confProps, required: [...confidenceCats], additionalProperties: false },
      },
      required: ['entity', 'confidence'],
      additionalProperties: false,
    },
  };
}
```

### API call

```ts
const response = await openai.chat.completions.create({
  model: 'gpt-4.1',  // fallback to gpt-4o if 404
  messages: [
    { role: 'system', content: 'You extract structured data from web sources. Use null for unknown. Store numbers as strings.' },
    { role: 'user', content: `Extract data for "${entityName}" from:\n\n${content}` },
  ],
  temperature: 0.1,
  response_format: { type: 'json_schema', json_schema: schema },
  max_tokens: 6000,
});
```

---

## 4. Two-Pass Enrichment

**Why two passes?** Mixing stable and volatile data in one prompt increases hallucination. Stable data (terrain, elevation, location) comes from curated sources; volatile data (prices, hours) comes from current web results. Separate prompts and sources improve accuracy.

| Pass | Data type | Example fields | Example sources |
|------|-----------|----------------|-----------------|
| 1 | Stable | name, location, stats, elevation, description | OnTheSnow, Wikipedia, industry directories |
| 2 | Volatile | prices, hours, season dates, amenities, ratings | Resort website, pricing queries |

**Merge strategy:** Pass 1 populates base record. Pass 2 overlays volatile fields. Non-null values from later passes overwrite earlier ones.

---

## 5. Validation Layer

Run after GPT extraction to catch obvious errors.

### Range checks

Define min/max for numeric fields. Values outside range → set to `null` and log warning.

```ts
const rangeCheck = (field: string, min: number, max: number) => {
  const n = parseFloat(String(r[field] || '').replace(/[$,]/g, ''));
  if (!isNaN(n) && (n < min || n > max)) {
    warnings.push(`${field}=${r[field]} outside [${min}, ${max}]`);
    r[field] = null;
  }
};
rangeCheck('vertical_drop_ft', 100, 5500);
rangeCheck('lift_ticket_price_adult', 10, 400);
```

### Bounding box (for geo)

If entities are geographically constrained (e.g. USA + Canada):

```ts
if (lat !== null && (lat < 24 || lat > 72)) r.lat = null;
if (lon !== null && (lon < -170 || lon > -50)) r.lon = null;
```

### Required fields

Reject or flag rows missing critical fields: `name`, `state_province`, `country` (or your equivalents).

### Confidence filter

Compute overall `data_confidence_score` from category confidence:

- `low` – any critical category (e.g. location, terrain) is `low`
- `high` – 60%+ categories are `high`
- `medium` – otherwise

---

## 6. Discovery Phase

Before enrichment, you need a list of entities. Use GPT with optional Tavily context:

```ts
// Optional: fetch current list from web
const { content } = await tavilyMultiSearch([
  { query: `${region} ski resorts list 2024 2025` },
]);

const prompt = `List notable ski resorts in ${region}. Return JSON: { "resorts": [{ name, city, state_province, country, ... }] }
${content ? `\nWeb context:\n${content}` : ''}`;

const response = await openai.chat.completions.create({
  model: 'gpt-4.1',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.3,
  response_format: { type: 'json_object' },
  max_tokens: 8000,
});
```

Deduplicate against existing DB rows before enriching.

---

## 7. CLI Modes

| Flag | Behavior |
|------|----------|
| (none) | Full pipeline: discover → enrich → validate → insert |
| `--dry-run` | No DB writes, print what would be inserted |
| `--discover-only` | List entities, no enrichment |
| `--enrich-only` | Re-enrich existing rows from DB |
| `--no-web-search` | GPT only, skip Tavily |
| `--limit N` | Limit entities per region |

---

## 8. Checklist for New Projects

1. **Define your entity schema** – List all fields, split into stable vs volatile.
2. **Identify authoritative sources** – Which domains have reliable data? (Wikipedia, industry sites, official sites.)
3. **Design queries** – 2–4 queries per pass, with domain filters for pass 1.
4. **Build JSON schemas** – One for stable, one for volatile. Add confidence categories.
5. **Define validation rules** – Range checks, bounding box, required fields.
6. **Create DB table** – Run migration before first run.
7. **Implement discovery** – GPT list with optional Tavily context.
8. **Add deduplication** – Check existing rows before insert (e.g. `name` + `country`).
9. **Set rate limits** – `sleep(600)` between Tavily calls, `sleep(2000)` between entities.
10. **Add retries** – 4 retries for 5xx/429, fallback model if 404.

---

## 9. Reference Implementation

The ski resort pipeline is the canonical implementation:

- **Script:** `scripts/research-ski-resorts-openai.ts`
- **Migration:** `scripts/migrations/create-ski-resorts-table.sql`
- **Domain guide:** `docs/data/SKI_RESORTS_AI_SCRAPING_GUIDE.md`
- **Plan:** `.cursor/plans/ski_resort_pipeline_refactor_5a0beef9.plan.md`

---

## 10. Cost Notes (per ~30 entities)

| Service | Usage | Est. cost |
|---------|-------|-----------|
| Tavily | ~180 advanced queries | ~360 credits (1000 free/month) |
| OpenAI | ~60 GPT-4.1 calls + 2 discovery | ~$3–5 |
| Supabase | ~30 inserts | Free tier |
