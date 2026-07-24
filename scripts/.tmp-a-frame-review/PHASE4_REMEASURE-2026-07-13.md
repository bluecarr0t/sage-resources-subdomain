# A-Frame USA — Phase 4 remesure (2026-07-13)

Wave-1 expansion complete against `all_sage_data`.

Re-run inventory:

```bash
npx tsx scripts/analyze-a-frame-usa-inventory.ts
```

## Inventory change

| Metric | Phase 0 start | After wave 1 |
|--------|--------------:|-------------:|
| Sage USA `A-Frame` rows | 6 | **31** |
| Hipcamp distinct USA A Frame | 103 | 103 |
| Hipcamp net-new vs Sage (name+state) | 102 | 89 |

Success bar (≥30 USA A-Frame rows): **met**.

## Wave-1 breakdown

| Source | Count | Notes |
|--------|------:|-------|
| Pre-existing published A-Frame | 6 | Baseline inventory |
| Phase 1 reclass (`unit_type` → A-Frame) | 7 | Tiny Town, Khushatta, Paloma Lake, Tobacco River Ranch, Bison Creek, Cedar Bloom, Treetopia |
| Phase 3 curated net-new inserts | 17 | `discovery_source=web_research_a_frame_us_2026_07_13` |
| Phase 3 sibling insert | 1 | Hohnstead Transforming A-Frame |
| **Total** | **31** | |

Published vs in_progress (post wave 1):

- **Published:** ~13 (baseline 6 + 7 reclasses that were already published)
- **in_progress:** ~18 (new inserts + Hohnstead sibling)

## Taxonomy / tooling shipped

- `aframe` / `aframes` aliases → `A-Frame` in [`lib/glamping-unit-type-normalize.ts`](../../lib/glamping-unit-type-normalize.ts)
- A-Frame added to LLM examples in [`lib/glamping-unit-type-llm-guidance.ts`](../../lib/glamping-unit-type-llm-guidance.ts)
- Scripts:
  - `scripts/analyze-a-frame-usa-inventory.ts`
  - `scripts/apply-a-frame-reclass-us-2026-07-13.ts`
  - `scripts/research-a-frame-glamping-openai.ts` (candidates only by default)
  - `scripts/insert-a-frame-us-2026-07-13.ts`
- SQL: `queries/a_frame_usa_baseline_audit.sql`
- Migrations:
  - `scripts/migrations/a-frame-reclass-siblings-us-2026-07-13.sql`
  - `scripts/migrations/insert-a-frame-us-2026-07-13.sql`

## Enrichment note

`scripts/research-rates-and-units-openai.ts` still targets legacy table `all_glamping_properties` — **not run** on the new cohort. Next step: point that script at `all_sage_data` (or filter `discovery_source=web_research_a_frame_us_2026_07_13`) and backfill ADR for `in_progress` rows before admin publish.

## Still open (next wave)

1. Ambiguous reclass (no auto-write): Lumen “A-Frame Tents”, Happydale `A-Frame/Cabin`, Mohican mixed cabins.
2. ~89 Hipcamp net-new candidates remain after fuzzy name+state match.
3. OpenAI candidate JSONL is **not** trusted for bulk insert — see `OPENAI_CANDIDATES_REVIEW-2026-07-13.md`.
4. Admin promote `research_status → published` after rates/coords review.
5. Spot-check `/glamping/a-frames` directory and market overview unit mix after publish.

## Artifacts

| File | Purpose |
|------|---------|
| `scripts/.tmp-a-frame-review/sage-a-frame-inventory.csv` | Current USA A-Frame rows |
| `scripts/.tmp-a-frame-review/hipcamp-gap-queue.csv` | Remaining external gap |
| `scripts/.tmp-a-frame-review/PHASE1_REPORT-2026-07-13.md` | Reclass report |
| `scripts/.tmp-a-frame-review/OPENAI_CANDIDATES_REVIEW-2026-07-13.md` | Hallucination review |
| `scripts/.tmp-a-frame-review/insert-a-frame-us-2026-07-13.sql` | Insert run log |
