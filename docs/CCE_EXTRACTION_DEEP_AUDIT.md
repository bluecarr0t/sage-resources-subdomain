# CCE PDF Extraction – Deep Audit Report

**Date:** March 2026  
**PDF:** CCE_March_2026.pdf (724 pages)  
**Purpose:** Ensure ALL data from tables within the PDF is being extracted

---

## 1. Executive Summary

| Table Type | Found in PDF | Currently Extracted | Gap |
|------------|--------------|---------------------|-----|
| Occupancy cost (CLASS\|TYPE\|EXTERIOR\|SQ.FT) | 169 tables | Yes | Some alternate formats missed |
| Occupancy cost (CLASS TYPE DESCRIPTION Cost Per Sq) | 4 tables | **No** | Alternate column layout |
| Cost percentage (ELECTRICAL, PLUMBING, HVAC) | ~10+ pages | Yes | Category mapping may differ per section |
| Component/unit-in-place costs | 151+ tables | Partial | Many false positives; varied header patterns |
| Multiplier tables (AVERAGE WALL HEIGHT, etc.) | 8+ | No | Not in schema |
| Section index (SECTION I \| II \| III \| IV) | 24 | No | TOC, not cost data |
| Life expectancy, local multipliers | Several | No | Reference data |
| Elevator, HVAC, plumbing detail tables | 50+ | Partial | Complex headers |

---

## 2. Table Types in PDF (Full Audit)

### 2.1 Occupancy Cost Tables – EXTRACTED ✓

**Pattern:** `CLASS | TYPE | EXTERIOR WALLS | INTERIOR | LIGHTING & PLUMBING | HEAT | Sq. M. | Cu. Ft. | Sq. Ft.`

- **Count:** 169 tables across PDF
- **Extraction:** Working
- **Schema:** `cce_cost_rows`, `cce_occupancies`
- **Notes:** Requires occupancy on same page; column mapping handles Sq.M., Cu.Ft., Sq.Ft.

### 2.2 Alternate Occupancy Cost Format – NOT EXTRACTED ✗

**Pattern:** `CLASS | TYPE | DESCRIPTION | Cost Per Sq. M. | Cost Per Sq. Ft.`

- **Count:** 4 tables (pages 295, 317, 318, 552)
- **Sample:** "CLASS TYPE DESCRIPTION Cost Per Sq. M. Cost Per Sq. Ft."
- **Gap:** Different column order; DESCRIPTION instead of EXTERIOR/INTERIOR
- **Action:** Add detection and column mapping for this format

### 2.3 Cost Percentage Tables – EXTRACTED ✓

**Pattern:** Text-based; `OCCUPANCY` + `LOW` + `MEDIAN` + (`HIGH` or `TOTAL` or `ELECTRICAL`/`PLUMBING`/`HVAC`)

- **Sections:** 54 ELECTRICAL, others (PLUMBING, HVAC) if present
- **Categories:** Hardcoded for ELECTRICAL (TOTAL_ELECTRICAL, SERVICE_DISTRIBUTION, etc.)
- **Gap:** PLUMBING/HVAC may have different category columns; needs section-specific mapping

### 2.4 Component / Unit-in-Place Tables – PARTIALLY EXTRACTED △

**Patterns (varied):**

- `ITEM | LOW | MEDIAN | HIGH` (or similar cost columns)
- `ROOM TYPE | RATED TEMPERATURE | INSULATION THICKNESS`
- `PASSENGER ELEVATORS – SELECTIVE/COLLECTIVE`
- `CAPACITY (Pounds) | SPEED (Feet per minute)`
- `25,000 | 547000.00 | 608000.00 | 705000.00 | 914000.00` (numeric headers)
- `HANGERS, per linear foot | ¼" | ½" | ¾" | 1" | ...`
- `ELEVATED WATER TANK | SPHEROID | HEMISPHEROID | ...`

- **Count:** 151+ tables
- **Current extraction:** Requires `COST` or `LOW` or `MEDIAN` or `HIGH` or `TIER` or `$` in header
- **False positives:** Letters ("Dear Customer"), quality types ("Good | 18.1") captured as components
- **Gap:** Many unit-in-place tables use numeric column headers or descriptive headers without "COST"

### 2.5 Multiplier / Reference Tables – NOT EXTRACTED ✗

- **AVERAGE WALL HEIGHT (M.) (FT.) | CUBIC FOOT | SQUARE FOOT** – 8 tables
- **AVERAGE | AVERAGE PERIMETER** – wall height multipliers
- **LIFE EXPECTANCY**, **LOCAL MULTIPLIERS** – reference data
- **Schema:** Not in current `cce_*` tables; would need new tables if needed

### 2.6 Other Table Types (Not Cost Data)

- **Section index (SECTION I | II | III | IV):** 24 tables – table of contents
- **Occupancy titles (RESTAURANTS (350), BARS/TAVERNS (442)):** Section headers, not data
- **DRY SYSTEMS | WET SYSTEMS:** Sprinkler system types
- **LENGTH | ONE-SECTION | TWO-SECTION:** Conveyor specs
- **Financial (MONTHLY PAYMENT, RATE OF INTEREST):** Loan tables

---

## 3. Extraction Logic Gaps

### 3.1 Alternate Occupancy Table Format

**Current:** Requires `CLASS` and `TYPE` and `EXTERIOR` and `SQ. FT` in header.

**Missing:** Tables with `CLASS | TYPE | DESCRIPTION | Cost Per Sq. M. | Cost Per Sq. Ft.`

**Fix:** Add branch: if header has `CLASS` and `TYPE` and (`COST PER SQ` or `SQ. FT` or `SQ. M`) and (`DESCRIPTION` or `EXTERIOR`), map columns accordingly. Use DESCRIPTION as exterior_walls or combined description.

### 3.2 Component Tables – Header Variability

**Current:** Requires `COST` or `LOW` or `MEDIAN` or `HIGH` or `TIER` or `$` in header.

**Missing:**

- Tables with numeric headers (25,000 | 547000.00 | 608000.00)
- Tables with size headers (¼" | ½" | ¾" | 1")
- Tables with descriptive headers (SPHEROID | HEMISPHEROID | WOOD TANK)

**Fix:** Broaden detection: if table has 2+ numeric columns and first column is text (item/description), treat as component. Add filter to skip rows that look like letters or single words (e.g. "Good", "Dear").

### 3.3 Multi-Page Tables

**Issue:** pdfplumber extracts tables per page. If header is on page N and data on N+1, page N+1 may return a table without a proper header row.

**Mitigation:** Consider carrying header from previous page when current page table has numeric-first row. (Complex; lower priority.)

### 3.4 Percentage Table Categories

**Current:** `PCT_CATEGORIES` fixed for ELECTRICAL (6 categories).

**Gap:** PLUMBING, HVAC, etc. have different category structures. May need section-specific category lists or dynamic detection from header.

---

## 4. Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| **High** | Add alternate occupancy format (CLASS TYPE DESCRIPTION Cost Per Sq) | Low |
| **High** | Reduce component false positives (skip "Dear", single-word quality types) | Low |
| **Medium** | Broaden component detection (numeric headers, size headers) | Medium |
| **Medium** | Section-specific PCT_CATEGORIES for PLUMBING, HVAC | Medium |
| **Low** | Multiplier tables (new schema if needed) | Low |
| **Low** | Multi-page table header carryover | High |

---

## 5. Run Audit Script

```bash
python3 scripts/audit-cce-pdf-extraction.py
python3 scripts/audit-cce-pdf-extraction.py --start-page 1 --end-page 200
```

---

## 6. Schema Coverage

| Table | Purpose | Data Source |
|-------|---------|-------------|
| `cce_occupancies` | Occupancy lookup | OCCUPANCY_NAME (CODE) in text |
| `cce_cost_rows` | Cost per sq.ft/cu.ft/sq.m | Occupancy tables (CLASS\|TYPE\|EXTERIOR) |
| `cce_cost_percentages` | % of contract by category | ELECTRICAL, PLUMBING, HVAC text tables |
| `cce_component_costs` | Unit-in-place costs | Component-style tables |

**Not in schema:** Multiplier tables, life expectancy, local multipliers, financial/loan tables.
