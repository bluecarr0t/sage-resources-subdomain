# Jupe USA — Phase 0 baseline (2026-07-13)

Audit of `all_sage_data` Jupe inventory vs Hipcamp `Jupe` gap.

Re-run:

```bash
npx tsx scripts/analyze-jupe-usa-inventory.ts
```

## Summary

| Metric | Count |
|--------|------:|
| Sage USA `Jupe` rows | 7 |
| Reclass queue (any Jupe signal, wrong unit_type) | 0 |
| Recommended retype | 0 |
| Skip (property already has Jupe) | 0 |
| Ambiguous (review) | 0 |
| Description-only signal | 0 |
| Hipcamp USA distinct Jupe listings | 0 |
| Hipcamp already-in-Sage (name+state) | 0 |
| Hipcamp net-new candidates | 0 |

## Current Sage Jupe inventory

| id | Property | Site | City, ST | ADR |
|----|----------|------|----------|-----|
| 13115 | Highland Ranch | Jupe Tent | Kalispell, MT |  |
| 13117 | Grand Lake Lodge | Jupe | Grand Lake, CO |  |
| 9562 | Flying Flags Avila Beach | Jupe Tent | Avila Beach, CA | 251.25 |
| 10319 | Trout Creek Wilderness Lodge | Jupes | Molalla, OR | 289.33 |
| 10310 | Jupe Redwoods | Jupes | Davenport, CA | 190 |
| 10313 | CampV | Jupes | Vancorum, CO | 150 |
| 13116 | Indian Flat Campground | Jupe Tent | El Portal, CA |  |

## Phase 1 retype targets (recommended_action=retype)


## Ambiguous (do not auto-retype)


## Exports

| File | Purpose |
|------|---------|
| `sage-jupe-inventory.csv` | Current USA Jupe rows |
| `reclass-queue.csv` | Mislabeled / sibling candidates |
| `hipcamp-gap-queue.csv` | Distinct Hipcamp Jupe listings + match status |

## Phase 1 / 2 handoff

1. **Phase 1:** Retype clear `site_name` Jupe rows; skip properties that already have an `Jupe` sibling.
2. **Phase 2:** Research net-new USA Jupes from Hipcamp gap + OpenAI discovery; write candidates to `openai-candidates.jsonl`.
3. **Phase 3:** Curated insert into `all_sage_data` with `discovery_source=web_research_jupe_us_2026_07_13`.
