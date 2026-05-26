# Glamping service tier

Property-level classification of **what kind of glamping experience** a property offers (amenities + service level). This is separate from:

| Field | Purpose |
|-------|---------|
| `property_type` | **Product / business model** (Glamping, Campground, …) — see [OUTDOOR_HOSPITALITY_TAXONOMY.md](./OUTDOOR_HOSPITALITY_TAXONOMY.md) |
| `rate_category` | ADR **price buckets** (`≤$149`, `$150–$249`, …) — see [RATE_CATEGORY_MIGRATION.md](./RATE_CATEGORY_MIGRATION.md) |
| Comps v2 `QUALITY_TIERS` | Five-tier ADR heuristic for **comp search** only (`lib/comps-v2/types.ts`) |
| `glamping_brands.brand_tier` | Portfolio / sub-brand hierarchy |

## Tier taxonomy

| Internal key | Display label | Alternate names |
|--------------|---------------|-----------------|
| `luxury` | Luxury Glamping | Ultra-luxury, ultra-premium |
| `upscale` | Upscale Glamping | Premium full-service, destination upscale |
| `midscale` | Comfort Glamping | Core glamping, select service |
| `rustic` | Essential Glamping | Economy glamping, back-to-nature |

Store **internal keys** in Postgres; show display labels in admin UI.

## Empirical ADR anchors (Sage cohort, May 2026)

~992 distinct properties with `rate_avg_retail_daily_rate` between $1–$5,000 (`is_glamping_property = Yes`, `published` + `in_progress`), using **max ADR across site rows** per property:

| Statistic | Max ADR |
|-----------|---------|
| p25 | $150 |
| p50 | $215 |
| p75 | $295 |
| p90 | $493 |

### Suggested ADR bands (guidance; boundaries overlap by design)

| Tier | Max site ADR (USD) | Notes |
|------|-------------------|--------|
| Luxury | **$800+** (often $1,200–$2,600+ all-inclusive) | Price alone sufficient at ≥$800 |
| Upscale | **$250–$799** (sweet spot ~$300–$550) | Aligns with p75–p90 |
| Midscale | **$125–$349** | Market bulk between p25–p75 |
| Rustic | **&lt;$150** (core $75–$149) | Shared bath common |

All-inclusive resorts may show one lump ADR on a single site row — treat **≥$800** as luxury regardless of unit type label.

## Scoring rubric (`lib/glamping-service-tier.ts`)

Per property, aggregate site rows: `BOOL_OR` on Yes/No amenity flags, `MAX(rate_avg_retail_daily_rate)` for ADR.

### Amenity points

| Signal | Points |
|--------|--------|
| `unit_private_bathroom = Yes` | +2 |
| `unit_air_conditioning = Yes` | +1 |
| `unit_hot_tub` or `property_hot_tub = Yes` | +2 |
| `property_restaurant` or `property_food_on_site = Yes` | +2 |
| `property_pool = Yes` | +1 |
| `property_sauna = Yes` | +1 |
| Shared bath only (no private on any row) | −2 |

### Fast paths

| Condition | Tier |
|-----------|------|
| Max ADR ≥ $800 | **luxury** |
| Max ADR &lt; $125 and shared bath | **rustic** |

### Base tier (after fast paths)

- **luxury**: points ≥ 6 AND ADR ≥ $500
- **upscale**: points ≥ 4 AND ADR ≥ $250
- **midscale**: points ≥ 1 OR ADR ≥ $125
- **rustic**: default (or points &lt; 1 with ADR &lt; $150)

## Database columns

| Column | Type | Notes |
|--------|------|--------|
| `glamping_service_tier` | `text` | CHECK: `luxury`, `upscale`, `midscale`, `rustic` |
| `glamping_service_tier_source` | `text` | `auto` \| `manual` |
| `glamping_service_tier_notes` | `text` | Audit rationale |

When `source = manual`, the batch classifier **skips** that `property_id`.

## Operations

1. Apply migration: `scripts/migrations/add-glamping-service-tier-2026-05-18.sql`
2. Dry-run: `npx tsx scripts/classify-glamping-service-tier.ts --dry-run`
3. Live backfill: `npx tsx scripts/classify-glamping-service-tier.ts`
4. Optional benchmarks: `scripts/migrations/seed-glamping-service-tier-benchmarks-2026-05-18.sql`

Admin: Sage Data table — filter, column, bulk edit, modal (sets `source = manual` on tier edit).

## Example properties

| Tier | Examples |
|------|----------|
| Luxury | The Ranch at Rock Creek, Paws Up, Ambiente, Mustang Monument |
| Upscale | Terramor, Under Canvas |
| Midscale | Postcard Cabins |
| Rustic | Timberline Glamping, El Cosmico |

## Comps v2 mapping (reference only)

| Service tier | Nearest comps-v2 quality tier |
|--------------|------------------------------|
| rustic | budget / economy |
| midscale | midscale |
| upscale | upscale / premium |
| luxury | luxury |

Do not merge these systems in code — use this table for documentation and future phase-2 filters only.
