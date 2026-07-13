# Hot tub P0 remeasure — 2026-07-13 batch 1

## Cohort

Published open US private-commercial Glamping (`all_sage_data`), ARDR-aligned exclusions.

## Baseline → after batch 1 (25 Safari Tent / Cabin properties)

| Metric | Baseline | After batch 1 |
|--------|----------|---------------|
| Rated inventory explicit `unit_hot_tub` % | 52% | **54.3%** |
| Safari/Cabin rated blank rows | 305 | **279** |
| Safari/Cabin rated explicit % | 48% | **52.2%** |
| Safari/Cabin Yes units (weighted) | — | 103 |
| Safari/Cabin No units (weighted) | — | 2,323 |

## Batch 1 apply summary

- Command: `research-hot-tub-glamping.ts --limit 25 --unit-types "Safari Tent,Cabin" --only-unit-hot-tub-null`
- Dry-run reviewed first; live applied **39** row updates; **26** conflicts logged (not overwritten)
- Migration: [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-1.sql`](../migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-1.sql)

### Notable applies

- Postcard Cabins (Brown County, Big Bear, Dale Hollow): `unit_hot_tub = No`
- Hinata Mountainside Resort: `unit_hot_tub = Yes`
- Zion Wildflower / Lone Mountain Ranch: blank `unit_hot_tub` filled `No` where private tub not evidenced; shared-spa / combo mismatches left in conflicts

### Conflicts deferred

- Lone Mountain Ranch: existing `property_hot_tub = No` vs research `Yes` (shared spa) — manual follow-up
- Zion Wildflower: existing `unit_hot_tub_or_sauna = Yes` vs research `No` — do not overwrite without listing re-check

## Gates

- Safari/Cabin ≥95% explicit: **not yet** (continue weekly 25–50 prop batches)
- Full cohort ≥85% explicit: **not yet**

## Next batch

```bash
npx tsx scripts/export-unit-hot-tub-queue.ts --unit-types "Safari Tent,Cabin"
npx tsx scripts/research-hot-tub-glamping.ts \
  --dry-run --limit 25 \
  --unit-types "Safari Tent,Cabin" \
  --only-unit-hot-tub-null --export-sql
# review artifacts, then drop --dry-run
```
