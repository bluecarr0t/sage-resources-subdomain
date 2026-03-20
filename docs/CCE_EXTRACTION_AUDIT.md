# CCE Extraction & Admin Page – Audit Report

**Date:** March 2026  
**Scope:** PDF extraction script, database schema, API routes, `/admin/cce-costs` page

---

## 1. Issues (Bugs & Edge Cases)

### 1.1 Extraction Script

| Issue | Severity | Description |
|-------|----------|-------------|
| **False-positive occupancies** | Medium | `OCCUPANCY_NAME_CODE` regex matches license text (e.g. "MSB Proprietary Information (4)", "License Agreement (30)"). ~305 occupancies include junk; valid subset is ~50–100. |
| **Building class pollution** | Medium | `building_class` contains newlines (`D\nMASONRY\nVENEER`, `C\nMILL`, `D\nPOLE`) and merged values (`CDS`) from PDF cell merging. Not normalized before insert. |
| **Operator precedence bug** | Low | Line 252: `"COST" in c and "CU" in c` – Python evaluates `"COST" in c and "CU"` first, then `c`; works by accident. Should be `("COST" in c) and ("CU" in c)`. |
| **Cost % duplicates on re-run** | Medium | No `--clear-cce-cost-percentages`; re-running extraction appends to `cce_cost_percentages` without deduplication. |
| **Percentage table detection too broad** | Low | `"OCCUPANCY" in text and "LOW" in text and "MEDIAN" in text` can match non-percentage tables. Could add `"TOTAL ELECTRICAL"` or `"SERVICE & DISTRIBUTION"` as required. |
| **`cce_component_costs` extraction** | Resolved | List-style pages (e.g. BALCONIES, CANOPIES) now parsed via text when `extract_tables()` returns empty. |

### 1.2 Database

| Issue | Severity | Description |
|-------|----------|-------------|
| **No RLS** | Low | CCE tables have no Row Level Security. Admin routes use `withAdminAuth`; direct Supabase access is unrestricted. |
| **No deduplication on cost %** | Medium | `cce_cost_percentages` has no unique constraint; re-extraction can create duplicate rows. |
| **Missing `updated_at`** | Low | `cce_cost_percentages` has no `updated_at`; `cce_cost_rows` has no `updated_at`. |

### 1.3 API

| Issue | Severity | Description |
|-------|----------|-------------|
| **Search on nested table** | Low | `cce_occupancies.occupancy_name.ilike` in `.or()` may not work in all Supabase/PostgREST versions; fallback to two-step query if needed. |
| **Cost % filters not exposed** | Low | API supports `section`, `category`, `occupancy` but admin page only uses `search`. |

### 1.4 Admin Page

| Issue | Severity | Description |
|-------|----------|-------------|
| **Tab state vs URL sync** | Low | `setTab` in tab buttons doesn’t immediately update URL; `useEffect` depends on `tab` but tab click doesn’t trigger `searchParams` change. URL sync can lag. |
| **Cost % filters missing** | Low | No section/category dropdowns for Cost % tab; only free-text search. |
| **Building class dropdown incomplete** | Low | `BUILDING_CLASSES` omits `D\nMASONRY\nVENEER`, `C\nMILL`, `D\nPOLE`, `CDS` present in data. |
| **No export** | Low | No CSV/Excel export for cost or cost % data. |

---

## 2. Improvements

### 2.1 Extraction Script

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Filter occupancies by code range (e.g. 100–9999) and name length (e.g. &lt; 50 chars) | Low | Medium – removes license junk |
| Normalize `building_class`: strip newlines, map `D\nPOLE` → `DPOLE`, `D\nMASONRY\nVENEER` → `D MASONRY VENEER` | Medium | Medium – cleaner filters |
| Add `--clear-cce-cost-percentages` | Low | Low – avoids duplicates on re-run |
| Add `--verbose` to log pages/tables processed | Low | Low – easier debugging |
| Fix operator precedence in col_map check | Low | Low – correctness |
| Add extraction version/date for audit trail | Low | Low – traceability |

### 2.2 Database

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Add unique constraint on `cce_cost_percentages(section_name, occupancy, category)` | Low | Medium – prevents duplicates |
| Add RLS policies for admin-only access | Medium | Low – defense in depth |
| Add `updated_at` to relevant tables | Low | Low – consistency |

### 2.3 Admin Page

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Add section/category filters for Cost % tab | Low | Medium – better UX |
| Populate building class dropdown from distinct DB values | Low | Medium – handles all classes |
| Add expandable row for long text (exterior_walls, interior_finish) | Low | Medium – readability |
| Add loading skeleton instead of "Loading..." | Low | Low – perceived performance |
| Sync tab to URL on click (e.g. `router.replace` with `?tab=percent`) | Low | Low – shareable URLs |

---

## 3. Future Features

### 3.1 Extraction

| Feature | Description |
|---------|-------------|
| **Component costs extraction** | Parse unit-in-place tables (e.g. Section 41 stained glass, wall ornamentation) into `cce_component_costs`. |
| **Additional percentage tables** | Detect other utility sections (PLUMBING, HVAC, etc.) if present in PDF. |
| **Incremental extraction** | Track last-extracted page and only process new pages. |
| **PDF upload via UI** | Admin page to upload and trigger extraction from a new PDF. |
| **Validation report** | Post-extraction summary: row counts, outliers, missing values, suggested fixes. |

### 3.2 Admin UI

| Feature | Description |
|---------|-------------|
| **Export to CSV/Excel** | Export cost and cost % tables. |
| **Cost calculator** | Input sq.ft, occupancy, class → get estimated cost. |
| **Compare occupancies** | Side-by-side cost comparison for 2–3 occupancies. |
| **Source page link** | Link to PDF page (e.g. via blob URL or stored PDF path). |
| **Sortable columns** | Client- or server-side sort by cost, occupancy, etc. |
| **Favorites / bookmarks** | Save frequently used occupancies or filters. |

### 3.3 Integration

| Feature | Description |
|---------|-------------|
| **Feasibility report integration** | Use CCE costs in feasibility reports for construction estimates. |
| **API for external tools** | Documented API for programmatic access (e.g. Excel, BI tools). |
| **Cost trend over time** | If multiple PDF editions are loaded, track cost changes by occupancy. |

---

## 4. Data Quality Summary

| Metric | Current | Notes |
|--------|---------|------|
| Occupancy cost rows | ~2,213 | From occupancy tables |
| Occupancy cost % rows | ~190 | From ELECTRICAL section |
| Occupancies | ~305 | Includes junk from license text |
| Building classes | 10+ | Includes multi-line variants |
| Cost % sections | 1 (ELECTRICAL) | Other percentage tables not yet extracted |

---

## 5. Recommended Priority Actions

1. **High:** Filter false-positive occupancies (code range, name length).
2. **High:** Add unique constraint on `cce_cost_percentages` and `--clear-cce-cost-percentages`.
3. **Medium:** Normalize `building_class` (strip newlines, map variants).
4. **Medium:** Add section/category filters to Cost % tab.
5. **Low:** Fix operator precedence in extraction script.
6. **Low:** Add expandable rows for long text in cost table.
