# Glamping brand assignment audit (2026-05-21)

Audit method: deduped **published** property anchors in `all_glamping_properties`, name-based chain detection (aligned with `sage_chain_label_from_property_name`), compared to `glamping_brands` + `brand_id` assignments.

Run locally: `npx tsx scripts/audit-glamping-brand-assignments.ts --write-json scripts/.tmp-brand-audit.json`

## Coverage today

| Metric | Count |
|--------|------:|
| Published property anchors | 1,015 |
| With `brand_id` | 105 (10%) |
| Missing `brand_id` | 910 (90%) |

Most published rows are **single-site operators** with no multi-property brand prefix in the name. Brand registry work should focus on **named chains** first (highest ROI for `/brands` and brand detail pages).

## Priority 1 — Assign to existing brands

| Chain (from property name) | Target brand | Published unassigned (approx.) | Action |
|---------------------------|--------------|-------------------------------:|--------|
| `Timberline Glamping at …` | **Timberline Glamping Co.** (`timberline-glamping-co`) | ~80 | `brand_id` backfill + add `timberline glamping at` prefix to `sage_chain_label_from_property_name` |
| `Postcard Cabins …` | Postcard Cabins → Marriott Outdoor Collection | 0 | Already assigned |
| `Under Canvas` / `ULUM` | Under Canvas portfolio | 0 | Already assigned |
| `AutoCamp …` | AutoCamp (Hilton child) | 0 | Already assigned |

**Note:** Many Timberline rows are unit-level duplicates per outpost; deduped **property** count on `/brands` will be much lower than row count after backfill.

## Priority 2 — New brands to register

| Suggested slug | Display name | Published anchors | Open glamping rows | Notes |
|----------------|--------------|------------------:|-------------------:|-------|
| `the-glamping-collective` | The Glamping Collective | ~5–8 | 5 | Consistent prefix `The Glamping Collective` |
| `bliss-camps` | Bliss Camps | 8 | 8 | `Bliss Camps Glamping (Rocky Mountain Glamping)` |
| `terramor-outdoor-resort` | Terramor Outdoor Resort | 6 | 1+ | Name `Terramor Outdoor Resort` / `Terramor` |
| `westgate-river-ranch` | Westgate River Ranch | 2 | 2 | `Westgate River Ranch Resort & Rodeo` |
| `glamping-resorts-ltd` | Glamping Resorts Ltd | 2 | 2 | Canada: Sask Landing, Buffalo Pound Lake |
| `douglas-lake-ranch` | Douglas Lake Ranch | 1 | 19 | Mostly `in_progress` today; strong open multi-site signal |

## Priority 3 — Already in registry but under-linked

| Brand | Issue |
|-------|--------|
| **Collective Retreats** | 3 published branded; chain RPC shows 6 reported locations — OK |
| **Marriott / Hilton / Best Western** | Portfolio trees seeded; Postcard/AutoCamp/Backdrop children nested — continue property-level `brand_id` on **leaf** sub-brands |
| **Camp Ferncrest** | 4 branded; prefix backfill exists in seed migration |

## Chains in Sage AI RPC (open, 2+ locations) missing from registry

From `top_multi_location_chains` (not all published):

- Clayoquot Wilderness Lodge
- Jupe Redwoods
- Treehouse Point
- Desolation Hotel Hope Valley
- Eastwind Hotels Windham
- Bolt Farm Treehouse
- Miracle and Banbury Hot Springs
- Catskill Conestoga Wagon Outpost
- Camp Fimfo

Add only when you have 2+ **published** anchors and a stable naming pattern.

## Recommended migration

Apply `scripts/migrations/audit-brand-backfill-2026-05-21.sql`:

1. Extends `sage_chain_label_from_property_name` prefixes (Timberline at-sites, Terramor, Bliss, etc.).
2. Inserts six new `glamping_brands` rows.
3. Backfills `brand_id` on matching property names (published + in_progress where chain is clear).

After apply, re-run audit script and refresh `/brands`.

## Follow-up (2026-05-21, completed)

| Item | Result |
|------|--------|
| **Chain key alignment** | Migration `brand-chain-key-alignment-2026-05-21.sql` applied. `sage_chain_label_from_property_name` now returns `bliss camps` and `westgate river ranch` (matches `legacy_chain_key`). |
| **Douglas Lake Ranch** | Migration `publish-douglas-lake-ranch-brand-2026-05-21.sql` applied. **19 published** Canadian rows (`country = Canada`); eligible for `/brands` rollup and `/en/brand/douglas-lake-ranch`. |
| **Periodic audit + admin** | `/admin/brand-assignments` — refresh audit, dry-run/apply backfill. Linked from **Properties** admin header. CLI: `npm run audit:brands`, `npm run audit:brands:apply`. Shared logic: `lib/brand-assignment-audit.ts`, `lib/brand-chain-label.ts`. |

**Post-migration coverage (production):** ~422 published rows with `brand_id` (of ~1,871 published glamping rows). Remaining unassigned rows are mostly single-site operators without a chain prefix.

**Operational notes**

- Local `audit:brands` requires real `NEXT_PUBLIC_SUPABASE_URL` / service key in `.env.local` (not placeholder).
- Re-run audit after bulk property imports or new `glamping_brands` seeds.
- Use admin backfill for one-off chains; extend `SAGE_CHAIN_LABEL_PREFIXES` / SQL function when a stable prefix appears 2+ times.
