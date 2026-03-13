# Research Pipeline: Tavily, Firecrawl, OpenAI — Quick Reference

This doc summarizes how **Tavily**, **Firecrawl**, and the **OpenAI API** are used together in the research pipeline. For full architecture, patterns, and validation rules see **[RESEARCH_PIPELINE_ARCHITECTURE.md](./RESEARCH_PIPELINE_ARCHITECTURE.md)**.

---

## Services at a glance

| Service | Purpose | Env var |
|--------|----------|---------|
| **Tavily** | Web search with raw markdown; multi-query per entity for discovery, stable facts, and volatile data | `TAVILY_API_KEY` |
| **Firecrawl** | Deep scrape of specific URLs (JS-rendered) for amenities, booking links, pricing | `FIRECRAWL_API_KEY` (optional) |
| **OpenAI** | Discovery (list entities), structured extraction from content (GPT + JSON schema) | `OPENAI_API_KEY` |

---

## Flow (high level)

1. **Discovery** — OpenAI (optionally with Tavily context) lists entities (e.g. glamping resorts, ski resorts).
2. **Stable pass** — Tavily search (domain-filtered) → merged content → OpenAI extracts identity, location, terrain.
3. **Deep-scrape pass** *(optional)* — Firecrawl scrapes property/listing URLs → OpenAI extracts amenities, booking URLs, rates.
4. **Volatile pass** — Tavily search (broad) → OpenAI extracts prices, reviews, social.
5. **Validation** — Range checks, geo bounds, confidence score.
6. **Database** — Insert/update in Supabase.

---

## Glamping resort inclusion criteria

Properties must: **≥ 4 glamping units**; **glamping-unit focused** (standalone, beds + linens; not tent sites or RV pads); **not** a campground, RV park, or hotel. Full table: [RESEARCH_PIPELINE_ARCHITECTURE.md](./RESEARCH_PIPELINE_ARCHITECTURE.md) §2.

---

## Where it’s implemented

| Area | Tavily | Firecrawl | OpenAI |
|------|--------|-----------|--------|
| Glamping research | `scripts/research-glamping-resorts-openai.ts` (multi-search + volatile) | Same script (`firecrawlScrape`) | Discovery + 3 extraction passes |
| Ski research | `scripts/research-ski-resorts-openai.ts` | — | Discovery + 2 extraction passes |
| Report market context | `lib/ai-report-builder/tavily-context.ts` | — | Report generation |
| Report comparables | `lib/ai-report-builder/tavily-comp-research.ts` | — | Enrichment |
| RAG/embeddings | — | — | `lib/ai-report-builder/rag-retrieve.ts` |

---

## Running the pipelines

**Glamping (Tavily + Firecrawl + OpenAI):**

```bash
npx tsx scripts/research-glamping-resorts-openai.ts              # full
npx tsx scripts/research-glamping-resorts-openai.ts --dry-run    # no DB
npx tsx scripts/research-glamping-resorts-openai.ts --no-firecrawl  # skip Firecrawl
```

**Ski (Tavily + OpenAI):**

```bash
npx tsx scripts/research-ski-resorts-openai.ts
npx tsx scripts/research-ski-resorts-openai.ts --dry-run
```

Requires in `.env.local`: `OPENAI_API_KEY`, `TAVILY_API_KEY`, and for glamping optionally `FIRECRAWL_API_KEY`; for DB writes: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
