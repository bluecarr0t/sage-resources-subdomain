"""
Gates for pdfplumber grid tables → cce_component_costs (four-tier unit-in-place).

Rejects multiplier / gross-area style tables; allows LOW–EXCELLENT headers or ITEM/DESCRIPTION first column.
"""

from __future__ import annotations

import re
from typing import Any, Optional

# Substrings in merged header (or page text when optional_page_text_exclude) → not a component cost grid
DEFAULT_COMPONENT_TABLE_HEADER_SUBSTRINGS_EXCLUDE = (
    "AREA MULTIPLIER",
    "MULTIPLIER",
    "GROSS AREA",
    "PER SEAT",
    "NUMBER OF UNITS",
    "TOTAL AREA",
    "AVERAGE GROSS AREA",
    "SQ.FT. PER",
    "PER UNIT",
    "BASEMENT",
)


def _merged_header_upper(header_row: list) -> str:
    parts = []
    for c in header_row or []:
        if c is None:
            continue
        s = str(c).strip()
        if s:
            parts.append(s)
    return " ".join(parts).upper()


def _component_table_cfg(profile: dict[str, Any]) -> dict[str, Any]:
    ct = profile.get("component_table")
    return ct if isinstance(ct, dict) else {}


def component_table_header_blocked(
    header_row: list,
    profile: dict[str, Any],
    page_text_upper: Optional[str] = None,
) -> bool:
    """True if this table should never be treated as a component cost grid."""
    cfg = _component_table_cfg(profile)
    extra = cfg.get("header_substrings_exclude") or []
    phrases = list(DEFAULT_COMPONENT_TABLE_HEADER_SUBSTRINGS_EXCLUDE)
    if isinstance(extra, list):
        phrases.extend(str(x).strip().upper() for x in extra if isinstance(x, str) and x.strip())

    merged = _merged_header_upper(header_row)
    for p in phrases:
        if p and p in merged:
            return True

    if cfg.get("optional_page_text_exclude") and page_text_upper:
        pt = page_text_upper.upper()
        for p in phrases:
            if p and p in pt:
                return True

    return False


def component_table_header_allowed(header_row: list) -> bool:
    """
    True if header matches four-tier money columns or a clear ITEM/DESCRIPTION first column.
    Calculator Method (CLASS+TYPE) tables use a different extract branch and should not rely on this.
    """
    if not header_row:
        return False

    first_raw = str(header_row[0] or "").strip()
    first_u = first_raw.upper()
    # TYPE-only first column → occupancy-style, not unit-in-place item column
    if first_u == "TYPE" or re.match(r"^TYPE\s*$", first_u):
        return False

    merged = _merged_header_upper(header_row)

    has_low = bool(re.search(r"\bLOW\b", merged))
    has_good = bool(re.search(r"\bGOOD\b", merged))
    has_avg = bool(re.search(r"\bAVG\.?\b", merged) or re.search(r"\bAVERAGE\b", merged))
    has_high = bool(
        re.search(r"\bEXCL\.?\b", merged)
        or re.search(r"\bEXCELLENT\b", merged)
    )

    if has_low and has_good and has_avg and has_high:
        return True

    if any(k in first_u for k in ("ITEM", "DESCRIPTION", "COMPONENT")):
        return True

    return False


def component_table_allow_numeric_fallback(profile: dict[str, Any]) -> bool:
    """When False (default), skip cost_cols auto-range fallback without explicit cost headers."""
    cfg = _component_table_cfg(profile)
    return bool(cfg.get("allow_numeric_fallback", False))
