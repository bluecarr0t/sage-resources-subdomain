# RV Industry Overview — RoverPass parity

## Data inputs

| Source | Table | Notes |
|--------|--------|--------|
| Campspot | `campspot` | Annual `occupancy_rate_2024/2025`, `avg_retail_daily_rate_2024/2025`, seasonal columns |
| RoverPass | `all_roverpass_data_new` | Open listings only (`is_closed != 'Yes'`). Single occupancy + retail rate. When `roverpass_occupancy_year` = 2024, occupancy is written to both `occupancy_rate_2024` and `occupancy_rate_2025` so 2025-only charts (regional map) can use the snapshot; Campspot-style 2024 annual ADR is still absent. |

## Year-over-year (YoY) charts

YoY views require **both** years’ metrics to pass standard bands for the matched cohort:

- **Regional map — state modal / hover:** matched 2024 + 2025 occupancy and ARDR (annual columns). RoverPass rarely qualifies → **Campspot-heavy**.
- **Occupancy & ARDR trends:** separate 2024 and 2025 buckets; 2024 needs annual fields → **mostly Campspot** for 2024 bars; 2025 includes RoverPass when classified.
- **Resort size impact:** same dual-year gate as trends.

## 2025-only charts (RoverPass eligible)

When `?source=all`, these charts include classified RoverPass rows where filters pass:

- Regional map (2025 regional means)
- State ADR choropleth
- Season rates (seasonal columns)
- Surface rates, amenities, unit-type comparison, RV parking

## Analyst `?source=campspot` toggle

- Uses a **precomputed Campspot-only fold** stored in the Postgres snapshot (`campspotOnly` on the page payload).
- RoverPass rows are never folded into this variant.
- YoY charts become **fully Campspot** for both years (no RoverPass 2025-only skew).
- Refresh snapshot after deploy to populate `campspotOnly` on older caches.

## Related code

- Rules: `lib/rv-industry-overview/rv-overview-source-parity.ts`
- Row normalization: `lib/rv-industry-overview/rv-overview-wide-row.ts`
- Unified scan: `lib/rv-industry-overview/campspot-rv-overview-page-data.ts`
