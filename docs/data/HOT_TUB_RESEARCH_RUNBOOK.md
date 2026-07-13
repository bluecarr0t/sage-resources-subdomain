# Hot tub web research runbook

Inventory-weighted ARDR driver analysis depends on explicit `unit_hot_tub` / `property_hot_tub` tags on [`all_glamping_properties`](../../queries/ardr_drivers_post.sql). This runbook covers the Firecrawl + OpenAI backfill pipeline.

## Fields

| Column | Grain | Meaning |
|--------|-------|---------|
| `unit_hot_tub` | Unit row | Private in-unit / on-deck hot tub or jacuzzi |
| `property_hot_tub` | Property (all rows) | Shared on-property spa / hot tub |
| `unit_sauna` | Unit row | Private sauna |
| `unit_hot_tub_or_sauna` | Unit row | `Yes` if either tub or sauna is `Yes` |

Values must be exactly `Yes` or `No` (not null) for analytics.

## Prerequisites

- `.env.local`: `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `HOT_TUB_RESEARCH_MODEL` (default `gpt-4o`)

## Audit (before / after)

Run [`queries/hot_tub_tagging_audit.sql`](../../queries/hot_tub_tagging_audit.sql) in Supabase SQL editor.

Key metrics:

- `pct_unit_tub_explicit` — share of rated unit inventory with `unit_hot_tub` in (`Yes`,`No`)
- `units_unit_tub_yes` — inventory-weighted count for ARDR driver **n**

## Run pipeline

```bash
# Dry-run pilot (no DB writes)
npx tsx scripts/research-hot-tub-glamping.ts --dry-run --limit 25 --only-null

# Live pilot
npx tsx scripts/research-hot-tub-glamping.ts --limit 25 --only-null --export-sql

# Batch (skips rows already tagged web_research_hot_tub_*)
npx tsx scripts/research-hot-tub-glamping.ts --limit 200 --only-null --export-sql

# Single property
npx tsx scripts/research-hot-tub-glamping.ts --property-id <uuid>

# Re-process including prior runs
npx tsx scripts/research-hot-tub-glamping.ts --limit 50 --only-null --include-researched
```

## P0 Amenity Impact backfill (unit_hot_tub Yes/No)

Goal: explicit `Yes`/`No` on **`unit_hot_tub`** for published open US commercial glamping so Amenity Impact stops treating blanks as “without.” Prioritize **Safari Tent + Cabin**.

### Field rules

| Situation | Tags |
|-----------|------|
| Private in-unit / on-deck tub for that unit | `unit_hot_tub = Yes` |
| Shared property spa only | `property_hot_tub = Yes`, **`unit_hot_tub = No`** |
| Values | Exactly `Yes` or `No` (never leave null once researched) |

Derive `unit_hot_tub_or_sauna` on apply (pipeline does this automatically).

### CLI flags (P0)

| Flag | Meaning |
|------|---------|
| `--only-unit-hot-tub-null` | Research when **`unit_hot_tub` is blank** (even if `property_hot_tub` is already set). Prefer this over `--only-null` for Amenity Impact. |
| `--unit-types "Safari Tent,Cabin"` | Limit qualifying properties to those unit types |
| `--only-null` | Legacy: both `unit_hot_tub` and `property_hot_tub` empty |

### Cadence (slow / accurate)

1. **Audit** — [`queries/hot_tub_tagging_audit.sql`](../../queries/hot_tub_tagging_audit.sql)
2. **Export queue** — `npx tsx scripts/export-unit-hot-tub-queue.ts` (or [`queries/unit_hot_tub_p0_queue.sql`](../../queries/unit_hot_tub_p0_queue.sql))
3. **Dry-run 25** — Safari/Cabin first:

```bash
npx tsx scripts/research-hot-tub-glamping.ts \
  --dry-run --limit 25 \
  --unit-types "Safari Tent,Cabin" \
  --only-unit-hot-tub-null \
  --export-sql
```

4. **Human review** — `scripts/.tmp-hot-tub-review/results.jsonl` + `conflicts.csv`; spot-check private vs shared spa
5. **Live apply** — same command without `--dry-run` (auto-applies high / medium+evidence only; never overwrites existing Yes/No)
6. **Check in SQL** — copy reviewed export to `scripts/migrations/backfill-hot-tub-unit-p0-YYYY-MM-DD-batch-N.sql`
7. **Re-measure** — audit SQL + Amenity Impact (within-type Safari/Cabin)
8. **Next batch** — 25–50 properties/week until Safari/Cabin rated rows are ≥ **95%** explicit, then expand unit types

See also: [`HOT_TUB_P0_REMEASURE-2026-07-13.md`](./HOT_TUB_P0_REMEASURE-2026-07-13.md), [`HOT_TUB_P0_EXPAND_REMAINING.md`](./HOT_TUB_P0_EXPAND_REMAINING.md).

### Success gates (P0)

1. Safari Tent + Cabin rated rows: ≥ **95%** explicit `unit_hot_tub`
2. Full US open published rated cohort: ≥ **85%** explicit
3. No unresolved `unit_hot_tub` vs `unit_hot_tub_or_sauna` contradictions in Safari/Cabin
4. Do **not** invent a positive national Unit Hot Tub premium by changing comparison math; use within-type deltas if national remains noisy

## Apply policy

- **Auto-apply:** null/empty fields when confidence is `high`, or `medium` with substantive evidence text
- **Conflict queue:** existing `Yes`/`No` disagrees with research → `scripts/.tmp-hot-tub-review/conflicts.csv`
- **No overwrite** of existing values unless resolved manually

Artifacts:

- `scripts/.tmp-hot-tub-review/results.jsonl` — full extraction per property
- `scripts/.tmp-hot-tub-review/conflicts.csv` — manual review
- `scripts/.tmp-hot-tub-review/backfill-hot-tub-YYYY-MM-DD.sql` — optional SQL export

## SQL migrations

Approved batches are checked in under `scripts/migrations/`:

- `backfill-hot-tub-web-research-2026-05-27-pilot.sql` — first 25-property pilot
- `backfill-hot-tub-web-research-2026-05-27-batch.sql` — larger batch (generated after batch run)

Re-run migrations only after review; they use `UPDATE ... WHERE id =`.

## Re-measure ARDR hot tub driver

After backfill, run section **4** in [`queries/ardr_drivers_post.sql`](../../queries/ardr_drivers_post.sql) (inventory-weighted mean + median).

### Publish gates (LinkedIn / standalone hot tub claim)

Publish a **national hot tub premium** only if:

1. `n_units` with `unit_hot_tub = Yes` ≥ **500** (stretch) or ≥ **30** (minimum sample), **and**
2. ≥ **15%** of rated unit inventory has explicit `unit_hot_tub` Yes/No (not null)

Otherwise use caveat copy:

> Among properties where private hot tub is documented in our inventory, the unit-weighted median premium is $X vs $Y without.

### Post-backfill snapshot (2026-05-27)

After pilot + 200-property batch ([`HOT_TUB_ARDR_REMEASURE-2026-05-27.md`](./HOT_TUB_ARDR_REMEASURE-2026-05-27.md)):

- **93** rated units with `unit_hot_tub = Yes` (was ~65)
- **13.5%** of rated unit inventory has explicit `unit_hot_tub` Yes/No
- Inventory-weighted median premium: **+$35** ($289 with vs $254 without)
- **47** properties tagged via `web_research_hot_tub_*` discovery_source

Standalone hot tub post: still below 500-unit stretch gate; use caveat copy or continue backfill.

## Manual conflict resolution

1. Open `conflicts.csv`
2. Verify on property website
3. Fix in admin or:

```sql
UPDATE all_glamping_properties
SET unit_hot_tub = 'Yes', date_updated = 'YYYY-MM-DD'
WHERE id = <row_id>;
```

## Architecture

- [`lib/glamping-hot-tub-research/`](../lib/glamping-hot-tub-research/) — cohort, scrape, extract, apply
- [`scripts/research-hot-tub-glamping.ts`](../scripts/research-hot-tub-glamping.ts) — CLI

One Firecrawl scrape per `property_id`; LLM maps `site_name` / `unit_type` to unit rows.
