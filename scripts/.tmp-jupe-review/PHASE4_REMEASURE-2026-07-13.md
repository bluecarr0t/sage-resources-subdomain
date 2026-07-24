# Jupe USA — Phase 4 remesure (2026-07-13)

Wave-1 expansion for branded **Jupe** modular shelters in `all_sage_data`.

Re-run:

```bash
npx tsx scripts/analyze-jupe-usa-inventory.ts
```

## Inventory change

| Metric | Phase 0 start | After wave 1 |
|--------|--------------:|-------------:|
| Sage USA `Jupe` rows | 4 | **7** |
| Hipcamp distinct Jupe labels | 0 | 0 |
| Mislabeled reclass queue | 0 | 0 |

Jupe is a branded partner product (not a Hipcamp unit_type taxonomy), so external gap lists are thin vs A-Frame. Wave-1 focused on verified operator sites.

## Wave-1 breakdown

| Source | Count | Notes |
|--------|------:|-------|
| Pre-existing published Jupe | 4 | Flying Flags Avila Beach, Jupe Redwoods, CampV, Trout Creek Wilderness Lodge |
| Phase 1 qty enrich | 1 | Flying Flags Avila Beach `quantity_of_units` null → **8** |
| Phase 3 curated net-new | 3 | Highland Ranch (MT), Indian Flat (CA), Grand Lake Lodge (CO) |
| **Total USA Jupe rows** | **7** | |

## Explicitly skipped

- **El Cosmico** — closed / relocating 2027
- **Akampa** — Mexico (out of USA scope)
- **Lake Hemet** — markets bell/glamping tents, not branded Jupe
- **OpenAI candidates** — mostly hallucinated jupe.com paths (see review doc)

## Tooling shipped

- `queries/jupe_usa_baseline_audit.sql`
- `scripts/analyze-jupe-usa-inventory.ts`
- `scripts/apply-jupe-reclass-enrich-us-2026-07-13.ts`
- `scripts/research-jupe-glamping-openai.ts`
- `scripts/insert-jupe-us-2026-07-13.ts`
- Migrations:
  - `scripts/migrations/jupe-enrich-us-2026-07-13.sql`
  - `scripts/migrations/insert-jupe-us-2026-07-13.sql`
- LLM examples include `Jupe` in `lib/glamping-unit-type-llm-guidance.ts`
- Normalizer already mapped `jupe` / `jupe tent` → `Jupe` (no change needed)

## Next wave

1. Admin publish for 3 `in_progress` inserts after ADR/coords review
2. Continue partner discovery via jupe.com case studies + operator websites (Business Insider historically cited ~15 USA sites)
3. Optional sibling for other unit types at Highland Ranch (Mirror Cabin already a separate campaign)
4. Do not trust OpenAI candidate JSONL without URL verification

## Artifacts

| File | Purpose |
|------|---------|
| `scripts/.tmp-jupe-review/sage-jupe-inventory.csv` | Current USA Jupe rows |
| `scripts/.tmp-jupe-review/PHASE1_REPORT-2026-07-13.md` | Qty enrich report |
| `scripts/.tmp-jupe-review/OPENAI_CANDIDATES_REVIEW-2026-07-13.md` | Hallucination review |
| `scripts/.tmp-jupe-review/insert-jupe-us-2026-07-13.sql` | Insert run log |
