# Hot tub P0 — expand remaining (weekly cadence)

## Status after 2026-07-13 Manual Yes batch 6 (text/web)

| Gate | Target | Current |
|------|--------|---------|
| Safari/Cabin rated explicit `unit_hot_tub` | ≥95% | **~80%** unit-weighted |
| Full US rated explicit | ≥85% | **~67%** unit-weighted |
| Safari/Cabin blank rated units | → 0 | **~700** remaining |
| Rated units with `unit_hot_tub=Yes` | grow past ~366 | **~567** unit-weighted (incl. Onera Wimberley 28, Stay Nantahala yurts, Sinya, …) |

Migrations:

- [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-1.sql`](../migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-1.sql) — 39 row updates
- [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-2.sql`](../migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-2.sql) — 1 row update
- [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-3.sql`](../migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-3.sql) — 13 row updates (mostly `No`)
- [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-4.sql`](../migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-4.sql) — 24 Manual No (Huttopia/Costanoa/AutoCamp/Collective/…)
- [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-5.sql`](../migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-5.sql) — 6 Manual Yes (Jellystone, Paws Up, Bolt Farm Mirror, …)
- [`scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-6.sql`](../migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-6.sql) — 9 Manual Yes (Sinya, Open Sky Star Seeker, Stay Nantahala yurts, Onera Wimberley, …)

Remeasure: [`HOT_TUB_P0_REMEASURE-2026-07-13-batch-6.md`](./HOT_TUB_P0_REMEASURE-2026-07-13-batch-6.md) (also batch-4 note for Manual No/Yes framing)

## Amenity Impact framing

Overview **Unit Hot Tub** delta is **Safari Tent + Cabin within-type**. National Unit Hot Tub figures live in remeasure docs only.

## Why auto-fill slowed after batch 1

Many high-weight Safari/Cabin properties scrape successfully but the model returns **no high/medium private-tub evidence**, so apply writes **0** updates (correct under “no inventing No”). Batches 4–5 cleared the named scrape-inconclusive brands via curated Manual No/Yes.

## Weekly process (25–50 props)

1. Export queue:

```bash
npx tsx scripts/export-unit-hot-tub-queue.ts --unit-types "Safari Tent,Cabin"
```

2. Dry-run then live (same flags as runbook P0 section):

```bash
npx tsx scripts/research-hot-tub-glamping.ts \
  --dry-run --limit 25 \
  --unit-types "Safari Tent,Cabin" \
  --only-unit-hot-tub-null --export-sql
# review results.jsonl + conflicts.csv
npx tsx scripts/research-hot-tub-glamping.ts \
  --limit 25 \
  --unit-types "Safari Tent,Cabin" \
  --only-unit-hot-tub-null --export-sql
```

3. Check in `scripts/migrations/backfill-hot-tub-unit-p0-YYYY-MM-DD-batch-N.sql`

4. Re-run coverage SQL (or `queries/hot_tub_tagging_audit.sql`)

5. **Manual pass** for remaining scrape-inconclusive long-tail: set `unit_hot_tub = No` when listing clearly has no private tub; `Yes` only with private evidence. Track in queue CSV `status=manual`.

6. After Safari/Cabin ≥95%, drop `--unit-types` and continue other blanks; reconcile `unit_hot_tub` vs `unit_hot_tub_or_sauna` conflicts.

## Deferred conflict follow-ups

- Lone Mountain Ranch: `property_hot_tub` existing `No` vs research shared `Yes`
- Zion Wildflower: `unit_hot_tub_or_sauna` existing `Yes` vs research `No`
- Paws Up: `property_hot_tub` still `No` while `unit_hot_tub` now `Yes` (private cabin tubs) — reconcile property-level tag later
