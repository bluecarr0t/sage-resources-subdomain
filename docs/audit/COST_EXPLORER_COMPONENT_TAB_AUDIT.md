# Cost Explorer – Component Tab & Extraction Audit

**Date:** March 2026  
**Scope:** `/admin/cost-explorer?tab=component` feature, CCE component extraction pipeline  
**Related:** `app/admin/cost-explorer/page.tsx`, `app/api/admin/cce-component-costs/route.ts`, `scripts/extract-cce-pdf.py`, `lib/cce-component-section-display.ts`

---

## 1. Executive Summary

The Component Costs tab displays unit-in-place costs (Wall Costs, Doors, Balconies, etc.) extracted from the Marshall & Swift CCE PDF. Data flows from PDF → Python extraction → `cce_component_costs` table → API → React UI. The feature is functional but has several issues, UX gaps, and opportunities for improvement.

| Area | Status | Key Findings |
|------|--------|--------------|
| **Extraction** | Partial | 151+ component tables in PDF; many use numeric/size headers not detected; false positives (e.g. "Dear", quality types) |
| **API** | Good | Pagination, search, section/cost filters; min/max cost only uses col_1 |
| **UI** | Fair | Only 2 cost columns shown (Low/High); no export; handleSort type mismatch |
| **Schema** | Adequate | col_1..col_4, cost_tier unused; no occupancy linkage |

---

## 2. Issues (Bugs & Edge Cases)

### 2.1 Extraction Script (`scripts/extract-cce-pdf.py`)

| ID | Severity | Issue | Description |
|----|----------|-------|-------------|
| **E1** | High | **Component detection too narrow** | Requires `COST` or `LOW` or `MEDIAN` or `HIGH` or `TIER` or `$` in header. Many unit-in-place tables use numeric headers (25,000 \| 547000.00 \| 608000.00), size headers (¼" \| ½" \| ¾"), or descriptive headers (SPHEROID \| HEMISPHEROID) and are missed. |
| **E2** | High | **False positives** | Letters ("Dear Customer"), quality types ("Good \| 18.1"), single-word rows captured as components. `LIST_SKIP_PATTERNS` and `SKIP_ITEM_PATTERNS` help but don't cover all cases. |
| **E2b** | High | **"MARSHALL VALUATION SERVICE" as section** | PDF header/brand text captured as section name; blocklist had "Marshall" but not "MARSHALL" (case-sensitive). **Fixed:** block MARSHALL, VALUATION SERVICE, SECTION PAGE patterns. |
| **E2c** | High | **Swapped/wrong Low-High (e.g. $66 / $2)** | List-style regex parses "66 2" from lines where "2" may be truncated "200" or wrong column. **Fixed:** skip rows where col_2 < 10% of col_1. |
| **E3** | Medium | **List-style runs only when tables=[]** | Pages with both grid tables AND list-style data (e.g. elevators + balconies) only extract grid; list-style is skipped. `process_list_lines` is inside `if not tables` branch. |
| **E4** | Medium | **Section name pollution** | When `current_section_name` is wrong (e.g. "November", "Marshall" from date/brand capture), component rows get incorrect section attribution. |
| **E5** | Low | **cost_tier always null** | Schema has `cost_tier`; extraction never populates it. PDF headers often indicate "Low", "Avg", "Good", "Excl" per column. |
| **E6** | Low | **SECTION_DISPLAY_MAP incomplete** | `lib/cce-component-section-display.ts` maps only 4 section variants; many raw section names display as-is. |

### 2.2 API (`/api/admin/cce-component-costs`)

| ID | Severity | Issue | Description |
|----|----------|-------|-------------|
| **A1** | Medium | **Cost filter uses col_1 only** | `min_cost` and `max_cost` filter on `col_1` (Low). Users may want to filter by col_2 (High) or other columns. |
| **A2** | Low | **No col_3/col_4 in response** | API returns all columns; UI only displays col_1 and col_2. Not an API bug but limits usefulness. |
| **A3** | Low | **Sort by "price"** | API accepts `sort_by=price` as alias for `col_1`; consistent but undocumented in route comment. |

### 2.3 Admin Page (`app/admin/cost-explorer/page.tsx`)

| ID | Severity | Issue | Description |
|----|----------|-------|-------------|
| **U1** | Medium | **handleSort type mismatch** | `handleSort` accepts `CostSortBy | PctSortBy | CatalogSortBy` but component tab passes `ComponentSortBy`. TypeScript may allow it; runtime works, but type safety is broken. |
| **U2** | Medium | **Only 2 cost columns shown** | Table shows "Low" (col_1) and "High" (col_2). Many sections have 4 tiers (Low/Avg/Good/Excl). col_3 and col_4 are hidden. |
| **U3** | Low | **Column headers generic** | "Low Cost" and "High Cost" may not match PDF (e.g. "LIGHT", "MEDIUM", "HEAVY" for steel joists). |
| **U4** | Low | **No export** | Cost and Percent tabs have export; Component tab has no CSV/Excel export. |
| **U5** | Low | **Empty state references CLI** | `t('component.noData')` shows `python scripts/extract-cce-pdf.py` – correct but extraction is also available via "Run extraction" in the PDF Upload section. Could clarify. |
| **U6** | Low | **PDF link hardcoded** | Source page links use `/api/admin/cce-pdf/March_2026#page=...` – doesn't reflect uploaded PDF. |

### 2.4 Schema & Data Model

| ID | Severity | Issue | Description |
|----|----------|-------|-------------|
| **S1** | Low | **cost_tier unused** | Column exists but extraction never sets it. |
| **S2** | Low | **No occupancy_id** | Components are section-scoped; some PDF tables may be occupancy-specific. Per CCE_PDF_EXTRACTION_TECHNICAL_AUDIT E9. |
| **S3** | Low | **No index on section_name** | Filtering by section may be slower on large datasets. |

---

## 3. Improvements (Prioritized)

### 3.1 High Priority

| # | Improvement | Effort | Impact | Location |
|---|-------------|--------|--------|----------|
| 1 | **Broaden component detection** | Medium | High | `extract-cce-pdf.py`: If table has 2+ numeric columns and first column is text (item/description), treat as component. Add filter to skip "Dear", single-word quality types. |
| 2 | **Run list-style when tables exist** | Low | Medium | `extract-cce-pdf.py`: Move `process_list_lines` outside `if not tables`; run on text for all pages; merge component_rows with dedupe. |
| 3 | **Fix handleSort type** | Trivial | Low | `page.tsx`: Add `ComponentSortBy` to `handleSort` parameter type. |

### 3.2 Medium Priority

| # | Improvement | Effort | Impact | Location |
|---|-------------|--------|--------|----------|
| 4 | **Show col_3 and col_4** | Low | Medium | `page.tsx`: Add columns for col_3, col_4 with configurable headers (or "Tier 3", "Tier 4"). |
| 5 | **Cost filter on all columns** | Low | Medium | API: Add `min_cost_col`, `max_cost_col` or filter on max(col_1..col_4). |
| 6 | **Section-specific column labels** | Medium | Medium | Use `formatComponentSectionName` or section metadata to show "LIGHT/MEDIUM/HEAVY" vs "LOW/HIGH" per section. |
| 7 | **Populate cost_tier** | Low | Low | Extraction: When header has "Low", "Avg", "Good", "Excl", map col position to tier. |
| 8 | **Add section_name index** | Trivial | Low | Migration: `CREATE INDEX idx_cce_component_costs_section ON cce_component_costs(section_name);` |

### 3.3 Low Priority

| # | Improvement | Effort | Impact |
|---|-------------|--------|--------|
| 9 | **Export CSV for Component tab** | Low | Low |
| 10 | **Expand SECTION_DISPLAY_MAP** | Low | Low |
| 11 | **Dynamic PDF link** | Low | Low – use selected PDF from upload state |

---

## 4. Future Features

### 4.1 Extraction

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Numeric header detection** | Tables with headers like "25,000 \| 547000 \| 608000" – treat as capacity/size columns with costs | Medium |
| **Size header detection** | Headers like "¼" \| ½" \| ¾" \| 1"" for pipe/hanger tables | Medium |
| **Occupancy-specific components** | Link components to occupancy when on same page | Medium |
| **Multi-page table header carryover** | When header on page N, data on N+1, carry header forward | High |
| **Validation report** | Post-extraction: component row counts by section, outliers, suggested fixes | Low |

### 4.2 Admin UI

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Export Component CSV** | Same pattern as Cost/Percent export | Low |
| **Component cost calculator** | Input item + section → interpolate from Low/High | Medium |
| **Compare sections** | Side-by-side view of Wall Costs vs Doors vs Balconies | Medium |
| **Inline edit** | Allow manual correction of mis-extracted component rows | Medium |
| **Bulk re-extract component pages** | Trigger extraction for specific page range (e.g. 500–550) | Low |
| **Column header tooltips** | Explain col_1..col_4 per section (e.g. "Low = Economy, High = Premium") | Low |

### 4.3 Integration

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Site Builder integration** | Use component costs for unit-in-place estimates in feasibility | High |
| **Report Builder** | Pull component costs into Development Costs section of reports | Medium |
| **API documentation** | Document cce-component-costs for external tools | Low |

---

## 5. Data Flow Summary

```
PDF (CCE_March_2026.pdf)
    ↓
extract-cce-pdf.py
  - List-style: LIST_COST_LINE_RE on text when tables=[] or (E6 fix) always
  - Grid tables: ITEM/DESCRIPTION + COST/LOW/MEDIAN/HIGH/$ in header
    ↓
cce_component_costs (Supabase)
  - section_name, item_name, cost_tier, col_1..col_4, source_page
    ↓
GET /api/admin/cce-component-costs
  - search, section, min_cost, max_cost, sort_by, page
    ↓
Cost Explorer page (tab=component)
  - Filters: search, section, min cost, max cost
  - Table: Section, Item, Low (col_1), High (col_2), Page
```

---

## 6. Recommended Priority Order

1. **Fix handleSort type** (U1) – trivial, improves type safety
2. **Run list-style when tables exist** (E3) – recovers mixed-format pages
3. **Broaden component detection** (E1) – recovers numeric/size header tables
4. **Show col_3 and col_4** (U2) – better data visibility
5. **Add Component CSV export** (U4) – parity with other tabs
6. **Cost filter on all columns** (A1) – more flexible filtering

---

## 7. References

- [CCE_EXTRACTION_DEEP_AUDIT.md](../CCE_EXTRACTION_DEEP_AUDIT.md) – Full PDF extraction audit
- [CCE_EXTRACTION_AUDIT.md](../CCE_EXTRACTION_AUDIT.md) – General CCE audit
- [CCE_PDF_EXTRACTION_TECHNICAL_AUDIT.md](../CCE_PDF_EXTRACTION_TECHNICAL_AUDIT.md) – Technical details
- `__tests__/cce-extraction.test.ts` – Integration tests for extraction
