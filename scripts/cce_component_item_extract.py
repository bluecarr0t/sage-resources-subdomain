"""
Pure helpers for CCE component (unit-in-place) list/table line parsing and ITEM normalization.

Used by extract-cce-pdf.py and unit tests (scripts/__tests__/test_cce_component_item_extract.py).
"""

from __future__ import annotations

import re
from typing import Callable, Optional

ITEM_MAX_LEN = 200
TIER_RTOL = 0.005
TIER_ATOL = 0.02
# Bump when normalize_component_item_name rules change (re-clean script updates stale rows)
NORMALIZATION_VERSION = 1

# Section titles from "SECTION n PAGE m NAME" that are too short / ambiguous alone
SHORT_SECTION_NAME_DENYLIST = frozenset({
    "QUALITY",
    "TRAILER",
    "TYPE",
    "CLASS",
    "INDEX",
    "TABLE",
    "NOTES",
    "WALLS",
    "DOORS",
    "ROOF",
    "FLOOR",
    "HEAT",
    "VENT",
    "SITE",
    "UNIT",
    "BASE",
})

# List-style / segregated page headers where OCR dropped the left column ("X AND Y" → "AND Y")
LIST_TRUNCATED_AND_JUNK_HEADERS = frozenset({
    "AND PUBLIC BUILDINGS",
    "AND SCHOOL",
    "AND HOSPITAL",
    "AND INDUSTRIAL",
    "AND COMMERCIAL",
    "AND INSTITUTIONAL",
    "AND RESIDENTIAL",
    "AND OFFICE",
    "AND RETAIL",
    "AND WAREHOUSE",
    "AND AGRICULTURAL",
    "AND RELIGIOUS",
    "AND RECREATIONAL",
    "AND GOVERNMENT",
    "AND UTILITIES",
    "AND PARKING",
    "AND STORAGE",
    "AND APARTMENTS",
    "AND HOTEL",
    "AND MOTEL",
})

LIST_COST_LINE_RE_DOTS = re.compile(r"^(.+?)\s+\.{2,}\s+([\d\.\s]+)$")
LIST_COST_LINE_RE_LEGACY = re.compile(r"^(.+?)\s+[\.\s]{2,}\s+([\d\.\s]+)$")
# Trailing numeric cluster (cost columns)
LIST_COST_TAIL_RE = re.compile(r"^(.+?)\s+((?:\d{1,4}(?:\.\d{1,4})?\s*)+)$")

_FOOTER_PHRASES = (
    "see section",
    "refer to section",
    "refer to ",
    "footnote",
    "footnotes",
    "accessibility",
    "for additional information",
    "continued on",
    "continued on next",
    "see also",
    "per section",
    "includes additional",
)

# Glued suffixes on item lines (footnote / cross-ref bleed from PDF)
_TRAILING_REF_PATTERNS = (
    re.compile(r"\s+see\s+section\s+[\divxlcdm.]+\s*$", re.I),
    re.compile(r"\s+refer\s+to\s+section\s+[\divxlcdm.]+\s*$", re.I),
    re.compile(r"\s+\(?[Pp]\.?\s*\d+\)?\s*$"),
    re.compile(r"\s+[Pp]age\s+\d+\s*$", re.I),
    re.compile(r"\s+continued\s+on\s+next\s+page\s*$", re.I),
    re.compile(r"\s+MSB\s+.*$", re.I),
)
_FOOTNOTE_MARKERS_END = re.compile(r"\s*[\*†‡]{1,4}\s*$")


def parse_numeric_token(s: Optional[str]) -> Optional[float]:
    if s is None or not isinstance(s, str):
        return None
    s = s.strip().replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def tier_order_ok(cols: list[Optional[float]], rtol: float = TIER_RTOL, atol: float = TIER_ATOL) -> bool:
    """Require non-decreasing order for all non-null tier values in col_1..col_4 order (with tolerance)."""
    vals: list[float] = []
    for c in cols[:4]:
        if c is None:
            continue
        vals.append(float(c))
    if len(vals) < 2:
        return True
    for i in range(len(vals) - 1):
        a, b = vals[i], vals[i + 1]
        tol = max(atol, rtol * max(abs(a), 1e-9))
        if b + tol < a:
            return False
    return True


def clean_list_item_ocr(s: str) -> str:
    """Fix common OCR artifacts: 'C eiling' -> 'Ceiling'."""
    if not s or len(s) < 3:
        return s
    return re.sub(r"\b([A-Z])\s+([a-z])", r"\1\2", s)


def _strip_footer_phrases(s: str) -> str:
    for sep in (" — ", " – ", " - "):
        if sep not in s:
            continue
        parts = s.split(sep)
        if len(parts) < 2:
            continue
        tail = parts[-1].strip().lower()
        for bad in _FOOTER_PHRASES:
            if tail.startswith(bad):
                return sep.join(parts[:-1]).strip()
    return s


def _strip_trailing_reference_junk(s: str) -> str:
    """Remove cross-refs and page hints often glued to the end of a list item."""
    t = s
    for _ in range(4):
        prev = t
        for pat in _TRAILING_REF_PATTERNS:
            t = pat.sub("", t).strip()
        t = _FOOTNOTE_MARKERS_END.sub("", t).strip()
        if t == prev:
            break
    return t


def list_section_header_is_truncated_junk(name: str, extra: Optional[frozenset[str]] = None) -> bool:
    """Reject list/segregated section labels that are clearly truncated 'AND …' OCR fragments."""
    u = (name or "").strip().upper()
    if u in LIST_TRUNCATED_AND_JUNK_HEADERS:
        return True
    if extra and u in extra:
        return True
    return False


def normalize_component_item_name(raw: str) -> str:
    """
    Strip TOC leaders, collapse dot runs, OCR-fix, strip column bleed and footer junk.
    Caller applies length cap (ITEM_MAX_LEN) after this.
    """
    if not raw:
        return ""
    s = raw.strip()
    # Long mid-string dot runs (leaders / OCR)
    s = re.sub(r"\.{5,}", " ", s)
    # Trailing TOC dots
    s = re.sub(r"\s*\.{3,}\s*$", "", s)
    # Repeated ". . ." style
    s = re.sub(r"(?:\s*\.\s*){3,}", " ", s)
    s = " ".join(s.split())
    s = clean_list_item_ocr(s)
    # Trailing cost decimals (triplet+)
    bleed = re.search(r"\s+\d{1,2}\.\d{2}(\s+\d{1,2}\.\d{2}){2,}\s*$", s)
    if bleed:
        s = s[: bleed.start()].strip()
    # Pair of dd.dd at end (bleed)
    bleed2 = re.search(r"\s+\d{1,2}\.\d{2}\s+\d{1,2}\.\d{2}\s*$", s)
    if bleed2:
        s = s[: bleed2.start()].strip()
    # Single trailing dd.dd (small cost fragment)
    bleed3 = re.search(r"\s+\d{1,2}\.\d{2}\s*$", s)
    if bleed3 and len(s) - bleed3.start() < 12:
        s = s[: bleed3.start()].strip()
    # Trailing two small integers (e.g. "66 2" from truncated cost) — conservative
    int_pair = re.search(r"\s+(\d{1,3})\s+(\d{1,3})\s*$", s)
    if int_pair:
        a, b = int(int_pair.group(1)), int(int_pair.group(2))
        if a < 500 and b < 500 and len(s[: int_pair.start()]) > 5:
            s = s[: int_pair.start()].strip()
    # Trailing three small integers (rare bleed from split cost + index)
    int_trip = re.search(r"\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$", s)
    if int_trip:
        a, b, c = int(int_trip.group(1)), int(int_trip.group(2)), int(int_trip.group(3))
        if max(a, b, c) < 500 and len(s[: int_trip.start()]) > 8:
            s = s[: int_trip.start()].strip()
    s = _strip_trailing_reference_junk(s)
    s = _strip_footer_phrases(s)
    s = _strip_trailing_reference_junk(s)
    s = " ".join(s.split())
    return s


def _parse_tail_cluster(line: str) -> Optional[tuple[str, str]]:
    rm = LIST_COST_TAIL_RE.match(line)
    if rm:
        tail = rm.group(2).strip()
        tokens = tail.split()
        parsed = [parse_numeric_token(t) for t in tokens]
        n_ok = sum(1 for x in parsed if x is not None)
        if n_ok >= 2:
            return rm.group(1).strip(), tail
    return None


def list_line_tail_numeric_token_count(nums_str: str) -> int:
    """Count parseable numeric tokens in the cost tail from parse_list_cost_line()."""
    if not nums_str or not nums_str.strip():
        return 0
    return sum(1 for t in nums_str.split() if parse_numeric_token(t) is not None)


def join_list_continuation_lines(
    lines: list[str],
    *,
    strategy: str = "auto",
    line_is_protected: Callable[[str], bool],
) -> list[str]:
    """
    Pre-pass for BUILT-INS-style list pages: merge a line with no parseable cost tail into
    following continuation lines until a line with four tail numbers is found, then parse as one.

    Reduces bad ITEM splits (description broken across lines) and stray quality-only fragments
    incorrectly emitted as items when the numeric row stands alone on the next line.
    """
    out: list[str] = []
    i = 0
    n = len(lines)
    strat = (strategy or "auto").strip().lower()

    while i < n:
        s = lines[i].strip()
        if not s:
            i += 1
            continue
        if line_is_protected(s):
            out.append(s)
            i += 1
            continue
        if parse_list_cost_line(s, strat) is not None:
            out.append(s)
            i += 1
            continue

        buf = [s]
        j = i + 1
        merged_one = False
        while j < n:
            t = lines[j].strip()
            if not t:
                j += 1
                continue
            if line_is_protected(t):
                break
            p2 = parse_list_cost_line(t, strat)
            if p2 is not None:
                if list_line_tail_numeric_token_count(p2[1]) >= 4:
                    out.append(" ".join(buf + [t]))
                    i = j + 1
                    merged_one = True
                break
            buf.append(t)
            j += 1

        if merged_one:
            continue

        for b in buf:
            out.append(b)
        i += 1

    return out


def parse_list_cost_line(line: str, strategy: str = "auto") -> Optional[tuple[str, str]]:
    """
    Return (item_raw, nums_str) for a list-style cost line, or None.
    strategy: auto | dots | spaces (profile list_line_strategy).
    """
    line = line.strip()
    if not line:
        return None
    strat = (strategy or "auto").strip().lower()
    if strat not in ("auto", "dots", "spaces"):
        strat = "auto"

    def try_dots() -> Optional[tuple[str, str]]:
        m = LIST_COST_LINE_RE_DOTS.match(line)
        if m:
            return m.group(1).strip(), m.group(2).strip()
        return None

    def try_legacy() -> Optional[tuple[str, str]]:
        if ".." not in line:
            m = LIST_COST_LINE_RE_LEGACY.match(line)
            if m:
                return m.group(1).strip(), m.group(2).strip()
        return None

    if strat == "dots":
        r = try_dots() or _parse_tail_cluster(line) or try_legacy()
        return r

    if strat == "spaces":
        r = try_legacy() or try_dots() or _parse_tail_cluster(line)
        return r

    # auto
    r = try_dots()
    if r:
        return r
    if ".." not in line:
        r = try_legacy()
        if r:
            return r
    return _parse_tail_cluster(line)


def build_component_extraction_flags(
    *,
    item_raw: str,
    item_final: str,
    sparse_tiers: bool = False,
    single_column: bool = False,
    layout_parsed: bool = False,
    component_table_gated: bool = False,
) -> dict:
    """JSON-serializable flags for cce_component_costs.extraction_flags."""
    flags: dict = {}
    if sparse_tiers:
        flags["sparse_tiers"] = True
    if single_column:
        flags["single_column"] = True
    if layout_parsed:
        flags["layout_parsed"] = True
    if component_table_gated:
        flags["component_table_gated"] = True
    if item_raw and item_final and item_raw.strip() != item_final.strip():
        flags["normalized_changed"] = True
    if item_raw and (re.search(r"\.{3,}", item_raw) or re.search(r"(?:\s*\.\s*){3,}", item_raw)):
        flags["had_dot_leaders"] = True
    return flags


def section_name_is_weak_short(
    raw_name: str,
    max_short_len: int = 12,
    extra: Optional[frozenset[str]] = None,
) -> bool:
    """True if section title should not update current_section (ambiguous short fragment)."""
    t = (raw_name or "").strip()
    if not t:
        return False
    if len(t) > max_short_len:
        return False
    u = re.sub(r"\s+", " ", t).upper()
    if u in SHORT_SECTION_NAME_DENYLIST:
        return True
    if extra and u in extra:
        return True
    return False


def header_implies_multi_tier_costs(header_str: str, cost_cols_len: int) -> bool:
    """Heuristic: table expects 3+ cost columns worth of data."""
    if cost_cols_len >= 3:
        return True
    u = header_str.upper()
    return any(k in u for k in ("LOW", "AVERAGE", "GOOD", "EXCELLENT", "MEDIAN", "HIGH")) and cost_cols_len >= 2
