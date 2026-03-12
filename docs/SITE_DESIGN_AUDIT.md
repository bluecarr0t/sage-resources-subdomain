# Site Design Audit

**Page:** `/admin/site-design`  
**Audit Date:** March 2026

---

## Executive Summary

Site Design is a yield and economics calculator for RV park site layout optimization. It estimates site count, annual revenue, and revenue per acre from parcel and site-type inputs. The MVP is client-side only with no backend. This audit identifies issues, improvements, and future features aligned with the original ChatGPT brainstorm and Golden Valley AZ use case.

---

## 1. Issues & Bugs

### 1.1 No Over-Capacity Validation When User Enters Counts

- **Location:** `SiteDesignClient.tsx` – `computeResults` when `hasCounts` is true
- **Issue:** When the user enters site counts manually, the model does not validate that `totalLandUsed <= usableForSites`. A user can enter counts that exceed parcel capacity (e.g., 500 sites on 37.5 acres) and the UI shows revenue as if it fits.
- **Impact:** Misleading feasibility; developers may believe a mix is viable when it is not.
- **Recommendation:** Add validation: if `totalLandUsed > usableForSites`, show a warning (e.g., "Over capacity by X sq ft") and optionally cap or flag the results. Consider showing "Land used: X acres of Y available" in the results.

### 1.2 Misleading Count Help Text

- **Location:** `messages/en.json` – `countHelp`: "Leave blank to auto-calculate from mix"
- **Issue:** Actual behavior when all counts are blank is "auto-filled with best type" (single type with highest revenue per sq ft). There is no "mix" calculation—the model picks one type and fills the parcel.
- **Impact:** Users may expect a proportional mix (e.g., 60% back-in, 40% pull-thru) but get 100% of one type.
- **Recommendation:** Update `countHelp` to: "Leave all blank to auto-fill with the highest revenue-per-sq-ft type." Or implement true mix allocation and align the copy.

### 1.3 Partial Counts Not Handled

- **Location:** `computeResults` – `hasCounts` logic
- **Issue:** If the user enters counts for some site types but leaves others blank, `hasCounts` is true and only the entered counts are used. The remaining land is ignored; no suggestion for how to fill it.
- **Impact:** Incomplete scenarios (e.g., 50 back-in + blank pull-thru) show partial revenue without guidance.
- **Recommendation:** When partial counts exist: (a) compute `remainingLand = usableForSites - totalLandUsed`, (b) suggest max sites for each remaining type to fill the gap, (c) or auto-fill remaining land with the best remaining type.

### 1.4 Hardcoded Section Headers

- **Location:** `SiteDesignClient.tsx` – "Parcel & road", "Results", "Per site type"
- **Issue:** "Parcel & road" and "Results" are hardcoded. "Per site type" uses `t('perSiteType')` but the parent "Results" does not.
- **Impact:** Inconsistent i18n; non-English locales will show mixed language.
- **Recommendation:** Add `parcelAndRoad`, `results` to `siteDesign` i18n and use them.

### 1.5 `crypto.randomUUID()` Fallback

- **Location:** `addSiteType` – `crypto.randomUUID()`
- **Issue:** `crypto.randomUUID()` is well-supported in modern browsers but may be undefined in older environments or non-secure contexts (e.g., some HTTP).
- **Impact:** Low; Next.js admin typically runs in HTTPS. Possible runtime error in edge cases.
- **Recommendation:** Add fallback: `crypto?.randomUUID?.() ?? `site-${Date.now()}-${Math.random().toString(36).slice(2)}``.

### 1.6 Road Allocation Formula Not Documented

- **Location:** `roadAllocationPct(roadWidthFt)`
- **Issue:** Formula `0.12 + (roadWidth - 18) * 0.008` is opaque. No tooltip or docs explain the 12% base, 0.8% per foot, or the 18–40 ft range.
- **Impact:** Users cannot validate or tune the assumption; different road standards may need different curves.
- **Recommendation:** Add a tooltip or help text: "Estimated % of land for roads (wider roads reduce site yield)." Consider making road allocation user-editable or selectable (e.g., "Low / Medium / High").

### 1.7 Effective Land Per Site Excludes Road Share

- **Location:** `computeResults` – `effectiveSqftPerSite = padSqft / blockEfficiency`
- **Issue:** The plan suggested `effective_sqft_per_site = (width * depth) / block_efficiency + road_share`. Current logic applies road allocation at the parcel level (usableForSites) but does not add a per-site road share to `effectiveSqftPerSite`. The "Effective land per site" in the UI is pad-only.
- **Impact:** "Effective land per site" understates total land consumption; users may be confused when totalLandUsed doesn't match sum(count × effectiveSqftPerSite) conceptually (it does match, but the label could be clearer).
- **Recommendation:** Clarify in UI: "Pad area per site (after efficiency)" or add a separate "Incl. road allocation" figure. Document the formula in a help section.

---

## 2. Data & Formula Accuracy

### 2.1 Block Efficiency Applied Only to Pad

- **Current:** `effectiveSqftPerSite = padSqft / blockEfficiency`
- **Note:** Block efficiency correctly models corner/geometry loss. Road allocation is separate. The combined model is internally consistent.
- **Recommendation:** Document in-app: "Block efficiency reduces usable pad area (corners, irregular shapes)."

### 2.2 Occupancy × 365 Assumes Year-Round

- **Location:** `annualRevenue = count * ADR * (occupancy/100) * 365`
- **Issue:** Uses 365 nights. Seasonal parks (e.g., closed 4 months) have fewer available nights.
- **Recommendation:** Add optional "Operating nights" input (default 365) for seasonal properties.

### 2.3 No Development Cost or NOI

- **Issue:** Plan and ChatGPT brainstorm mention NOI and development cost. Current MVP is revenue-only.
- **Impact:** Users cannot compare profit or residual value; feasibility often depends on NOI.
- **Recommendation:** Future enhancement (see Section 4).

---

## 3. UX & Accessibility Improvements

### 3.1 No Loading or Skeleton State

- **Issue:** All calculations are synchronous. No loading state. Fine for MVP, but if future features add async (e.g., fetching Campspot premiums), a skeleton would improve perceived performance.
- **Recommendation:** Add `InsightsSkeleton`-style placeholder if async features are added.

### 3.2 Input Validation Feedback

- **Issue:** Invalid inputs (e.g., negative, empty) are clamped silently. No error messages or inline validation.
- **Recommendation:** Use Input `error` prop for invalid values (e.g., "Must be 0–100" for occupancy).

### 3.3 No Reset / Preset Buttons

- **Issue:** Users cannot reset to defaults or load a preset (e.g., "Golden Valley AZ", "Standard RV Park").
- **Recommendation:** Add "Reset to defaults" and optionally "Load preset" dropdown.

### 3.4 Results Not Sticky on Scroll

- **Issue:** On smaller screens, scrolling past inputs hides results. Users must scroll back to see outputs.
- **Recommendation:** Consider `position: sticky` for the Results card on lg screens, or a compact results bar that stays visible.

### 3.5 Mobile Layout for Site Type Grid

- **Issue:** `grid-cols-2 sm:grid-cols-5` for width/depth/adr/occupancy/count can be cramped on mobile. Count field may wrap awkwardly.
- **Recommendation:** On xs, stack fields vertically or use 2 columns; ensure touch targets are adequate.

### 3.6 Missing ARIA for Dynamic Results

- **Issue:** Results update on every keystroke. Screen reader users may not be notified of changes.
- **Recommendation:** Add `aria-live="polite"` to the results region so updates are announced.

---

## 4. Future Features (Prioritized)

### 4.1 Optimization Engine (Phase B)

- **Description:** MILP or heuristic to maximize revenue/NOI by choosing site counts (and optionally dimensions) subject to land and mix constraints.
- **Inputs:** Min/max % per type, minimum pull-thru count, etc.
- **Output:** Recommended count per type.
- **Effort:** Medium–high. Requires `javascript-lp-solver`, `glpk.js`, or similar.

### 4.2 Sensitivity Dashboard

- **Description:** "What if" sliders or inputs: e.g., "If pull-thru premium drops 10%?" or "If road width increases 2 ft?"
- **Output:** Table or chart showing revenue, site count, revenue/acre vs. parameter change.
- **Effort:** Medium.

### 4.3 NOI & Development Cost

- **Description:** Add development cost per site type, operating expense ratio. Output NOI, NOI/acre, simple cap rate.
- **Data:** Benchmarks from `docs/FINANCIAL_BENCHMARKS_OUTDOOR_HOSPITALITY.md`.
- **Effort:** Low–medium.

### 4.4 Campspot Premium Integration

- **Description:** Pull pull-thru vs. back-in premiums from `campspot-jellystone-2025-sites-rates.csv` or legacy DB. Pre-fill ADR by type from real data.
- **Effort:** Medium. Requires API or static import of derived premiums.

### 4.5 Operating Nights (Seasonal)

- **Description:** Input for "Available nights per year" (default 365). Use in revenue formula.
- **Effort:** Low.

### 4.6 Export to CSV/Excel

- **Description:** Export inputs and results for client reports or further analysis.
- **Effort:** Low. Reuse pattern from Proximity Insights export.

### 4.7 URL State Persistence

- **Description:** Persist inputs in URL search params (like Proximity Insights) so users can share or bookmark scenarios.
- **Effort:** Low–medium.

### 4.8 Geometry / Layout Feasibility Layer (Phase C)

- **Description:** After optimization, test mix against parcel shape: loop efficiency, corner losses, irregular edges.
- **Output:** "Geometry-adjusted site count" vs. "Economic optimum" (addresses Golden Valley "69 sites lost" problem).
- **Effort:** High.

### 4.9 Operator Sanity Constraints

- **Description:** Min/max % pull-thru, min premium site count, max density. Prevent "mathematically dense but operationally terrible" plans.
- **Effort:** Medium. Fits into optimization engine.

### 4.10 Presets / Templates

- **Description:** "Golden Valley AZ", "Standard RV Park", "Big-Rig Focus" with pre-filled inputs.
- **Effort:** Low.

---

## 5. Summary Table

| Category        | Count | Severity |
|-----------------|-------|----------|
| Issues & Bugs   | 7     | 2 high, 5 medium |
| Data Accuracy   | 3     | Low      |
| UX Improvements | 6     | Low–medium |
| Future Features | 10    | —        |

---

## 6. Recommended Immediate Fixes

1. **Over-capacity validation** – Warn when user-entered counts exceed usable land.
2. **Fix count help text** – Align with actual "best type" behavior.
3. **i18n for section headers** – Add `parcelAndRoad`, `results` to messages.
4. **Partial counts** – Either document current behavior or implement fill-remaining logic.

---

## 7. References

- Original brainstorm: User message + ChatGPT response (site layout + revenue optimization)
- Plan: `site_design_mvp_page_d8c08996.plan.md`
- Financial benchmarks: `docs/FINANCIAL_BENCHMARKS_OUTDOOR_HOSPITALITY.md`
- Proximity Insights audit (structure reference): `docs/PROXIMITY_INSIGHTS_AUDIT_2026.md`
