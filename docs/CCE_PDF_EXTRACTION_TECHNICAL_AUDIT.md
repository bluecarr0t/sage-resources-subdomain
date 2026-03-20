# CCE PDF Extraction – Deep Technical Audit

**Date:** March 2026  
**Scope:** `scripts/extract-cce-pdf.py`, `scripts/audit-cce-pdf-extraction.py`, database schema, API, admin UI  
**PDF:** Marshall & Swift CCE (Commercial Cost Explorer) – 724 pages

---

## Executive Summary

The CCE extraction pipeline handles three data types: (1) occupancy cost tables (CLASS|TYPE|EXTERIOR|SQ.FT), (2) cost percentage tables (ELECTRICAL/PLUMBING/HVAC), and (3) component costs (unit-in-place, including list-style pages). The implementation is functional but has several bugs, gaps, and opportunities for improvement.

---

## 1. Architecture Overview

```
PDF (pdfplumber) → extract_text() / extract_tables()
       ↓
  Per-page processing:
  - Section detection (SECTION N PAGE M)
  - Occupancy detection (NAME (code))
  - Percentage tables (text-based, PCT_LINE_RE)
  - List-style costs (when tables=[])
  - Grid tables (occupancy cost, component cost)
       ↓
  In-memory: occupancies, cost_rows, cost_pct_rows, component_rows
       ↓
  Supabase: cce_occupancies, cce_cost_rows, cce_cost_percentages, cce_component_costs
```

---

## 2. Issues (Bugs & Edge Cases)

### 2.1 Extraction Script

| ID | Severity | Issue | Location | Notes |
|----|----------|-------|----------|-------|
| E1 | **High** | **Section name captures dates/brand names** | L206 | Regex `SECTION\s+\d+\s+PAGE\s+\d+\s+([A-Z][A-Za-z\s]+?)(?:\s|$|\n)` captures first word after page ref. "November 2024" → "November", "Marshall & Swift" → "Marshall". |
| E2 | **High** | **Alternate cost format not extracted** | L295+ | Tables where first row is data (e.g. `26.50 \| 265.00 \| 2852.43 \| C \| EXCELLENT \| FINE INTERIOR...`) are classified as "OTHER". No header row; columns: Sq.M \| Sq.Ft \| Cu.Ft \| Class \| Type \| Exterior \| Interior. |
| E3 | **Medium** | **False-positive occupancies** | L280-289 | `OCCUPANCY_NAME_CODE` matches "MSB Proprietary Information (4)", "License Agreement (30)". Filter `code < 50` helps but code 50+ can still be junk. |
| E4 | **Medium** | **Dead code: OCCUPANCY_HEADER** | L144-147 | `OCCUPANCY_HEADER` regex is defined but never used. |
| E5 | **Medium** | **Component tables require current_section_name** | L329 | When `current_section_name` is wrong (e.g. "November"), component rows are skipped or get wrong section. |
| E6 | **Medium** | **List-style runs only when tables=[]** | L311-373 | Pages with both grid tables AND list-style data (e.g. elevators + balconies) only extract grid; list-style is skipped. |
| E7 | **Low** | **Operator precedence** | L408 | `("COST" in c) and ("CU" in c)` – current `("COST" in c) and "CU" in c` works by accident; `"CU" in c` is always False for typical headers. |
| E8 | **Low** | **PCT_CATEGORIES hardcoded for ELECTRICAL** | L159-166 | PLUMBING/HVAC may have different category columns; single mapping may misalign. |
| E9 | **Low** | **No occupancy_id for component_rows** | Schema | `cce_component_costs` has no `occupancy_id`; components are section-scoped. Some components may be occupancy-specific. |
| E10 | **Low** | **parse_numeric doesn't handle currency** | L34-40 | "$1,234.56" would fail (comma removed, $ remains). Unlikely in PDF but edge case. |

### 2.2 PDF Layout Assumptions

| ID | Assumption | Risk |
|----|------------|------|
| P1 | `extract_tables()` returns grid tables only | List-style pages (19+ in 1-200) handled by text fallback. |
| P2 | Header row always row 0 | Alternate format has data in row 0; not handled. |
| P3 | Column order: CLASS, TYPE, EXTERIOR, INTERIOR, ... | Some tables may transpose or omit columns. |
| P4 | Occupancy spans contiguous pages | Multi-section occupancies or split tables may misassign. |

### 2.3 Data Quality

| ID | Issue | Impact |
|----|-------|--------|
| D1 | Building class newlines | `D\nMASONRY\nVENEER` in DB; normalized on read but filters may miss. |
| D2 | Quality type variants | "Very good" vs "Very Good" – normalized in extraction; filter expansion handles. |
| D3 | Cost % duplicates | Mitigated by `cce-audit-fixes.sql` unique constraint + upsert. |
| D4 | Component cost_tier always None | col_1..col_4 store Low/Avg/Good/Excl but tier label not captured. |

---

## 3. Improvements (Prioritized)

### 3.1 High Priority

| # | Improvement | Effort | Impact | Implementation |
|---|-------------|--------|--------|----------------|
| 1 | **Fix section name detection** | Low | High | Exclude month names, "Marshall", "Calculator", "December", etc. Use negative lookahead or blocklist. |
| 2 | **Extract alternate cost format** | Medium | High | Detect tables where row 0 has 3 decimals + Class + Type; treat as headerless, infer column map from first N rows. |
| 3 | **Stricter occupancy filter** | Low | Medium | Add: `code not in (4, 30, ...)` blocklist, or require "CALCULATOR" nearby, or name pattern (no "Proprietary", "License"). |

### 3.2 Medium Priority

| # | Improvement | Effort | Impact | Implementation |
|---|-------------|--------|--------|----------------|
| 4 | **Run list-style on pages with tables** | Low | Medium | When tables exist, also run list-style parsing on text; merge component_rows (dedupe by section+item+page). |
| 5 | **Remove dead OCCUPANCY_HEADER** | Trivial | Low | Delete or use for validation. |
| 6 | **Fix CU. FT col_map precedence** | Trivial | Low | `("COST" in c) and ("CU" in c)`. |
| 7 | **Add --verbose mode** | Low | Low | Log page num, table count, rows extracted per page. |
| 8 | **Section name from subsection** | Medium | Medium | When "EXTERIOR BALCONIES" or "CANOPIES" found, prefer over current_section_name for components. |

### 3.3 Low Priority

| # | Improvement | Effort | Impact |
|---|-------------|--------|--------|
| 9 | **parse_numeric: strip $** | Trivial | Low |
| 10 | **PCT_CATEGORIES per section** | Medium | Low |
| 11 | **Extraction version/date metadata** | Low | Low |

---

## 4. Future Features

### 4.1 Extraction

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Alternate format support** | Headerless cost tables (data in row 0) | Medium |
| **Modifier tables** | AVERAGE WALL HEIGHT, PERIMETER multipliers | High |
| **Shape/area tables** | APPROXIMATELY SQUARE, LONG RECTANGLE | Medium |
| **Occupancy-specific components** | Link components to occupancy when on same page | Medium |
| **Incremental extraction** | Track last page, only process new | Medium |
| **PDF upload via UI** | Admin upload → trigger extraction | High |
| **Validation report** | Post-extraction: row counts, outliers, missing | Low |
| **Multi-PDF / edition tracking** | Compare CCE_March_2026 vs CCE_Sept_2026 | High |

### 4.2 Audit Script

| Feature | Description |
|---------|-------------|
| **Detect alternate format** | Flag tables with numeric row 0 + Class/Type |
| **Section name quality** | Report pages where section_name is month/brand |
| **Extraction coverage %** | Rows extracted vs estimated total |
| **JSON output** | Machine-readable for CI/automation |

### 4.3 Database & API

| Feature | Description |
|---------|-------------|
| **occupancy_id on component_costs** | Optional FK when component is occupancy-scoped |
| **cost_tier on component_costs** | "Low", "Avg", "Good", "Excl" from col position |
| **extraction_metadata table** | pdf_path, extracted_at, page_range, row_counts |
| **Idempotent re-extraction** | Upsert by (occupancy_id, building_class, quality_type, ...) for cost_rows |

---

## 5. Code Quality Notes

### 5.1 Strengths

- Clear separation: occupancy vs percentage vs component
- Normalization (building_class, quality_type) reduces variants
- List-style fallback when `extract_tables()` is empty
- Batch inserts with error handling
- Dry-run mode for validation

### 5.2 Technical Debt

- **Python/TypeScript duplication:** `QUALITY_TYPE_MAP` in Python, `lib/cce-quality-types.ts` in TS. Drift risk.
- **Magic numbers:** `code < 50`, `len(nums) < 9`, `len(occ_name) < 3` – consider named constants.
- **Regex sprawl:** 8+ compiled regexes in main(); could move to module-level or config.

---

## 6. Test Recommendations

| Test | Description |
|------|-------------|
| **Unit: parse_numeric** | `"1,234.56"` → 1234.56, `"$100"` → 100 or None, `""` → None |
| **Unit: normalize_building_class** | `"D\nPOLE"` → "D POLE", `"CDS"` → "C-D-S" |
| **Unit: normalize_quality_type** | `"cheap"` → "Low cost", `"very good"` → "Very Good" |
| **Integration: single page** | Page 89 (EXTERIOR BALCONIES) → N component rows |
| **Integration: occupancy page** | Page with CLASS\|TYPE\|EXTERIOR → N cost rows |
| **Regression: dry-run row counts** | After changes, compare to baseline |

---

## 7. Audit Run Summary (Pages 1–200)

From `audit-cce-pdf-extraction.py --start-page 1 --end-page 200`:

| Metric | Value |
|--------|-------|
| Occupancy cost tables | 62 (all with data) |
| Component-style tables | 41 |
| List-style pages | 19 |
| Percentage table pages | 0 (in 1–200; likely later) |
| Unknown tables | 159 |

**Section name quality:** Many sections show "February", "November", "Marshall", "Calculator" – incorrect.

---

## 8. Recommended Priority Order

1. **Fix section name detection** (E1) – blocks correct component section attribution
2. **Add alternate cost format extraction** (E2) – recovers significant missed data
3. **Stricter occupancy filter** (E3) – reduces junk occupancies
4. **Run list-style when tables exist** (E6) – recovers mixed-format pages
5. **Cleanup: dead code, operator precedence** (E4, E7)

---

## Appendix A: Regex Reference

| Name | Pattern | Purpose |
|------|---------|---------|
| OCCUPANCY_HEADER | `CLASS\s*\|\s*TYPE\s*\|\s*EXTERIOR\s*WALLS` | Unused |
| OCCUPANCY_NAME_CODE | `([A-Z][A-Za-z\s\-/]+?)\s*\((\d+)\)` | Occupancy name (code) |
| SECTION_PAGE | `SECTION\s+(\d+)\s+PAGE\s+(\d+)` | Section + page numbers |
| PCT_LINE_RE | `^(.+?)\s*[\.\s]{2,}\s+([\d\.\s]+)$` | Percentage table lines |
| LIST_COST_LINE_RE | `^(.+?)\s+[\.\s]{2,}\s+([\d\.\s]+)$` | List-style cost lines |
| SUBSECTION_HEADER_RE | `^([A-Z][A-Za-z\s/]+?)\s*\(Apply to\s+[^)]+\)\s*$` | "EXTERIOR BALCONIES (Apply to...)" |
| LIST_SECTION_FALLBACK_RE | `^([A-Z][A-Za-z\s/]+(?:AND\|OR)\s+[A-Za-z\s/]+)\s*$` | "BALCONIES AND CANOPIES" |
| LIST_SECTION_SIMPLE_RE | `^([A-Z][A-Za-z\s/]+(?:BALCONIES\|CANOPIES\|...))\s*$` | "EXTERIOR BALCONIES" |

---

## Appendix B: Table Schemas

**cce_occupancies:** id, occupancy_code, occupancy_name, section_number, page_start, page_end  
**cce_cost_rows:** id, occupancy_id, building_class, quality_type, exterior_walls, interior_finish, lighting_plumbing, heat, cost_sq_m, cost_cu_ft, cost_sq_ft, source_page  
**cce_cost_percentages:** id, section_name, section_number, occupancy, category, low_pct, median_pct, high_pct, source_page  
**cce_component_costs:** id, section_name, item_name, cost_tier, col_1, col_2, col_3, col_4, source_page  
