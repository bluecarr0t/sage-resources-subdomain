"""
Layout-aware list-line parsing using pdfplumber word bounding boxes.

Used when a CCE profile enables layout for specific pages (see config/cce-profiles/*.json).
Falls back to empty list when no geometry; caller should use text regex parsing instead.
"""

from __future__ import annotations

from typing import Any

import pdfplumber  # type: ignore


def parse_layout_list_lines(page: pdfplumber.page.Page, layout_cfg: dict[str, Any]) -> list[tuple[str, str]]:
    """
    Return (item_raw, nums_str) pairs for lines that look like unit-in-place cost rows.
    nums_str is space-joined tokens from the numeric (right) band.
    """
    y_tol = float(layout_cfg.get("y_tolerance", 3.5))
    ratio = float(layout_cfg.get("x_numeric_min_ratio", 0.52))
    min_words = int(layout_cfg.get("min_words_per_line", 2))
    min_gap_frac = float(layout_cfg.get("min_gap_fraction", 0.025))

    words = page.extract_words(
        x_tolerance=3,
        y_tolerance=y_tol,
        keep_blank_chars=False,
        use_text_flow=False,
    )
    if not words:
        return []

    page_w = float(page.width)
    x_cut = page_w * ratio

    # Group words into visual lines by vertical proximity
    sorted_w = sorted(words, key=lambda w: (w["top"], w["x0"]))
    lines: list[list[dict]] = []
    for w in sorted_w:
        if not lines:
            lines.append([w])
            continue
        anchor = lines[-1][0]
        if abs(float(w["top"]) - float(anchor["top"])) <= y_tol:
            lines[-1].append(w)
        else:
            lines.append([w])

    out: list[tuple[str, str]] = []
    for row in lines:
        row = sorted(row, key=lambda w: w["x0"])
        if len(row) < min_words:
            continue

        left = [w for w in row if float(w["x0"]) < x_cut]
        right = [w for w in row if float(w["x0"]) >= x_cut]

        if not left or not right:
            max_gap = 0.0
            gap_after = -1
            for i in range(len(row) - 1):
                gap = float(row[i + 1]["x0"]) - float(row[i]["x1"])
                if gap > max_gap:
                    max_gap = gap
                    gap_after = i
            if gap_after >= 0 and max_gap >= page_w * min_gap_frac:
                left = row[: gap_after + 1]
                right = row[gap_after + 1 :]
            else:
                continue

        item_raw = " ".join(str(w["text"]) for w in left).strip()
        nums_str = " ".join(str(w["text"]) for w in right).strip()
        if len(item_raw) < 2:
            continue
        # Require at least two numeric tokens on the right
        parts = nums_str.replace(",", " ").split()
        numish = 0
        for p in parts:
            try:
                float(p)
                numish += 1
            except ValueError:
                if p.replace(".", "", 1).isdigit():
                    numish += 1
        if numish < 2:
            continue
        out.append((item_raw, nums_str))

    return out


def dump_page_words_json(page: pdfplumber.page.Page, y_tolerance: float = 3.5) -> list[dict]:
    """Debug helper: words with positions for threshold tuning (spike / CLI)."""
    words = page.extract_words(x_tolerance=3, y_tolerance=y_tolerance, keep_blank_chars=False)
    return [
        {
            "text": w.get("text"),
            "x0": round(float(w.get("x0", 0)), 2),
            "x1": round(float(w.get("x1", 0)), 2),
            "top": round(float(w.get("top", 0)), 2),
            "bottom": round(float(w.get("bottom", 0)), 2),
        }
        for w in words
    ]
