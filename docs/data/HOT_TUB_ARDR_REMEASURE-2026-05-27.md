# Hot tub ARDR re-measure (2026-05-27)

After pilot (25 properties) + batch (200 properties, 110 successful research passes, 90 skipped mostly `fetch_error`).

## Tagging coverage (rated ARDR cohort)

Re-run [`queries/hot_tub_tagging_audit.sql`](../../queries/hot_tub_tagging_audit.sql) for full detail.

Approximate post-backfill (inventory-weighted, rated rows):

| Metric | Before backfill | After backfill |
|--------|-----------------|----------------|
| Units with `unit_hot_tub = Yes` | ~65 | **~93** |
| Unit inventory with explicit `unit_hot_tub` Yes/No | ~9.6% | **~17%+** (re-query audit) |

## Inventory-weighted driver (section 4 in `ardr_drivers_post.sql`)

| Segment | n_units | Mean ARDR | Median ARDR |
|---------|---------|-----------|-------------|
| With private hot tub (`unit_hot_tub = Yes`) | 93 | $307 | **$289** |
| Without | 7,298 | $343 | **$254** |
| **Median delta** | | | **+$35 (+14%)** |

Mean runs counter to median (luxury safari rows without unit-level Yes still weight heavily).

## LinkedIn publish gate

| Gate | Target | Status |
|------|--------|--------|
| Minimum n (units with tub) | ≥ 30 | **Pass** (93) |
| Stretch n | ≥ 500 | **Fail** |
| Explicit tagging share | ≥ 15% | **Borderline** — re-run audit SQL |

**Recommendation:** Do not run a standalone national hot tub premium post yet. Use caveat copy or continue backfill (remaining null rows + retry `fetch_error` properties with slower rate limits).

## Next steps

1. Review `scripts/.tmp-hot-tub-review/conflicts.csv` (1 conflict from batch).
2. Retry failed scrapes: `npx tsx scripts/research-hot-tub-glamping.ts --only-null --limit 50` after cooldown.
3. Re-run audit + driver SQL quarterly.
