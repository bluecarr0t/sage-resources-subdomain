# CCE Component Extraction Improvements

Based on analysis of `/admin/cost-explorer?tab=component` data quality issues.

## Test Script

Run the component data quality test:

```bash
python3 scripts/test-component-data-quality.py
python3 scripts/test-component-data-quality.py --json
```

Or use the full validation report (includes component checks):

```bash
python3 scripts/validate-cce-extraction.py
```

## Issues Identified

### 1. Duplicate Rows
**Symptom:** Same `section_name`, `item_name`, `source_page` appears multiple times.

**Cause:** List-style and grid extraction can both emit the same row; `list_seen` dedupes within a page but not across extraction passes. Some pages may be parsed twice (e.g. list + table).

**Fix:**
- Add DB-level unique constraint or dedupe before insert
- Ensure `list_seen` key is consistent across list vs table extraction
- Consider upsert with `ON CONFLICT (section_name, item_name, source_page)` if unique constraint exists

### 2. Section "Add for" (Sub-header as Section)
**Symptom:** Section shows "add for ground-loop heat", "Add for ornate finishes," instead of main section (e.g. HEAT, WALL COSTS).

**Cause:** Lines like "Add for ground-loop heat" match `LIST_SECTION_HEADER_RE` (broad pattern) and get used as `list_section_name`. These are add-on modifiers, not main sections.

**Fix:** Block "Add for" / "add for" from being used as section names:
- Add to `LIST_SKIP_SECTIONS` or a new blocklist
- Or: `if line.strip().lower().startswith("add for"): continue` before updating `list_section_name`

### 3. Section Trailing Punctuation
**Symptom:** "Add for ornate finishes," has trailing comma.

**Cause:** Section name is captured as-is from the PDF line.

**Fix:** Strip trailing `,;` from `list_section_name` when assigning:
```python
list_section_name = cand.rstrip(",;")
```

### 4. Item Contains Cost Numbers (Column Bleed)
**Symptom:** `item_name` contains "34.34 57.80 97.31 3.19 5.37 9.04 add per additional story" – cost values from adjacent columns.

**Cause:** `LIST_COST_LINE_RE` captures everything before the leader dots as item. When PDF layout has numbers in the description column (e.g. multi-column table), they get merged into item.

**Fix:**
- Detect and strip trailing cost-like number sequences from item: `\d{1,2}\.\d{2}\s+\d{1,2}\.\d{2}...`
- Or: Use a stricter regex that stops at the first "number number number" pattern
- For grid tables: ensure `desc_col` and `cost_cols` don't overlap

### 5. Column Shift (Excellent < Good)
**Symptom:** col_4 (Excellent) = $2.01 when col_3 (Good) = $49.08.

**Cause:** Decimal misalignment or column misparse. Possibly:
- PDF has 6+ columns and we're reading wrong indices
- Leader dots or spacing causes numbers to shift
- Per-unit vs per-sqft values mixed

**Fix:**
- Validate monotonicity: col_1 ≤ col_2 ≤ col_3 ≤ col_4 (when all present)
- Skip or flag rows where col_4 < col_3 * 0.5
- Review page 130 layout for "source" / heat pump rows

### 6. Low > High Anomalies
**Symptom:** col_2 (Average) < col_1 (Low) – e.g. $66 vs $2.

**Cause:** Already partially handled (skip when col_2 < col_1 * 0.1). May need to broaden or add col_3/col_4 checks.

**Fix:** Extend the skip logic to all column pairs when validating monotonicity.

## Extraction Script Changes (Recommended)

1. **Block "add for" sections:**
```python
ADD_FOR_BLOCKLIST = re.compile(r"^[Aa]dd\s+for\s+", re.I)
# In process_list_lines, when setting list_section_name:
if ADD_FOR_BLOCKLIST.match(cand):
    continue
```

2. **Strip trailing punctuation from section:**
```python
list_section_name = cand.rstrip(",;").strip()
```

3. **Dedupe before insert:** Use a set/dict keyed by (section_name, item_name, source_page) and keep last occurrence.

4. **Item cost bleed filter:** Before appending, check if item ends with cost-like numbers and strip:
```python
# If item ends with "34.34 57.80 97.31" etc., truncate before that
m = re.search(r"\s+\d{1,2}\.\d{2}(\s+\d{1,2}\.\d{2}){2,}\s*$", item)
if m:
    item = item[:m.start()].strip()
```

5. **Monotonicity check:** Skip rows where col_4 < col_3 * 0.5 (when both present).

## Implemented (2026): tier order, ITEM normalize, list parsing, DB replace

- **Helpers:** [`scripts/cce_component_item_extract.py`](../scripts/cce_component_item_extract.py) — `tier_order_ok`, `normalize_component_item_name`, `parse_list_cost_line`, `section_name_is_weak_short`, `list_section_header_is_truncated_junk`, `LIST_TRUNCATED_AND_JUNK_HEADERS`.
- **Extract:** [`scripts/extract-cce-pdf.py`](../scripts/extract-cce-pdf.py) applies the above on list + table paths; rejects non-monotonic rows; counts sparse table rows; dry-run prints reject/sparse stats.
- **DB:** Run [`scripts/migrations/add-cce-component-costs-extraction-date.sql`](../scripts/migrations/add-cce-component-costs-extraction-date.sql) — adds `extraction_date`, backfills, dedupes, unique index on `(section_name, item_name, source_page, extraction_date)`. Extract deletes existing rows for the same `extraction_date` before insert (unless `--clear-cce-component-costs`).
- **Tests:** `python3 scripts/__tests__/test_cce_component_item_extract.py`
- **Runbook:** [`docs/CCE_EXTRACTION_RUNBOOK.md`](../CCE_EXTRACTION_RUNBOOK.md) — commands, edition → `extraction_date`, re-extract vs in-DB clean, golden pages.
- **Profiles:** [`config/cce-profiles/`](../config/cce-profiles/) + `--profile`; [`scripts/cce_extract_profile.py`](../scripts/cce_extract_profile.py).
- **QA flags / re-clean:** [`scripts/migrations/add-cce-component-costs-flags.sql`](../scripts/migrations/add-cce-component-costs-flags.sql), [`scripts/reclean-cce-component-items.py`](../scripts/reclean-cce-component-items.py), layout helper [`scripts/cce_layout_list_parse.py`](../scripts/cce_layout_list_parse.py).
