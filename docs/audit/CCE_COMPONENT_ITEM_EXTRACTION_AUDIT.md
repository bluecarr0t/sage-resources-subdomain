# CCE Component Costs — ITEM column extraction audit

**Scope:** How `item_name` (and related columns) are populated for the Cost Explorer **Component** tab, with focus on **leader dots**, **truncation**, **junk suffixes**, and **column misalignment**.  
**Primary code:** [`scripts/extract-cce-pdf.py`](../scripts/extract-cce-pdf.py) (list-style `LIST_COST_LINE_RE` + `process_list_lines`, grid/table path).  
**Related:** [`docs/CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md`](../CCE_COMPONENT_EXTRACTION_IMPROVEMENTS.md), [`scripts/test-component-data-quality.py`](../../scripts/test-component-data-quality.py).

---

## 1. How ITEM is produced today

### 1.1 List-style lines (major source of “dot” rows)

Per-page text is split into lines. A line becomes a component row when it matches:

```208:210:scripts/extract-cce-pdf.py
    LIST_COST_LINE_RE = re.compile(
        r"^(.+?)\s+[\.\s]{2,}\s+([\d\.\s]+)$"
    )
```

- **Group 1** → trimmed → `clean_list_item_ocr` → optional **decimal bleed** strip → `item_name`.
- **Group 2** → split on whitespace → `parse_numeric` → `col_1`…`col_4`.

`clean_list_item_ocr` only fixes a narrow OCR pattern (`"C eiling"` → `"Ceiling"`); it **does not** remove dots, leaders, or TOC junk.

```50:54:scripts/extract-cce-pdf.py
def clean_list_item_ocr(s: str) -> str:
    """Fix common OCR artifacts: 'C eiling' -> 'Ceiling', 'F arm' -> 'Farm'."""
    if not s or len(s) < 3:
        return s
    return re.sub(r"\b([A-Z])\s+([a-z])", r"\1\2", s)
```

Post-processing on the item:

- Truncate to **200** chars before clean (`item_raw[:200]`).
- Strip **only** a trailing run of **three or more** `dd.dd` decimals (column bleed).
- Skip rows if `col_2 < 0.1 * col_1` or Excellent vs Good ratio looks wrong.

```533:538:scripts/extract-cce-pdf.py
                        item = clean_list_item_ocr(item_raw[:200])
                        # Strip trailing cost-like numbers from item (column bleed, e.g. "pumps 34.34 57.80 97.31")
                        bleed_match = re.search(r"\s+\d{1,2}\.\d{2}(\s+\d{1,2}\.\d{2}){2,}\s*$", item)
                        if bleed_match:
                            item = item[:bleed_match.start()].strip()
```

### 1.2 Grid / table extraction

`pdfplumber` tables: description from `desc_col`, costs from `cost_cols`; `item` is truncated to 200 chars with **no** leader-dot cleanup and **no** decimal bleed strip on that path (see ~`item_trim = item[:200]`).

---

## 2. Observed symptoms (from UI / samples)

| Symptom | Example / effect |
|--------|-------------------|
| **Leader dots inside ITEM** | Long runs of `.` at end of description (TOC / index style in source PDF). |
| **Numeric / index junk in ITEM** | e.g. `66 2` or fragments before unrelated text (`Handicap, Barrier Removal`) when layout is multi-column or wrapped. |
| **Cutoff words** | `item_raw[:200]` hard cap; soft-wrap PDF lines can split mid-phrase across logical rows. |
| **LOW vs AVERAGE inversion** | e.g. Low `$66`, Average `$10` — parser took wrong tokens as `col_1` / `col_2` or merged lines. |
| **Sparse cost columns** | Only `col_1` filled — valid for some M&S rows, but also consistent with **wrong column indices** or **single-price** lines parsed as list-style. |
| **Weak section headers** | e.g. `QUALITY`, `TRAILER` — `list_section_name` / `current_section_name` context from prior lines or overly broad header regexes, not a refined “component section” taxonomy. |

---

## 3. Root-cause analysis

### 3.1 Leader dots still appearing in `item_name`

**Mechanism A — Regex delimiter too permissive**  
`[\.\s]{2,}` treats **runs of spaces** as the delimiter. If OCR emits **many spaces** between description and numbers, the **lazy** `.+?` may stop at the **first** double-space inside the description, leaving later text (including dot leaders) still in group 1, **or** merge oddly across wraps.

**Mechanism B — Line merging / wrapping**  
`extract_text()` often **joins** visual lines. A TOC row may become: description + visual leaders + partial numbers on one “line”, or leaders may sit in the captured item segment if the numeric tail does not satisfy `$` anchor cleanly.

**Mechanism C — No normalization pass**  
Unlike some bleed handling for decimals, there is **no** step to strip trailing `\.{3,}` or “space-dot-space” leaders from `item` after capture.

### 3.2 “66 2” and unrelated trailing text

Group 2 is `[\d\.\s]+` to end of line. If the PDF line includes **extra tokens** after the real price block (page index, footnotes, adjacent column text), they can end up in `nums` and shift columns — or if the line breaks badly, **group 1** can extend to include digits/text that should not be description.

**Florida Rooms** case is consistent with **multi-column or footnote bleed** into the same text line, or **two short integers** (`66`, `2`) parsed as costs while following text remains in item (if split differently across versions).

### 3.3 Cutoff at 200 characters

Early truncation **`item_raw[:200]`** happens **before** cleaning. Long descriptions lose tail permanently; combined with leader dots at the end, the visible text is often “all dots” after a truncated sentence.

### 3.4 Section context (`QUALITY`, `TRAILER`)

`list_section_name` is updated from subsection / header heuristics (`LIST_SECTION_HEADER_RE`, etc.). Short all-caps tokens can match **column titles** or **narrow PDF banners** that are not true Marshall section names. Table path uses `current_section_name` from broader page context — same risk.

---

## 4. Issues catalog (severity)

| ID | Issue | Severity | Where |
|----|--------|----------|--------|
| I1 | Trailing leader dots (and similar) not stripped from `item_name` | **High** | List + table paths |
| I2 | `LIST_COST_LINE_RE` sensitive to internal double spaces / OCR spacing | **High** | `LIST_COST_LINE_RE` + lazy `.+?` |
| I3 | `item_raw[:200]` truncates before cleanup; dots consume budget | **Medium** | `process_list_lines` |
| I4 | Bleed regex only targets `dd.dd` triples; misses integers / mixed junk | **Medium** | After `clean_list_item_ocr` |
| I5 | Table path has no dot/bleed normalization on `item` | **Medium** | Grid extraction |
| I6 | Weak validation when only 1–2 numeric fields parsed | **Medium** | List + table |
| I7 | Section attribution (`QUALITY`, `TRAILER`, …) | **Low–Med** | Header regex breadth |
| I8 | Duplicate / cross-path rows (list + table) | **Low** (partially deduped) | `list_seen` / insert |

---

## 5. Recommended improvements (near-term)

1. **Post-process `item_name` (shared helper)**  
   - Strip trailing `\s*[\.\u00b7·…]{2,}\s*$` and repeated `\.{2,}` / ` \. \.` patterns.  
   - Collapse internal runs of **5+** dots to a single space or remove if at line end.  
   - Apply to **both** list and table paths before dedupe/insert.

2. **Tighten list-line parsing**  
   - Prefer delimiter `\s+\.{2,}\s+` (true dot leaders) with fallback for space-only runs.  
   - Or: find **rightmost** plausible price cluster and treat everything left as item (reduces mid-description double-space false splits).

3. **Extend bleed / junk stripping**  
   - Remove trailing `\s+\d{1,4}\s+\d{1,4}\s*$` when not matching cost scale (heuristic).  
   - Optional: strip known footer phrases (`Handicap`, `Barrier Removal`, `See Section`, …) when they appear after a strong delimiter.

4. **Move length limit**  
   - Apply `[:200]` **after** dot/junk stripping, or raise cap for storage with UI ellipsis.

5. **Stronger monotonicity**  
   - When 4 columns present, require `col_1 ≤ col_2 ≤ col_3 ≤ col_4` within tolerance; reject or flag row (already partial).

6. **Section quality**  
   - Blocklist short section names (`QUALITY`, `TYPE`, …) unless part of a longer header.  
   - Continue truncated-header work (see `AND_JUNK_LIST_HEADERS` in the same file).

---

## 6. Future features

| Feature | Benefit |
|---------|--------|
| **Layout-aware extraction** | Use `pdfplumber` words/bboxes to separate description vs leader vs numeric columns per row instead of line regex. |
| **Per-PDF calibration** | YAML/JSON config for delimiter style and page ranges (edition-specific). |
| **Confidence + QA flags** | Store `extraction_flags` (e.g. `leader_dots_removed`, `monotonicity_failed`) for admin review. |
| **Re-clean pipeline** | SQL or script to normalize existing `cce_component_costs.item_name` without full PDF re-run. |
| **Human-in-the-loop** | Admin UI to merge/split rows or fix ITEM for a `source_page`. |
| **Tests on golden pages** | Fixture PDF snippets for pages ~27, ~540 (TRAILER / patios) asserting expected `item_name` and columns. |

---

## 7. Verification

- `python3 scripts/test-component-data-quality.py` — item-length, dot runs, anomalies.  
- `python3 scripts/validate-cce-extraction.py` — broader pipeline.  
- Jest / dry-run: `__tests__/cce-extraction.test.ts` (page ranges).

---

## 8. Summary

The **ITEM** column issues are **expected** given (1) **regex-first** list parsing with a **lazy** description group and **space/dot** delimiters, (2) **no leader-dot removal**, (3) **early 200-char cut**, and (4) **limited** numeric bleed handling. Fixing **leader stripping** and **delimiter strategy** will remove most visible dots; **layout-aware** parsing is the long-term fix for cutoffs and column mix-ups.
