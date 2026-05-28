# Sauna ARDR re-measure (2026-05-27)

After pilot (25 properties) + batch (200 properties, 191 successful scrapes).

## Tagging coverage (rated ARDR cohort)

| Metric | Before | After |
|--------|--------|-------|
| Explicit `unit_sauna` Yes/No | 1.5% | **17.4%** |
| Units with `unit_sauna = Yes` | 2 | **2** (unchanged — most fills were `No`) |
| Properties with `web_research_sauna_*` tag | 0 | **~216** (pilot + batch) |

## Inventory-weighted driver (section 4b)

| Segment | n_units | Mean ARDR | Median ARDR |
|---------|---------|-----------|-------------|
| With private sauna | 2 | $149 | $149 |
| Without | 7,389 | $342 | $254 |

Sample too thin for a standalone sauna premium post (`n_units` with sauna still **2**).

## Run summary

| Phase | Row updates | Conflicts | Skipped |
|-------|-------------|-----------|---------|
| Pilot (25) | 19 | 0 | 0 |
| Batch (200) | 133 | 1 | 9 (no_url, fetch_error, too_short) |

SQL export: [`scripts/migrations/backfill-sauna-web-research-2026-05-27-batch.sql`](../../scripts/migrations/backfill-sauna-web-research-2026-05-27-batch.sql)

Review: `scripts/.tmp-sauna-review/conflicts.csv` (1 unmatched_row at Zion Ponderosa).
