"""
Load CCE edition profiles (JSON) for extract-cce-pdf.py.

Profiles live under config/cce-profiles/*.json (repo root relative to this package).
"""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any, Optional

DEFAULT_PROFILE_REL = Path("config/cce-profiles/default.json")


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def default_profile_dict() -> dict[str, Any]:
    return {
        "edition_id": "default",
        "extraction_date_override": None,
        "list_line_strategy": "auto",
        "page_rules": {
            "skip_pages": [],
            "layout_list_pages": [],
            "force_segregated_crop": True,
        },
        "layout": {
            "enabled": False,
            "x_numeric_min_ratio": 0.52,
            "y_tolerance": 3.5,
            "min_words_per_line": 2,
        },
        "section_aliases": {},
        "truncated_and_junk_headers_extra": [],
        "short_section_denylist_extra": [],
        "component_table": {
            "header_substrings_exclude": [],
            "optional_page_text_exclude": False,
            "allow_numeric_fallback": False,
        },
    }


def load_cce_profile(path_or_name: Optional[str]) -> dict[str, Any]:
    """
    Merge default profile with JSON file.
    path_or_name: None -> default.json only; "march_2026" -> config/cce-profiles/march_2026.json;
    absolute or relative path -> that file.
    """
    base = default_profile_dict()
    if not path_or_name or str(path_or_name).strip().lower() in ("", "default"):
        path = _repo_root() / DEFAULT_PROFILE_REL
        if path.is_file():
            return _merge_profile(base, _read_json(path))
        return base

    p = str(path_or_name).strip()
    root = _repo_root()
    if "/" in p or p.endswith(".json"):
        candidate = Path(p)
        if not candidate.is_absolute():
            candidate = root / candidate
    else:
        candidate = root / "config" / "cce-profiles" / f"{p}.json"

    if not candidate.is_file():
        raise FileNotFoundError(f"CCE profile not found: {candidate}")

    return _merge_profile(base, _read_json(candidate))


def _read_json(path: Path) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Profile must be a JSON object: {path}")
    return data


def _merge_profile(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    out = json.loads(json.dumps(base))
    for k, v in overlay.items():
        if k in ("page_rules", "layout", "component_table") and isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = {**out[k], **v}
        else:
            out[k] = v
    return out


def profile_extraction_date(profile: dict[str, Any], pdf_path: str) -> date:
    """Use profile override ISO date (YYYY-MM-DD) if set; else parse from PDF filename."""
    override = profile.get("extraction_date_override")
    if override and isinstance(override, str):
        m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", override.strip())
        if m:
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return date(y, mo, d)
    return _parse_date_from_pdf(pdf_path)


def _parse_date_from_pdf(pdf_path: str) -> date:
    """Duplicate of parse_extraction_date_from_pdf_path logic (avoid importing extract-cce-pdf)."""
    import os

    name = os.path.splitext(os.path.basename(pdf_path))[0]
    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    }
    m = re.search(r"(\d{4})[-_](\d{1,2})", name)
    if m:
        y, mo = int(m.group(1)), int(m.group(2))
        if 1 <= mo <= 12:
            return date(y, mo, 1)
    m = re.search(
        r"(january|february|march|april|may|june|july|august|september|october|november|december)[-_]?(\d{4})",
        name,
        re.I,
    )
    if m:
        mo = month_names.get(m.group(1).lower())
        y = int(m.group(2))
        if mo:
            return date(y, mo, 1)
    m = re.search(
        r"(\d{4})[-_](january|february|march|april|may|june|july|august|september|october|november|december)",
        name,
        re.I,
    )
    if m:
        y = int(m.group(1))
        mo = month_names.get(m.group(2).lower())
        if mo:
            return date(y, mo, 1)
    return date.today()


def apply_section_alias(profile: dict[str, Any], name: Optional[str]) -> Optional[str]:
    if not name:
        return name
    aliases = profile.get("section_aliases") or {}
    if not isinstance(aliases, dict):
        return name
    # Exact match first
    if name in aliases:
        return str(aliases[name])
    u = name.strip().upper()
    for k, v in aliases.items():
        if isinstance(k, str) and k.strip().upper() == u:
            return str(v)
    return name


def profile_skip_page(profile: dict[str, Any], page_num: int) -> bool:
    pages = (profile.get("page_rules") or {}).get("skip_pages") or []
    return page_num in pages


def profile_layout_list_enabled_for_page(profile: dict[str, Any], page_num: int) -> bool:
    layout = profile.get("layout") or {}
    if not layout.get("enabled"):
        return False
    pages = (profile.get("page_rules") or {}).get("layout_list_pages") or []
    if not pages:
        return False
    return page_num in pages
