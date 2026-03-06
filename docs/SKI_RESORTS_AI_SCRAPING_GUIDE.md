# Ski Resorts Table – AI Agent Research Guide

The `ski_resorts` table is populated via a high-accuracy research pipeline that uses Tavily web search, GPT-4.1 structured outputs, and programmatic validation.

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

Two-pass enrichment separates **stable data** (terrain, elevation, snowfall, location) from **volatile data** (pricing, hours, amenities) so each can be refreshed independently.

## Data Sources

| Source | Domain | Best For |
|--------|--------|----------|
| **OnTheSnow** | onthesnow.com | Snowfall, terrain stats, lifts, reviews |
| **Wikipedia** | en.wikipedia.org | History, notable facts, elevation, basic stats |
| **Ski Resort Info** | skiresort.info | Comprehensive stats, comparisons |
| **Resort websites** | varies | Pricing, hours, amenities, contact |
| **General web** | (no domain filter) | Fallback for missing data |

## Field Priority

### Tier 1 – Core (always try to get)
- `name`, `country`, `state_province`, `city`
- `website_url`, `lat`, `lon`
- `vertical_drop_ft`, `summit_elevation_ft`, `base_elevation_ft`
- `average_annual_snowfall_inches`
- `number_of_trails`, `number_of_lifts`
- `lift_ticket_price_adult` or `lift_ticket_price_range_low/high`
- `opening_date`, `closing_date`, `operating_hours_weekday`

### Tier 2 – High value
- `address`, `region`, `nearest_airport_code`, `drive_time_from_nearest_city`
- `total_skiable_acres`, `trails_easy_count`, `trails_intermediate_count`, `trails_difficult_count`
- `parent_company`, `season_pass_name`
- `night_skiing_available`, `terrain_parks_count`
- `snowmaking_coverage_percent`

### Tier 3 – Nice to have
- All pricing variants, amenities, dining, ratings
- `raw_scraped_json` for reprocessing

## Validation Rules

The pipeline validates extracted data before inserting:

| Field | Valid Range |
|-------|------------|
| vertical_drop_ft | 100 – 5,500 |
| summit_elevation_ft | 500 – 15,000 |
| base_elevation_ft | 0 – 12,000 |
| total_skiable_acres | 5 – 9,000 |
| number_of_trails | 1 – 500 |
| number_of_lifts | 1 – 60 |
| average_annual_snowfall_inches | 20 – 750 |
| lift_ticket_price_adult | $10 – $400 |
| lat | 24 – 72 (USA + Canada) |
| lon | -170 – -50 (USA + Canada) |

Fields outside range are set to `null` and logged as warnings.

## Confidence Scoring

GPT-4.1 returns category-level confidence scores:

**Pass 1 (stable):** identity, location, terrain, lifts, snow
**Pass 2 (volatile):** pricing, season, amenities, ratings

Overall `data_confidence_score` is computed:
- `high` – 60%+ categories rated high, no critical categories low
- `low` – terrain or location rated low
- `medium` – everything else

## Matching Existing Resorts

Before inserting, the script checks for duplicates by:
1. `name` (case-insensitive) + `country` (exact match)

Use `last_scraped_at` to decide when to re-scrape (weekly for conditions, monthly for stats).

## Setup

1. Run the migration: `scripts/migrations/create-ski-resorts-table.sql`
2. Install deps: `npm install` (includes `@tavily/core`)
3. Set in `.env.local`:
   - `OPENAI_API_KEY` (required)
   - `TAVILY_API_KEY` (required – free tier at tavily.com)
   - `NEXT_PUBLIC_SUPABASE_URL` (required)
   - `SUPABASE_SERVICE_ROLE_KEY` (required)

## Usage

```bash
# Full pipeline: discover USA + Canada resorts, two-pass enrich, validate, insert
npm run research:ski-resorts

# Dry run (no DB writes, shows what would be inserted)
npx tsx scripts/research-ski-resorts-openai.ts --dry-run

# Limit resorts per country (e.g. 5 each)
npx tsx scripts/research-ski-resorts-openai.ts --limit 5

# Discover only (list resorts, no enrichment or insert)
npx tsx scripts/research-ski-resorts-openai.ts --discover-only

# Re-enrich existing resorts with fresh web data
npx tsx scripts/research-ski-resorts-openai.ts --enrich-only

# Skip web search (GPT knowledge only – no Tavily)
npx tsx scripts/research-ski-resorts-openai.ts --no-web-search
```

## Cost Estimates (per run, ~30 resorts)

| Service | Usage | Estimated Cost |
|---------|-------|---------------|
| Tavily | ~180 advanced queries | ~360 credits (free tier: 1000/month) |
| OpenAI | ~60 GPT-4.1 calls + 2 discovery | ~$3-5 |
| Supabase | ~30 inserts | Free tier |
