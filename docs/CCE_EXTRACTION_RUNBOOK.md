# CCE PDF extraction — runbook

How to run Marshall & Swift **Commercial Cost Explorer** extraction, interpret results, and choose between a **full re-extract** vs **in-database** fixes.

## What “extract version” means

| Input | `extraction_date` (DB) |
|--------|-------------------------|
| PDF filename contains month/year (e.g. `CCE_March_2026.pdf`) | First day of that month (e.g. `2026-03-01`) |
| Filename has no parseable date | Today’s date (see [`profile_extraction_date`](../scripts/cce_extract_profile.py) / filename parsing) |
| Profile `extraction_date_override` (`YYYY-MM-DD`) | That calendar day (overrides filename) |

- **`cce_cost_rows`** and **`cce_component_costs`** rows written by the script include this **`extraction_date`**.
- Before insert, the script **deletes existing rows with the same `extraction_date`** (replace-per-edition), unless you use wipe flags below.

## Commands

```bash
# Dependencies
pip install -r requirements.txt

# Dry run (no DB): counts + sample rows + component reject/sparse stats
python3 scripts/extract-cce-pdf.py --dry-run --pdf path/to/CCE_Month_Year.pdf

# Edition profile (default: config/cce-profiles/default.json)
python3 scripts/extract-cce-pdf.py --dry-run --pdf path/to.pdf --profile march_2026
python3 scripts/extract-cce-pdf.py --dry-run --pdf path/to.pdf --profile config/cce-profiles/example_march_2026.json

# Full load (requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local)
python3 scripts/extract-cce-pdf.py --pdf path/to/CCE_Month_Year.pdf

# Re-normalize item_name in DB (after NORMALIZATION_VERSION bump); run migration for flags first
python3 scripts/reclean-cce-component-items.py --dry-run
python3 scripts/reclean-cce-component-items.py --extraction-date 2026-03-01

# Dump word geometry for layout tuning (golden pages)
python3 scripts/dump_cce_page_words.py --pdf path/to.pdf --page 27 --json

# Optional: wipe component table first instead of replace-by-date
python3 scripts/extract-cce-pdf.py --pdf path/to/CCE_Month_Year.pdf --clear-cce-component-costs
```

Post-load checks:

```bash
python3 scripts/validate-cce-extraction.py
python3 scripts/test-component-data-quality.py
```

Unit tests (no PDF, no DB):

```bash
python3 scripts/__tests__/test_cce_component_item_extract.py -v
python3 scripts/__tests__/test_cce_component_table_gate.py -v
```

## Expected row counts (fill per edition)

After a successful run, record counts from the script summary or **`cce_extraction_metadata`** (latest row):

| Edition (PDF) | `component_rows_count` | `cost_rows_count` | Notes |
|---------------|------------------------|-------------------|--------|
| *(example)* March 2026 | *TBD* | *TBD* | Update after first golden run |

Use this table to spot **regressions** when changing [`scripts/cce_component_item_extract.py`](../scripts/cce_component_item_extract.py) or [`scripts/extract-cce-pdf.py`](../scripts/extract-cce-pdf.py).

## When to re-run full extract vs clean in DB

| Situation | Prefer |
|-----------|--------|
| Logic change to **list/table parsing**, **tier monotonicity**, **ITEM normalization**, or **section headers** | **Full re-extract** for that PDF edition (same `extraction_date` → replace rows). |
| New **`extraction_date` / unique index** migration ([`add-cce-component-costs-extraction-date.sql`](../scripts/migrations/add-cce-component-costs-extraction-date.sql)) | Run migration in Supabase, then **re-extract** once. |
| One-off bad rows, wrong section on a few pages | **SQL delete/update** or a small script; no need to re-run whole PDF if scope is tiny. |
| Only **`cce_cost_rows`** schema change (not components) | Re-extract or targeted SQL per table. |
| Cosmetic **`item_name`** cleanup only, extract logic unchanged | Run **[`scripts/reclean-cce-component-items.py`](../scripts/reclean-cce-component-items.py)** (bumps `normalization_version`) or full re-extract. |
| **`NORMALIZATION_VERSION`** bump in [`cce_component_item_extract.py`](../scripts/cce_component_item_extract.py) | **Re-clean** rows with older `normalization_version`, or re-extract. |

## Edition profiles ([`config/cce-profiles/`](../config/cce-profiles/))

JSON files define **`list_line_strategy`** (`auto` | `dots` | `spaces`), **`page_rules.skip_pages`**, **`layout`** thresholds, **`layout_list_pages`** (when `layout.enabled`, bbox list parser replaces text lines for those pages only), **`section_aliases`**, and extra header denylists. Copy **`example_march_2026.json`** to a real edition name and pass **`--profile`**.

For list-style pages, a **continuation pre-pass** ([`join_list_continuation_lines`](../scripts/cce_component_item_extract.py)) joins a line with no cost tail to following text-only lines until the next line that parses with **four** tier numbers, then runs **`parse_list_cost_line`** on the merged string. Section/subsection header lines are never glued across.

### Component grid gating (`component_table`)

Grid tables without both **`CLASS`** and **`TYPE`** in the merged header are candidates for **`cce_component_costs`**. To avoid **multiplier / gross-area / units** matrices leaking into components, extraction applies:

- **Denylist** — merged header (and optionally full page text) is checked for phrases such as `AREA MULTIPLIER`, `GROSS AREA`, `TOTAL AREA`, `BASEMENT`, etc., plus profile extras.
- **Allowlist** — the table is kept only if the header looks like **four-tier money** (`LOW` + `GOOD` + `AVG`/`AVERAGE` + `EXCL`/`EXCELLENT`) **or** the first column is clearly **`ITEM` / `DESCRIPTION` / `COMPONENT`** (and not **`TYPE`** alone).
- **Numeric `cost_cols` fallback** — the old “≥2 numeric columns → assume columns 1–4” shortcut is **off by default**. Set **`component_table.allow_numeric_fallback`: `true`** in the edition profile only if a legitimate grid is dropped and headers are ambiguous.

Profile keys (under **`component_table`**):

| Key | Purpose |
|-----|---------|
| `header_substrings_exclude` | Extra uppercase substrings; if any appear in the merged header row, skip component grid extraction for that table. |
| `optional_page_text_exclude` | If `true`, the same phrases are also matched against the **full page text** (catches broken table headers). |
| `allow_numeric_fallback` | If `true`, re-enable the legacy numeric-column fallback after allow/deny gates pass. |

If **`component_rows_count`** drops after an upgrade, compare **`--dry-run`** counts to the table in this doc, then tune **`header_substrings_exclude`** or enable **`allow_numeric_fallback`** for that edition only.

Rows emitted from gated grid paths set **`extraction_flags.component_table_gated`** (filterable via the admin **`cce-component-costs`** API).

### Calculator Method vs component grids

Pages whose tables have **both `CLASS` and `TYPE`** in the header use the **cost row** pipeline: one PDF row per quality tier → **`cce_cost_rows`** with normalized **`quality_type`** and **`cost_sq_m` / `cost_cu_ft` / `cost_sq_ft`**. Those tables should **not** populate **`cce_component_costs`** via the component-grid branch.

**Regression check:** dry-run a PDF section you know is Calculator Method (e.g. Extended-Stay Motels). Confirm output counts show **`cost_rows`** for that content and that the same pages do **not** add spurious **`component_rows`** for those CLASS/TYPE tables.

### Optional schema (`quality_type_raw`, etc.)

**Default:** no new columns on **`cce_cost_rows`**. The row-per-tier model already covers five tiers via **`quality_type`**. Add **`quality_type_raw`** or similar **only after product sign-off** if you need to preserve raw PDF labels in the database.

## Migrations checklist (Supabase)

Apply in order if starting fresh (see `scripts/migrations/`):

- Core CCE tables: `create-cce-costs-tables.sql`
- `cce_cost_rows.extraction_date`: `add-cce-cost-rows-extraction-date.sql`
- Components: `add-cce-component-occupancy-id.sql` (if using occupancy linkage)
- Components replace + dedupe: **`add-cce-component-costs-extraction-date.sql`**
- Component **`extraction_flags`** + **`normalization_version`**: **`add-cce-component-costs-flags.sql`**
- RLS / percent unique: `cce-audit-fixes.sql`

## Golden pages (manual regression)

Problematic PDF pages called out in audits (e.g. **~27**, **~540**) are not committed as PDFs in-repo. After changing parsers:

1. Run **`--dry-run --start-page N --end-page N`** for those page numbers.
2. Inspect printed component samples and **`rejected_non_monotonic`** / **`sparse_tier_hints`** in the dry-run footer.
3. Append stable **line-level** expectations to [`scripts/__tests__/test_cce_component_item_extract.py`](../scripts/__tests__/test_cce_component_item_extract.py) when you capture representative strings.

## Related docs

- [`docs/audit/CCE_COMPONENT_ITEM_RECOMMENDATIONS.md`](./audit/CCE_COMPONENT_ITEM_RECOMMENDATIONS.md) — backlog and future features  
- [`docs/CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md`](./CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md) — issue history + implemented hooks  
- [`docs/audit/CCE_COMPONENT_ITEM_EXTRACTION_AUDIT.md`](./audit/CCE_COMPONENT_ITEM_EXTRACTION_AUDIT.md) — technical ITEM/column analysis  
