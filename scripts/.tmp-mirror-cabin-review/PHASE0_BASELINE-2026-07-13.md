# Mirror Cabin USA — Phase 0 baseline (2026-07-13)

Audit of `csv/ood-deals-13847150-271.csv` against `all_sage_data` (3,446 rows).

Re-run:

```bash
npx tsx scripts/analyze-ood-deals-vs-glamping-properties.ts
```

## Summary

| Metric | Count |
|--------|------:|
| Unique ÖÖD deal locations | 137 |
| Matched deal rows | 41 |
| Unique matched properties | 35 |
| Siblings needing Mirror Cabin row | 34 |
| Already has Mirror Cabin (ÖÖD match) | 1 (Two Capes Lookout) |
| No-match deals | 96 |
| High-priority net-new (street address) | 56 |
| Medium (city+state) | 28 |
| Low (vague) | 12 |
| USA mirror/glass/ÖÖD inventory signals | 10 |

City+state-only matches are **low confidence** (many false positives: KOAs, hotels). Prefer seed list + medium+ confidence for Phase 1.

## Seed list (doc 8) coverage

| Seed | Status | Property | id | city, state |
|------|--------|----------|----|-------------|
| Borealis Basecamp | needs_sibling | Borealis Basecamp | 9928* | Fairbanks, AK |
| Heritage Ranch MT | needs_sibling | Heritage Ranch MT | 9612 | Bozeman, MT |
| Inn Town Campground | needs_sibling | Inn Town Campground | 10103 | Nevada City, CA |
| Hidden Flower Tiny Farm | needs_sibling | Hidden Flower Tiny Farm | 9795 | Asheville, NC |
| Two Capes Lookout | already_has_mirror | Two Capes Lookout | 10356 | Cloverdale, OR |
| Dupont Yurts | needs_sibling | Dupont Yurts | 9792 | Hendersonville, NC |
| The Yurtopian | needs_sibling | The Yurtopian | 9831 | Dripping Springs, TX |
| The Yurtopian | needs_sibling | The Yurtopian Wimberley | 12075 | Wimberley, TX |
| Collective Governors Island | needs_sibling | Collective Retreats Governors Island | 13010 | New York, NY |

\*ÖÖD zip match also hit row id=9574 on the same `property_id`; use `property_id` when inserting siblings.

**Phase 1 sibling insert target:** 7 seed properties (8 if counting both Yurtopian locations), excluding Two Capes.

## Mis-tagged Mirror / glass inventory (sibling candidates beyond ÖÖD)

From `mirror-inventory-audit.csv` — already in Sage but not always `unit_type = Mirror Cabin`:

| Property | site_name | current unit_type | Action |
|----------|-----------|-------------------|--------|
| Two Capes Lookout | South Cape Mirror Cabin | Mirror Cabin | Skip (has mirror) |
| Two Capes Lookout | Mirror Cabin | Cabin | Optional cleanup / confirm |
| The Retreat on the Hill | Mirror House | Mirror Cabin | Skip |
| 7 Ranch Getaways | Mirage Mirror Cabin | Mirror Cabin | Skip |
| East Zion Resort | Mirror House | Tiny Home | Candidate sibling or retype |
| Bolt Farm Treehouse | Mirror Cabins | Tiny Home | Candidate sibling or retype |
| The Glamping Collective | Glass Cabin / Luxe Glass Cabin | Cabin | Candidate sibling (glass → Mirror Cabin?) |
| Space Cowboys | Mirrored Space Pod | Dome | Review (pod vs cabin) |

## Exports

| File | Purpose |
|------|---------|
| `siblings-queue.csv` | All ÖÖD-matched properties missing Mirror Cabin (incl. low-confidence) |
| `siblings-phase1-recommended.csv` | Seed list + medium+ confidence only (12 rows) |
| `already-has-mirror.csv` | Skip list for sibling inserts |
| `net-new-ood-queue.csv` | Unmatched ÖÖD deals by priority |
| `mirror-inventory-audit.csv` | USA mirror/glass/ÖÖD signals already in Sage |
| `seed-list-coverage.csv` | Doc-8 coverage independent of fuzzy match |

## Phase 1 / 2 handoff

1. **Phase 1:** Insert Mirror Cabin siblings for seed `needs_sibling` rows (verify ÖÖD still on-site). Treat non-seed medium-confidence matches as optional after web verify (Lagom may be wrong for Yurtopian zip; KOA likely false positive).
2. **Phase 2:** Work `net-new-ood-queue.csv` priority=high; reject private residential installs.
3. Do **not** auto-insert low-confidence city+state siblings.
