# Site Design Audit (2026 Update)

**Page:** `/admin/site-design`  
**Audit Date:** March 2026  
**Previous Audit:** `docs/audit/SITE_DESIGN_AUDIT.md`

---

## Executive Summary

This audit reviews the Site Design calculator after the March 2026 improvements. Most issues from the original audit have been addressed. The tool now includes NOI, development cost, operating nights, presets with counts, auto-fill logic, over-capacity validation, and improved UX. This document identifies remaining issues, suggested improvements, and prioritized future features.

---

## 1. Status of Previous Audit Items

| # | Original Issue | Status |
|---|----------------|--------|
| 1.1 | Over-capacity validation | ✅ Fixed – warning shown when counts exceed parcel |
| 1.2 | Misleading count help text | ✅ Fixed – `countHelp` aligned with auto-fill behavior |
| 1.3 | Partial counts not handled | ✅ Fixed – remaining land auto-filled with best type |
| 1.4 | Hardcoded section headers | ✅ Fixed – i18n for parcelAndRoad, results, siteTypes |
| 1.5 | `crypto.randomUUID()` fallback | ✅ Fixed – fallback to timestamp-based ID |
| 1.6 | Road allocation formula undocumented | ✅ Fixed – `roadWidthHelp` tooltip explains formula |
| 1.7 | Effective land per site label | ✅ Fixed – clarified as pad area per site |
| 2.2 | Operating nights (seasonal) | ✅ Fixed – input added, default 365 |
| 2.3 | NOI & development cost | ✅ Fixed – full economics in place |
| 3.2 | Input validation feedback | ✅ Fixed – error prop on invalid inputs |
| 3.3 | Reset / preset buttons | ✅ Fixed – Load preset + Reset to defaults |
| 3.4 | Results sticky on scroll | ✅ Fixed – `lg:sticky` on Results card |
| 3.5 | Mobile layout for site types | ✅ Fixed – responsive grid |
| 3.6 | ARIA for dynamic results | ✅ Fixed – `aria-live` on results region |
| 4.10 | Presets / templates | ✅ Fixed – Standard, Golden Valley, Big-Rig with counts |

---

## 2. Remaining Issues & Bugs

### 2.1 Preset Dropdown Stale After Manual Edits

- **Location:** `activePreset` state
- **Issue:** When the user loads a preset (e.g., "Standard RV Park") and then edits any input (acreage, ADR, count, etc.), the dropdown still shows the preset name. The form no longer matches the preset.
- **Impact:** Low. User may assume values match the preset when they do not.
- **Recommendation:** Option A: Clear `activePreset` when any input changes (dropdown reverts to "Load preset"). Option B: Add a visual indicator (e.g., asterisk or "modified") when form diverges from preset. Option A is simpler.

### 2.2 No Validation for Gross Acreage

- **Location:** Gross acreage input
- **Issue:** `validation` object does not include gross acreage. User can enter 0 or negative; no error message.
- **Impact:** Low. `onChange` clamps with `Math.max(0, ...)` but 0 is invalid for feasibility.
- **Recommendation:** Add `grossAcres < 1` to validation and show error (e.g., "Must be at least 1 acre").

### 2.3 `DEFAULT_SITE_TYPES` Unused

- **Location:** Line 23–27
- **Issue:** `DEFAULT_SITE_TYPES` is defined but never used. `DEFAULT_PRESET` and presets drive initial state.
- **Impact:** Dead code; minor maintenance confusion.
- **Recommendation:** Remove `DEFAULT_SITE_TYPES` or repurpose (e.g., for `addSiteType` default structure if different from preset).

### 2.4 Add Site Type Uses Hardcoded Defaults

- **Location:** `addSiteType` – new site type config
- **Issue:** New site types get `width: 35, depth: 70, adr: 85, occupancy: 65, count: '', devCost: 25000`. After loading Golden Valley or Big-Rig preset, these defaults may not match the preset’s site-type style.
- **Impact:** Low. User can edit. Slightly inconsistent when adding a type mid-session.
- **Recommendation:** Consider deriving defaults from the first existing site type (e.g., copy dimensions, ADR ±10%, count blank).

### 2.5 No Decimal Support for Count Input

- **Location:** Count input `onChange` – `parseInt`
- **Issue:** Count uses `parseInt`; decimals are truncated. For very large sites, fractional counts are not supported (unlikely use case).
- **Impact:** Very low.
- **Recommendation:** Document or leave as-is. Integer counts are standard.

---

## 3. UX & Accessibility Improvements

### 3.1 Tooltip Keyboard Accessibility

- **Location:** `Input.tsx` – `TooltipIcon`
- **Issue:** Tooltip shows on hover and click. When opened by click, focus remains on the button. User can press Escape to close. No focus trap inside tooltip; tooltip content may be long.
- **Recommendation:** Ensure tooltip is reachable and dismissible by keyboard. Current Escape handling is good. Consider `aria-describedby` if tooltip is always visible on focus.

### 3.2 Results Order on Small Screens

- **Location:** Grid layout – inputs left, results right on `lg`
- **Issue:** On mobile (`grid-cols-1`), inputs appear first, then results. Users must scroll past all inputs to see results.
- **Recommendation:** Consider a compact "Summary" bar at top on mobile (total sites, revenue) that links/scrolls to full results, or allow optional "Results first" toggle.

### 3.3 No Confirmation for Reset

- **Location:** Reset to defaults button
- **Issue:** Reset immediately clears all inputs. No confirmation. User could lose work by accident.
- **Impact:** Low. Reset restores Standard preset; recoverable.
- **Recommendation:** Optional: Add "Are you sure?" for Reset when form has been modified (e.g., `activePreset` cleared or manual edits detected). Or leave as-is for simplicity.

### 3.4 Print / Export Styling

- **Issue:** No print-specific styles. Printing the page may not produce a clean report.
- **Recommendation:** Add `@media print` styles to hide sidebar, simplify layout, and ensure results are visible. Or implement Export to PDF/CSV (see Future Features).

---

## 4. Data & Formula Notes

### 4.1 Road Allocation Formula

- **Current:** `0.12 + (roadWidth - 18) * 0.008`, clamped 10–30%
- **Note:** Formula is documented in tooltip. No user override. Different road standards (e.g., fire lanes, resort-style) may need different curves.
- **Recommendation:** Consider optional "Road allocation %" override for power users. Low priority.

### 4.2 Block Efficiency

- **Current:** Single value for all site types. Real layouts may have different efficiency by type (e.g., pull-thru vs. back-in).
- **Recommendation:** Future enhancement: per-type block efficiency. Effort: Medium.

### 4.3 Cap Rate When Blank

- **Current:** When cap rate is blank, `estimatedValue` is `null` and not displayed.
- **Behavior:** Correct. No value estimate without cap rate.
- **Recommendation:** None.

---

## 5. Future Features (Prioritized)

### 5.1 Export to CSV / Excel (High)

- **Description:** Export inputs and results for client reports.
- **Output:** CSV or XLSX with parcel params, site types, counts, revenue, NOI, dev cost, estimated value.
- **Effort:** Low. Reuse pattern from Proximity Insights export.
- **Value:** High for client deliverables.

### 5.2 URL State Persistence (High)

- **Description:** Persist inputs in URL search params so users can share or bookmark scenarios.
- **Effort:** Low–medium. Sync state with `useSearchParams`; handle preset keys.
- **Value:** High for collaboration and repeat analysis.

### 5.3 Optimization Engine (Medium–High)

- **Description:** MILP or heuristic to maximize revenue/NOI by choosing site counts subject to land and mix constraints.
- **Inputs:** Min/max % per type, minimum pull-thru count, etc.
- **Output:** Recommended count per type.
- **Effort:** Medium–high. Requires solver library.
- **Value:** Differentiator; automates "best mix" beyond single-type auto-fill.

### 5.4 Sensitivity Dashboard (Medium)

- **Description:** "What if" sliders: e.g., "If ADR drops 10%?" or "If road width +2 ft?"
- **Output:** Table or chart showing revenue, NOI, site count vs. parameter change.
- **Effort:** Medium.
- **Value:** Useful for client presentations.

### 5.5 Campspot Premium Integration (Medium)

- **Description:** Pull pull-thru vs. back-in premiums from Campspot data. Pre-fill ADR by type from real data.
- **Effort:** Medium. Requires API or static import.
- **Value:** More realistic ADR inputs.

### 5.6 Operator Sanity Constraints (Medium)

- **Description:** Min/max % pull-thru, min premium site count, max density. Prevent "mathematically dense but operationally terrible" plans.
- **Effort:** Medium. Fits into optimization engine.
- **Value:** Operational feasibility.

### 5.7 Save / Load Custom Presets (Low–Medium)

- **Description:** Allow users to save current configuration as a named preset (localStorage or backend). Load later.
- **Effort:** Low for localStorage; medium for backend.
- **Value:** Convenience for repeat scenarios.

### 5.8 Geometry / Layout Feasibility (Low Priority)

- **Description:** Test mix against parcel shape: loop efficiency, corner losses. "Geometry-adjusted site count" vs. "Economic optimum."
- **Effort:** High.
- **Value:** Addresses Golden Valley "sites lost to geometry" problem.

### 5.9 Print-Optimized Report (Low)

- **Description:** Dedicated print view or "Print report" button with clean layout.
- **Effort:** Low.
- **Value:** Client handouts.

---

## 6. Summary Table

| Category | Count | Severity |
|----------|-------|----------|
| Remaining issues | 5 | Low |
| UX improvements | 4 | Low |
| Future features | 9 | — |

---

## 7. Recommended Immediate Fixes

1. **Preset staleness** – Clear `activePreset` when any input changes (or add "modified" indicator).
2. **Gross acreage validation** – Add min 1 acre validation and error message.
3. **Remove `DEFAULT_SITE_TYPES`** – Delete or repurpose to avoid dead code.

---

## 8. References

- Previous audit: `docs/audit/SITE_DESIGN_AUDIT.md`
- Calculations methodology: `docs/audit/SITE_DESIGN_CALCULATIONS.md`
- Financial benchmarks: `docs/data/FINANCIAL_BENCHMARKS_OUTDOOR_HOSPITALITY.md`
