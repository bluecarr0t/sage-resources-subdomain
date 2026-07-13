# Hot tub P0 remeasure — 2026-07-13 batch 3

## Cohort

Published open US private-commercial Glamping (`all_sage_data`), Safari Tent + Cabin P0 queue.

## Batch 3 apply

```bash
npx tsx scripts/export-unit-hot-tub-queue.ts --unit-types "Safari Tent,Cabin"
npx tsx scripts/research-hot-tub-glamping.ts \
  --dry-run --limit 40 \
  --unit-types "Safari Tent,Cabin" \
  --only-unit-hot-tub-null --export-sql
npx tsx scripts/research-hot-tub-glamping.ts \
  --limit 40 \
  --unit-types "Safari Tent,Cabin" \
  --only-unit-hot-tub-null --export-sql
```

| Metric | Value |
|--------|------:|
| Properties processed | 40 |
| Row updates applied | **13** |
| Conflicts | 0 |
| Skipped (fetch_error) | 3 |

### Applied properties

| Property | Updates | Tags |
|----------|--------:|------|
| Under Canvas North Yellowstone | 7 | `unit_hot_tub = No` |
| Westgate River Ranch Resort & Rodeo | 5 | `unit_hot_tub = No`, `property_hot_tub = Yes` |
| Postcard Cabins Gilchrist Springs | 1 | `unit_hot_tub = No`, `unit_hot_tub_or_sauna = No` |

Migration: [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-3.sql`](../../scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-3.sql)

## Why Amenity Impact Unit Hot Tub may still look ~$0

This batch filled **No** (without private tub), which improves explicit coverage and the “without” cohort, but does **not** grow the “with amenity” sample (chart currently ~366 units). A national Unit Hot Tub premium needs more high-confidence **Yes** private-tub tags (or within-type Safari/Cabin deltas).

Most of the other 37 properties scraped successfully but returned insufficient private-tub evidence for auto-apply (same pattern as batch 2).

## Next

1. Manual `No` pass on high-weight inconclusive brands (Huttopia, Jellystone, Costanoa, AutoCamp, Collective, etc.)
2. Continue `--limit 40` weekly on remaining blanks
3. After Safari/Cabin ≥95% explicit, drop `--unit-types` and expand other types looking for private tub **Yes**
