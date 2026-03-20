# CCE Component ITEM column — prioritized recommendations

This document summarizes **issues by severity** and lists **recommended improvements** and **future features**. Technical root-cause detail lives in [`CCE_COMPONENT_ITEM_EXTRACTION_AUDIT.md`](./CCE_COMPONENT_ITEM_EXTRACTION_AUDIT.md).

---

## Issues by severity (with recommendations)

### Critical

| Issue | Why it matters | Recommendation |
|--------|----------------|----------------|
| **Wrong cost columns (e.g. Low > Average)** | Undermines trust in all downstream use (Cost Explorer, reports, benchmarks). Users cannot tell if data is extract or real tier pricing. | Enforce **tier monotonicity** when four columns exist (`col_1 ≤ col_2 ≤ col_3 ≤ col_4` within a tolerance). **Reject or quarantine** rows that fail. Add the same checks on the **table** extraction path as on list-style. |

*Rationale:* Dot noise and ugly ITEM text are cosmetic until numbers are wrong; misaligned dollars are a **data integrity** problem and should be treated as critical.

---

### High

| Issue | Why it matters | Recommendation |
|--------|----------------|----------------|
| **Leader dots and TOC-style junk in `item_name`** | Dominates the UI, hurts search/filter, and obscures the real description. Very common on list-style pages. | Add a **shared post-processor** for `item_name`: strip trailing `\s*\.{3,}\s*$`, collapse long mid-string dot runs (e.g. 5+), and normalize space-dot patterns. Run on **both** list and table extraction paths **before** dedupe and DB insert. |
| **List-line regex (`LIST_COST_LINE_RE`) splitting on weak delimiters** | `[\.\s]{2,}` treats **spaces** like dots; lazy `.+?` can bind to the **first** double-space inside a description, merging wrong spans into ITEM or mis-assigning the numeric tail. | Prefer **dot-heavy** delimiters first (`\s+\.{2,}\s+`), with a measured fallback for space-only layouts. Consider **right-anchored** parsing: locate the last plausible price cluster, treat everything left as description. |

---

### Medium

| Issue | Why it matters | Recommendation |
|--------|----------------|----------------|
| **200-character cut before cleanup** | Truncation happens on **raw** text; leaders and junk consume the budget, so users see cut-off words plus dots. | Apply **length cap after** dot/junk stripping, or increase storage cap and only truncate in UI. |
| **Limited bleed handling** | Only strips trailing **three+** `dd.dd` decimals; misses integer pairs (`66 2`), single decimals, and footnote text glued to the line. | Extend patterns for trailing **short integer runs** and a small **footer phrase blocklist** (e.g. cross-refs, accessibility lines) when they appear after a clear separator. |
| **Table path: no ITEM normalization** | Grid rows skip the list-only decimal bleed step entirely; dots and spacing issues still land in DB. | Reuse the **same** `normalize_component_item_name()` (or equivalent) for table `item` before insert. |
| **Sparse columns (only Low filled)** | Sometimes legitimate; sometimes a sign of **wrong `cost_cols`** or a one-column line parsed as four. | Flag rows with 1–2 numeric cells for **QA sampling**; optionally require minimum numeric count when header implies four tiers. |

---

### Low

| Issue | Why it matters | Recommendation |
|--------|----------------|----------------|
| **Weak section labels (`QUALITY`, `TRAILER`, …)** | Confusing in the Section column; usually a **header/context** heuristic, not core ITEM quality. | Maintain a **short-name denylist** for `section_name` unless part of a longer phrase; continue **truncated-header** fixes (e.g. `AND_JUNK_LIST_HEADERS` in `extract-cce-pdf.py`). |
| **Duplicate rows (list + table)** | Inflates counts; partially mitigated by dedupe keys. | Align dedupe keys across paths; consider **DB unique constraint** on `(section_name, item_name, source_page)` with upsert policy documented in [`CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md`](../CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md). |

---

## Recommended improvements (consolidated backlog)

**Status:** Items 1–7 are implemented in-repo unless noted. Extend patterns per new PDF editions as needed.

1. **Shared `normalize_component_item_name(text) -> str`** — [`scripts/cce_component_item_extract.py`](../../scripts/cce_component_item_extract.py); tests in [`scripts/__tests__/test_cce_component_item_extract.py`](../../scripts/__tests__/test_cce_component_item_extract.py) (incl. real-line / golden-style cases).

2. **Stricter list-line parsing** — `parse_list_cost_line()` (dot-first, legacy fallback without `..`, right-anchored tail); golden-style tests documented for ~p27 / ~p540 line shapes.

3. **Column validation** — `tier_order_ok()` on list + table paths in [`scripts/extract-cce-pdf.py`](../../scripts/extract-cce-pdf.py); validation scripts report remaining DB violations.

4. **Reorder truncation** — Normalize then `ITEM_MAX_LEN` cap (200) after cleanup.

5. **Broaden bleed / footer stripping** — Extended decimals, int pairs/triplets (conservative), cross-ref/page footnote suffixes, footer phrase list; iterate with `test-component-data-quality.py` / `validate-cce-extraction.py`.

6. **Section header hygiene** — `SHORT_SECTION_NAME_DENYLIST` + `LIST_TRUNCATED_AND_JUNK_HEADERS` / `list_section_header_is_truncated_junk()` in `cce_component_item_extract.py` (add new `AND …` fragments per edition).

7. **Documentation + runbook** — [`docs/CCE_EXTRACTION_RUNBOOK.md`](../CCE_EXTRACTION_RUNBOOK.md) (commands, `extraction_date`, when to re-extract vs SQL clean, golden page procedure, table for expected row counts).

---

## Future features

| Feature | Status / location |
|---------|-------------------|
| **Edition / PDF profile config** | **Shipped:** [`config/cce-profiles/`](../../config/cce-profiles/), [`scripts/cce_extract_profile.py`](../../scripts/cce_extract_profile.py), `--profile` on extract. |
| **Extraction quality flags** | **Shipped:** [`add-cce-component-costs-flags.sql`](../../scripts/migrations/add-cce-component-costs-flags.sql); API `extraction_flag`; i18n `admin.cceCosts.filters.extractionFlag_*`. |
| **Re-clean job** | **Shipped:** [`scripts/reclean-cce-component-items.py`](../../scripts/reclean-cce-component-items.py). |
| **Layout-aware extraction** | **Partial:** [`scripts/cce_layout_list_parse.py`](../../scripts/cce_layout_list_parse.py), [`scripts/dump_cce_page_words.py`](../../scripts/dump_cce_page_words.py); profile `layout` + `layout_list_pages`. |
| **Admin correction UI** | Not started. |
| **Golden PDF regression suite** | String-level tests; runbook golden pages. |

---

## References

- [`CCE_COMPONENT_ITEM_EXTRACTION_AUDIT.md`](./CCE_COMPONENT_ITEM_EXTRACTION_AUDIT.md) — code paths and root-cause analysis  
- [`CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md`](../CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md) — earlier issue list and test commands  
- [`scripts/extract-cce-pdf.py`](../../scripts/extract-cce-pdf.py) — implementation  
- [`scripts/test-component-data-quality.py`](../../scripts/test-component-data-quality.py) — data-quality checks  
