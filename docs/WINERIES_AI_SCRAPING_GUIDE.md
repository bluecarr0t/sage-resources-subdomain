# Wineries Table – AI Agent Research Guide

The `wineries` table is populated via a high-accuracy research pipeline that uses Tavily web search, GPT-4.1 structured outputs, and programmatic validation.

## Pipeline

```
Tavily multi-source search (with raw markdown content)
        ↓
GPT-4.1 structured output (with field-level confidence)
        ↓
Programmatic validation (range checks, bounding box)
        ↓
Supabase insert
```

Two-pass enrichment (Tavily) separates **stable data** (identity, AVA, varietals, acreage, production) from **volatile data** (tasting fees, hours, reservations, ratings). An optional **Pass 3 (Firecrawl)** scrapes the winery website when tasting fees are missing (e.g. boutique wineries like RAEN).

## Data Sources

| Source | Domain | Best For |
|--------|--------|----------|
| **Wikipedia** | en.wikipedia.org | History, notable facts, basic stats |
| **Wine Enthusiast** | wineenthusiast.com | Ratings, editorial coverage, varietals |
| **Wine Spectator** | winespectator.com | Ratings, industry coverage |
| **Winery Guide USA** | wineryguideusa.com | AVA, location, varietals |
| **All American Wineries** | allamericanwineries.com | Comprehensive listings |
| **Winery websites** | varies | Tasting fees, hours, reservations, contact |
| **Firecrawl** | direct scrape | Tasting fees from boutique winery sites when Tavily misses |
| **General web** | (no domain filter) | Fallback for missing data |

## Field Priority

### Tier 1 – Core (always try to get)
- `name`, `country`, `state_province`, `city`
- `website_url`, `lat`, `lon`
- `ava`, `region`, `grape_varietals`
- `acres_planted`, `annual_cases_produced`
- `tasting_room_available`, `tasting_hours`, `tasting_fee` or `tasting_fee_range_low/high`
- `reservation_required`

### Tier 2 – High value
- `address`, `nearest_airport_code`, `drive_time_from_nearest_city`
- `winery_type`, `year_founded`, `parent_company`
- `wine_styles`, `sustainable_certification`
- `restaurant`, `event_space`, `wine_club`
- `phone`, `email`, `reservation_url`
- `overall_rating`, `google_reviews_rating`

### Tier 3 – Nice to have
- `sub_ava`, `elevation_ft`, `lodging`, `wedding_venue`
- `tour_available`, `tour_fee`, `picnic_area`, `outdoor_seating`
- `wine_spectator_mentions`, `wine_enthusiast_mentions`
- `raw_scraped_json` for reprocessing

## Validation Rules

The pipeline validates extracted data before inserting:

| Field | Valid Range |
|-------|------------|
| acres_planted | 0.5 – 5,000 |
| annual_cases_produced | 50 – 5,000,000 |
| tasting_fee_range_low | $0 – $500 |
| tasting_fee_range_high | $0 – $500 |
| elevation_ft | 0 – 12,000 |
| lat | 24 – 72 (USA + Canada) |
| lon | -170 – -50 (USA + Canada) |

Fields outside range are set to `null` and logged as warnings. Acreage ranges like `"160-200"` are normalized (low value used for validation); the raw string is preserved in the DB.

## Confidence Scoring

GPT-4.1 returns category-level confidence scores:

**Pass 1 (stable):** identity, location, production, varietals
**Pass 2 (volatile):** tasting, amenities, ratings

Overall `data_confidence_score` is computed:
- `high` – 60%+ categories rated high, no critical categories (location, production) low
- `low` – location or production rated low
- `medium` – everything else

**Note:** Low confidence in `ratings` alone does not degrade overall confidence (ratings are often missing from web sources).

## Discovery Tiers

| Tier | Focus |
|------|-------|
| 1 | Major AVAs: Napa, Sonoma, Paso Robles (CA); Willamette (OR); Finger Lakes (NY); Walla Walla (WA); etc. |
| 2 | Regional favorites across all wine-producing states |
| 3 | Smaller boutiques and emerging regions |

## Matching Existing Wineries

Before inserting, the script checks for duplicates by:
1. `name` (case-insensitive) + `country` (exact match)

Use `last_scraped_at` to decide when to re-scrape (monthly for stable data, more frequently for tasting fees and hours).

## Setup

1. Run the migration: `scripts/migrations/create-wineries-table.sql`
2. Install deps: `npm install` (includes `@tavily/core`)
3. Set in `.env.local`:
   - `OPENAI_API_KEY` (required)
   - `TAVILY_API_KEY` (required – free tier at tavily.com)
   - `FIRECRAWL_API_KEY` (optional – for Pass 3 when tasting fees missing; use `--no-firecrawl` to skip)
   - `NEXT_PUBLIC_SUPABASE_URL` (required)
   - `SUPABASE_SERVICE_ROLE_KEY` (required)

## Usage

```bash
# Full pipeline: discover USA + Canada wineries, two-pass enrich, validate, insert
npm run research:wineries

# Dry run (no DB writes, shows what would be inserted)
npx tsx scripts/research-wineries-openai.ts --dry-run

# Limit wineries per country (e.g. 5 each)
npx tsx scripts/research-wineries-openai.ts --limit 5

# USA or Canada only
npx tsx scripts/research-wineries-openai.ts --country USA

# Discovery tier (1=major AVAs, 2=regional, 3=smaller)
npx tsx scripts/research-wineries-openai.ts --tier 1

# Discover only (list wineries, no enrichment or insert)
npx tsx scripts/research-wineries-openai.ts --discover-only

# Re-enrich existing wineries with fresh web data
npx tsx scripts/research-wineries-openai.ts --enrich-only

# Skip web search (GPT knowledge only – no Tavily)
npx tsx scripts/research-wineries-openai.ts --no-web-search

# Skip Firecrawl (useful when FIRECRAWL_API_KEY not set, or to reduce cost)
npx tsx scripts/research-wineries-openai.ts --no-firecrawl
```

## Cost Estimates (per run, ~30 wineries)

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Tavily | ~180 advanced queries | ~360 credits (free tier: 1000/month) |
| OpenAI | ~60 GPT-4.1 calls + 2 discovery | ~$3-5 |
| Supabase | ~30 inserts | Free tier |
