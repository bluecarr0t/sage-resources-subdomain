#!/usr/bin/env python3
"""
Extract Marshall & Swift CCE (Commercial Cost Explorer) data from PDF into Supabase.

Usage:
  python scripts/extract-cce-pdf.py
  python scripts/extract-cce-pdf.py --dry-run
  python scripts/extract-cce-pdf.py --pdf path/to/CCE_March_2026.pdf

Requires: pip install -r requirements.txt
Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
"""

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import Optional

# Load .env.local
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
except ImportError:
    pass

import pdfplumber
from supabase import create_client, Client

from cce_component_item_extract import (
    ITEM_MAX_LEN,
    NORMALIZATION_VERSION,
    build_component_extraction_flags,
    header_implies_multi_tier_costs,
    join_list_continuation_lines,
    list_section_header_is_truncated_junk,
    normalize_component_item_name,
    parse_list_cost_line,
    section_name_is_weak_short,
    tier_order_ok,
)
from cce_component_table_gate import (
    component_table_allow_numeric_fallback,
    component_table_header_allowed,
    component_table_header_blocked,
)
from cce_extract_profile import (
    apply_section_alias,
    load_cce_profile,
    profile_extraction_date,
    profile_layout_list_enabled_for_page,
    profile_skip_page,
)


def parse_numeric(s: Optional[str]) -> Optional[float]:
    if s is None or not isinstance(s, str):
        return None
    s = s.strip().replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def coalesce(*vals) -> Optional[str]:
    for v in vals:
        if v is not None and str(v).strip():
            return str(v).strip()
    return None


def clean_list_item_ocr(s: str) -> str:
    """Fix common OCR artifacts: 'C eiling' -> 'Ceiling', 'F arm' -> 'Farm'."""
    if not s or len(s) < 3:
        return s
    return re.sub(r"\b([A-Z])\s+([a-z])", r"\1\2", s)


def normalize_building_class(s: Optional[str]) -> Optional[str]:
    """Normalize building class: strip newlines, collapse spaces, map merged-cell variants."""
    if s is None or not isinstance(s, str):
        return None
    s = s.strip().replace("\n", " ").replace("\r", " ")
    s = " ".join(s.split())
    if not s:
        return None
    # Map common merged-cell variants (check normalized form)
    s_compact = s.replace(" ", "").upper()
    if s_compact in ("DPOLE", "DPOL"):
        return "D POLE"
    if s_compact in ("DMASONRYVENEER", "DVEN"):
        return "D MASONRY VENEER"
    if s_compact in ("CMILL", "CMIL"):
        return "C MILL"
    if s_compact == "CDS":
        return "C-D-S"
    return s


# Quality type normalization (matches lib/cce-quality-types.ts)
QUALITY_TYPE_MAP = {
    "excellent": "Excellent",
    "very good": "Very Good",
    "verygood": "Very Good",
    "good": "Good",
    "good storage/ mechanical": "Good",
    "good storage/mechanical": "Good",
    "average": "Average",
    "average storage": "Average",
    "fair": "Fair",
    "low cost": "Low cost",
    "low-cost": "Low cost",
    "low cost storage": "Low cost",
    "low-cost storage": "Low cost",
    "cheap": "Low cost",
    "low": "Low cost",
    "finished": "Good",
    "finished, high-value": "Excellent",
    "finished, high-value ": "Excellent",
    "game room, finished": "Good",
    "semi-finished": "Average",
    "unfinished": "Fair",
    "unfinished storage": "Fair",
    "unfin/util": "Fair",
    "display": "Good",
    "office": "Good",
    "parking": "Fair",
    "residential units": "Good",
}


def parse_extraction_date_from_pdf_path(pdf_path: str) -> date:
    """Parse extraction date from PDF filename (e.g. CCE_March_2026.pdf → 2026-03-01)."""
    name = os.path.splitext(os.path.basename(pdf_path))[0]
    # Match March_2026, 2026_March, 2026-03, CCE_March_2026
    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    }
    # Pattern: MonthName_YYYY or YYYY_MonthName
    m = re.search(r"(\d{4})[-_](\d{1,2})", name)
    if m:
        y, mo = int(m.group(1)), int(m.group(2))
        if 1 <= mo <= 12:
            return date(y, mo, 1)
    m = re.search(r"(january|february|march|april|may|june|july|august|september|october|november|december)[-_]?(\d{4})", name, re.I)
    if m:
        mo = month_names.get(m.group(1).lower())
        y = int(m.group(2))
        if mo:
            return date(y, mo, 1)
    m = re.search(r"(\d{4})[-_](january|february|march|april|may|june|july|august|september|october|november|december)", name, re.I)
    if m:
        y = int(m.group(1))
        mo = month_names.get(m.group(2).lower())
        if mo:
            return date(y, mo, 1)
    return date.today()


def normalize_quality_type(s: Optional[str]) -> Optional[str]:
    """Normalize quality type to canonical form."""
    if s is None or not isinstance(s, str):
        return None
    s = s.strip()
    if not s:
        return None
    key = s.lower()
    if key in QUALITY_TYPE_MAP:
        return QUALITY_TYPE_MAP[key]
    if s in ("I", "II", "III", "IV", "V", "VI"):
        return "Average"
    return s


def main():
    parser = argparse.ArgumentParser(description="Extract CCE PDF data to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Extract but do not insert")
    parser.add_argument("--pdf", default=None, help="Path to PDF (default: local_data/CCE_March_2026.pdf)")
    parser.add_argument("--start-page", type=int, default=1, help="Start page (1-indexed, default 1)")
    parser.add_argument("--end-page", type=int, default=None, help="End page inclusive (default: all)")
    parser.add_argument("--clear-first", action="store_true", help="Clear cce_cost_rows before insert (for partial re-extraction)")
    parser.add_argument("--clear-cce-cost-percentages", action="store_true", help="Clear cce_cost_percentages before insert")
    parser.add_argument("--clear-cce-component-costs", action="store_true", help="Clear cce_component_costs before insert")
    parser.add_argument("--clear-cce-modifiers", action="store_true", help="Clear cce_modifiers before insert (avoid duplicates on full re-extract)")
    parser.add_argument("--incremental", action="store_true", help="Resume from last extracted page (from cce_extraction_metadata)")
    parser.add_argument("--validation-report", action="store_true", help="Run validation report after extraction (requires --dry-run or successful insert)")
    parser.add_argument(
        "--profile",
        default=None,
        help="CCE edition profile: name (e.g. march_2026), path to .json, or omit for config/cce-profiles/default.json",
    )
    args = parser.parse_args()

    base = Path(__file__).resolve().parent.parent
    pdf_path = args.pdf or str(base / "local_data" / "CCE_March_2026.pdf")
    if not os.path.isfile(pdf_path):
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    try:
        profile = load_cce_profile(args.profile)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error: invalid profile: {e}")
        sys.exit(1)
    print(
        f"CCE profile edition_id={profile.get('edition_id')!r} "
        f"list_line_strategy={profile.get('list_line_strategy')!r}"
    )
    extra_trunc = frozenset(
        x.strip().upper()
        for x in (profile.get("truncated_and_junk_headers_extra") or [])
        if isinstance(x, str) and x.strip()
    )
    extra_short = frozenset(
        x.strip().upper()
        for x in (profile.get("short_section_denylist_extra") or [])
        if isinstance(x, str) and x.strip()
    )
    list_strategy = str(profile.get("list_line_strategy") or "auto").strip().lower()

    supabase: Optional[Client] = None
    if not args.dry_run:
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
        if not url or not key:
            print("Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)")
            sys.exit(1)
        supabase = create_client(url, key)

    OCCUPANCY_NAME_CODE = re.compile(r"([A-Z][A-Za-z\s\-/]+?)\s*\((\d+)\)")
    SECTION_PAGE = re.compile(r"SECTION\s+(\d+)\s+PAGE\s+(\d+)", re.IGNORECASE)

    occupancies: dict[int, dict] = {}  # code -> {name, section, page_start, page_end}
    cost_rows: list[dict] = []
    cost_pct_rows: list[dict] = []  # percentage tables (e.g. ELECTRICAL)
    component_rows: list[dict] = []  # unit-in-place component costs
    modifier_rows: list[dict] = []  # wall height, perimeter multipliers
    current_section: Optional[int] = None
    current_section_name: Optional[str] = None
    prev_occupancy: Optional[dict] = None  # extends to subsequent pages until new occupancy

    # Percentage table categories (order matches columns: 3 L/M/H + 3 L/M/H + 3 L/M/H + 3 median-only)
    PCT_CATEGORIES = [
        ("TOTAL_ELECTRICAL", True),
        ("SERVICE_DISTRIBUTION", True),
        ("LIGHTING_CONTROL", True),
        ("FIRE_ALARM_DETECTION", False),
        ("STANDBY_POWER", False),
        ("OTHER", False),
    ]
    # Regex: occupancy name (letters, spaces, commas, etc.) + dots/spaces + 9-12 decimal numbers
    PCT_LINE_RE = re.compile(
        r"^(.+?)\s*[\.\s]{2,}\s+([\d\.\s]+)$"
    )
    # List-style cost lines: parsed via parse_list_cost_line() (dot-first, then legacy / right-anchored)
    # Subsection headers on list-style pages (e.g. "EXTERIOR BALCONIES/LANDINGS (Apply to balcony area)")
    SUBSECTION_HEADER_RE = re.compile(
        r"^([A-Z][A-Za-z\s/]+?)\s*\(Apply to\s+[^)]+\)\s*$",
        re.IGNORECASE,
    )
    # Fallback: standalone section headings (e.g. "BALCONIES AND CANOPIES", "EXTERIOR BALCONIES")
    LIST_SECTION_FALLBACK_RE = re.compile(
        r"^([A-Z][A-Za-z\s/]+(?:AND|OR)\s+[A-Za-z\s/]+)\s*$",
    )
    LIST_SECTION_SIMPLE_RE = re.compile(
        r"^([A-Z][A-Za-z\s/]+(?:BALCONIES|CANOPIES|LANDINGS|MARQUEES)[A-Za-z\s/]*)\s*$",
    )
    # Wall Costs, Doors, and similar list-style section headers
    LIST_SECTION_HEADER_RE = re.compile(
        r"^(WALL\s+COSTS|DOORS\s*-\s*RESIDENTIAL|GARAGE\s+DOORS|ORNAMENTAL\s+DOORWAYS|MISCELLANEOUS"
        r"|[A-Z][A-Za-z\s,]+(?:\s*-\s*[A-Z][A-Za-z\s]+)?)\s*$",
        re.IGNORECASE,
    )
    # Segregated cost method category (e.g. "SHEDS AND FARM BUILDINGS", "CHURCHES, THEATERS AND AUDITORIUMS")
    SEGREGATED_CATEGORY_RE = re.compile(
        r"^([A-Z][A-Za-z\s,]+(?:AND|OR)\s+[A-Za-z\s,]+)\s*$",
    )

    # Incremental: fetch last extracted page from metadata
    start_idx = max(0, args.start_page - 1)
    if args.incremental and not args.dry_run and supabase:
        try:
            r = supabase.table("cce_extraction_metadata").select("last_page_extracted, page_end").order("created_at", desc=True).limit(1).execute()
            if r.data and len(r.data) > 0:
                last = r.data[0]
                resume_from = (last.get("last_page_extracted") or last.get("page_end") or 0)
                if resume_from > 0:
                    start_idx = max(resume_from, start_idx)  # Resume after last extracted page
                    print(f"Incremental: resuming from page {start_idx + 1}")
        except Exception as e:
            print(f"Note: incremental lookup failed ({e}), starting from page {start_idx + 1}")

    print(f"Opening PDF: {pdf_path}")
    extract_stats: dict = {
        "rejected_non_monotonic": 0,
        "non_mono_samples": [],
        "sparse_tier_hint_rows": 0,
    }
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        end_idx = min(total_pages, args.end_page) if args.end_page else total_pages
        end_idx = max(start_idx, end_idx)
        print(f"Total pages: {total_pages}, extracting pages {start_idx + 1}-{end_idx}")

        for i in range(start_idx, end_idx):
            page_num = i + 1
            if profile_skip_page(profile, page_num):
                continue
            page = pdf.pages[i]
            text = page.extract_text() or ""
            text_upper = text.upper()
            is_life_expectancy_page = "LIFE EXPECTANCY" in text_upper

            # Detect section
            sec_match = SECTION_PAGE.search(text)
            if sec_match:
                current_section = int(sec_match.group(1))
            # Detect section name (e.g. ELECTRICAL, APARTMENTS) - exclude dates, brand names, garbled text
            sec_name_match = re.search(r"SECTION\s+\d+\s+PAGE\s+\d+\s+([A-Z][A-Za-z\s]+?)(?:\s|$|\n)", text)
            if sec_name_match:
                raw_name = sec_name_match.group(1).strip()
                if section_name_is_weak_short(raw_name, extra=extra_short):
                    raw_name = ""  # skip updating section to ambiguous short fragment
                # Blocklist: dates, brand names, common false positives from PDF layout
                BLOCKED_SECTION_NAMES = frozenset({
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December",
                    "Marshall", "MARSHALL", "Calculator", "CALCULATOR", "Method", "Notes", "Outline",
                    "Table", "TTAABBLLEE", "December", "June", "March", "May", "November",
                    "February", "August", "October", "September", "April", "July",
                    "CLASS", "Type", "Exterior", "INDEX", "ALTERNATE", "OUTLINE",
                })
                # Also block names containing brand/layout junk (case-insensitive)
                raw_upper = raw_name.upper()
                month_names = ("JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
                              "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER")
                is_brand_or_junk = (
                    "MARSHALL" in raw_upper or "VALUATION SERVICE" in raw_upper
                    or raw_upper.startswith("SECTION PAGE") or "SECTION PAGE SECTION" in raw_upper
                    or any(raw_upper.startswith(m) for m in month_names)
                )
                if raw_name and raw_name not in BLOCKED_SECTION_NAMES and not is_brand_or_junk and len(raw_name) >= 3:
                    # Skip table headers, TOC entries, and garbled text
                    skip = (
                        "EXTERIOR WALLS" in raw_name or "INTERIOR FINISH" in raw_name
                        or raw_name.startswith("CLASS ") or "TYPE " in raw_name[:10]
                        or "SEGREGATED COST" in raw_name or "COST SECTIONS" in raw_name
                        or re.search(r"(.)\1{3,}", raw_name) or len(raw_name) > 40
                    )
                    if not skip:
                        current_section_name = apply_section_alias(profile, raw_name)

            # --- Cost percentage tables (ELECTRICAL, PLUMBING, HVAC, etc.) ---
            # Broaden detection: any section with OCCUPANCY + LOW + MEDIAN (percentage-of-total tables)
            is_pct_table = (
                "OCCUPANCY" in text
                and "LOW" in text
                and "MEDIAN" in text
                and ("HIGH" in text or "TOTAL" in text or "ELECTRICAL" in text or "PLUMBING" in text or "HVAC" in text)
            )
            if is_pct_table:
                section_name = current_section_name or "ELECTRICAL"
                pending_occ: Optional[str] = None
                for line in text.split("\n"):
                    m = PCT_LINE_RE.match(line.strip())
                    if not m:
                        stripped = line.strip()
                        if stripped and not re.search(r"\d", stripped) and 2 < len(stripped) < 50:
                            pending_occ = (pending_occ + " " + stripped) if pending_occ else stripped
                        continue
                    occ_name = m.group(1).strip()
                    nums_str = m.group(2)
                    nums = [parse_numeric(x) for x in nums_str.split()]
                    if len(nums) < 9:
                        continue
                    # Handle continuation: "and nursing homes" -> prepend pending
                    if pending_occ and (occ_name.startswith("and ") or len(occ_name) < 20):
                        occ_name = pending_occ + " " + occ_name
                        pending_occ = None
                    else:
                        pending_occ = None
                    if len(occ_name) < 3:
                        continue
                    # Skip header-like lines
                    if occ_name.upper() in ("OCCUPANCY", "OCCUPANCIES") or re.match(r"^[\d\.\s]+$", occ_name):
                        continue
                    # Skip footnote lines
                    if occ_name.startswith("*") or occ_name.startswith("†") or "footnote" in occ_name.lower():
                        continue
                    idx = 0
                    for cat_name, has_lmh in PCT_CATEGORIES:
                        if has_lmh and idx + 2 < len(nums):
                            low_pct, med_pct, high_pct = nums[idx], nums[idx + 1], nums[idx + 2]
                            idx += 3
                            if low_pct is not None or med_pct is not None or high_pct is not None:
                                cost_pct_rows.append({
                                    "section_name": section_name,
                                    "section_number": current_section,
                                    "occupancy": occ_name,
                                    "category": cat_name,
                                    "low_pct": low_pct,
                                    "median_pct": med_pct,
                                    "high_pct": high_pct,
                                    "source_page": page_num,
                                })
                        elif not has_lmh and idx < len(nums):
                            med_pct = nums[idx]
                            idx += 1
                            if med_pct is not None:
                                cost_pct_rows.append({
                                    "section_name": section_name,
                                    "section_number": current_section,
                                    "occupancy": occ_name,
                                    "category": cat_name,
                                    "low_pct": None,
                                    "median_pct": med_pct,
                                    "high_pct": None,
                                    "source_page": page_num,
                                })

            # Detect occupancy name + code (filter false positives from license text)
            OCCUPANCY_NAME_BLOCKLIST = (
                "proprietary", "license", "agreement", "msb ", " msb", "information (",
                "welcome", "dear ", "customer", "subscription", "renewal",
            )
            occ_matches = OCCUPANCY_NAME_CODE.findall(text)
            if occ_matches:
                for name, code_str in occ_matches:
                    code = int(code_str)
                    name_clean = name.strip()
                    if "CALCULATOR METHOD" in name_clean:
                        name_clean = name_clean.replace("CALCULATOR METHOD", "").strip()
                    # Skip license/junk: code < 50 or name too long
                    if code < 50 or len(name_clean) > 50 or len(name_clean) < 3:
                        continue
                    # Skip names containing license/proprietary phrases
                    name_lower = name_clean.lower()
                    if any(phrase in name_lower for phrase in OCCUPANCY_NAME_BLOCKLIST):
                        continue
                    if code not in occupancies:
                        occupancies[code] = {
                            "occupancy_code": code,
                            "occupancy_name": name_clean,
                            "section_number": current_section,
                            "page_start": page_num,
                            "page_end": page_num,
                        }
                    occupancies[code]["page_end"] = page_num
                    prev_occupancy = occupancies[code]
            else:
                # No new occupancy on this page; extend previous occupancy's range
                if prev_occupancy:
                    prev_occupancy["page_end"] = page_num

            # Occupancy for this page (for occupancy-specific component linking)
            occ_for_page = None
            candidates = [
                occ for occ in occupancies.values()
                if occ["page_start"] <= page_num <= occ["page_end"]
            ]
            if candidates:
                occ_for_page = max(candidates, key=lambda o: o["page_start"])

            # Extract tables
            tables = page.extract_tables()

            # --- List-style cost data: run for ALL pages (with or without grid tables) ---
            # Parse lines like "Concrete .........32.75 43.00 55.50 72.00"
            # Both list-style and grid tables are extracted; list_seen dedupes across both
            LIST_SKIP_PATTERNS = (
                r"^dear\b", r"^dear\s+customer", r"^it is a pleasure", r"^customer\b",
                r"^(excellent|very good|good|average|fair|low|cheap)$",
                r"^(excellent|very good|good|average|fair|low|cheap)\s*[|\|]\s*[\d\.]+",  # "Good | 18.1"
                r"^(i|ii|iii|iv|v|vi)$", r"^section\s+[ivxlcdm]+\s*$", r"^for\s+",
                r"^see\s+section\s+", r"^deduct\s+",
            )
            LIST_SKIP_SECTIONS = frozenset({
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December",
                "LIFE EXPECTANCY", "LIFE EXPECTANCY GUIDELINES",
                "MARSHALL", "Marshall", "MARSHALL VALUATION SERVICE", "VALUATION SERVICE",
            })
            # Block "Add for X" - these are sub-headers/add-ons, not main sections
            ADD_FOR_PATTERN = re.compile(r"^[Aa]dd\s+for\s+", re.I)
            list_section_name = current_section_name
            # Segregated cost pages: use category from page (e.g. "SHEDS AND FARM BUILDINGS")
            is_segregated_page = "SEGREGATED COST METHOD" in text_upper and not tables
            if is_segregated_page:
                for early_line in text.split("\n")[:10]:
                    early_line = early_line.strip()
                    cat_match = SEGREGATED_CATEGORY_RE.match(early_line)
                    if cat_match and 10 <= len(early_line) <= 60:
                        seg_cat = cat_match.group(1).strip()
                        if not list_section_header_is_truncated_junk(seg_cat, extra_trunc):
                            list_section_name = seg_cat
                        break
            # Fallback: when current_section_name is a blocked date, scan first lines for WALL COSTS etc.
            if not list_section_name or list_section_name in LIST_SKIP_SECTIONS:
                for early_line in text.split("\n")[:20]:
                    early_line = early_line.strip()
                    header_match = LIST_SECTION_HEADER_RE.match(early_line)
                    if header_match and 5 <= len(early_line) <= 50:
                        cand = header_match.group(1).strip().rstrip(",;")
                        if ADD_FOR_PATTERN.match(cand) or list_section_header_is_truncated_junk(cand, extra_trunc):
                            continue
                        list_section_name = cand
                        break
            list_seen: set[tuple[str, str, int]] = set()  # (section, item, page) for dedupe
            if not is_life_expectancy_page:
                page_rules_pr = profile.get("page_rules") or {}
                force_crop = page_rules_pr.get("force_segregated_crop", True)
                if is_segregated_page and force_crop:
                    try:
                        w, h = float(page.width), float(page.height)
                        left = page.crop((0, 0.1 * h, 0.5 * w, 0.95 * h))
                        right = page.crop((0.5 * w, 0.1 * h, w, 0.95 * h))
                        text_blocks = [left.extract_text() or "", right.extract_text() or ""]
                    except Exception:
                        text_blocks = [text]
                else:
                    text_blocks = [text]

                def append_component_from_list_line(item_raw: str, nums_str: str, *, layout_parsed: bool = False) -> None:
                    nums = [parse_numeric(x) for x in nums_str.split()]
                    if len(nums) < 2:
                        return
                    nums = nums[:4]
                    if not tier_order_ok(nums):
                        extract_stats["rejected_non_monotonic"] += 1
                        if len(extract_stats["non_mono_samples"]) < 12:
                            extract_stats["non_mono_samples"].append({
                                "page": page_num,
                                "item": (item_raw or "")[:55],
                                "cols": [nums[k] if k < len(nums) else None for k in range(4)],
                                "source": "layout" if layout_parsed else "list",
                            })
                        return
                    item_final = normalize_component_item_name(item_raw)[:ITEM_MAX_LEN]
                    if len(item_final) < 2 or re.match(r"^[\d\.\s]+$", item_final):
                        return
                    item_lower = item_final.lower()
                    if any(re.search(p, item_lower) for p in LIST_SKIP_PATTERNS):
                        return
                    if not list_section_name or list_section_name in LIST_SKIP_SECTIONS or ADD_FOR_PATTERN.match(list_section_name):
                        return
                    sec_row = apply_section_alias(profile, list_section_name) or (list_section_name or "")
                    n_non_null = sum(1 for x in nums if x is not None)
                    sparse = n_non_null in (1, 2)
                    flags = build_component_extraction_flags(
                        item_raw=item_raw,
                        item_final=item_final,
                        sparse_tiers=sparse,
                        single_column=(n_non_null == 1),
                        layout_parsed=layout_parsed,
                    )
                    dedupe_key = (sec_row, item_final, page_num)
                    if dedupe_key in list_seen:
                        return
                    list_seen.add(dedupe_key)
                    row_data = {
                        "section_name": sec_row,
                        "item_name": item_final,
                        "cost_tier": None,
                        "col_1": nums[0] if len(nums) > 0 else None,
                        "col_2": nums[1] if len(nums) > 1 else None,
                        "col_3": nums[2] if len(nums) > 2 else None,
                        "col_4": nums[3] if len(nums) > 3 else None,
                        "source_page": page_num,
                        "extraction_flags": flags,
                        "normalization_version": NORMALIZATION_VERSION,
                    }
                    if occ_for_page:
                        row_data["occupancy_code"] = occ_for_page["occupancy_code"]
                    component_rows.append(row_data)

                def list_line_is_protected_for_merge(line: str) -> bool:
                    """Same structural lines as the list parser: do not glue across section/subsection headers."""
                    if SUBSECTION_HEADER_RE.match(line):
                        return True
                    if LIST_SECTION_FALLBACK_RE.match(line) and len(line) >= 15:
                        return True
                    if LIST_SECTION_SIMPLE_RE.match(line) and len(line) >= 10:
                        return True
                    if LIST_SECTION_HEADER_RE.match(line) and 5 <= len(line) <= 50:
                        return True
                    return False

                def process_list_lines(lines: list[str]) -> None:
                    nonlocal list_section_name
                    merged_lines = join_list_continuation_lines(
                        lines,
                        strategy=list_strategy,
                        line_is_protected=list_line_is_protected_for_merge,
                    )
                    for line in merged_lines:
                        line = line.strip()
                        if not line:
                            continue
                        sub_match = SUBSECTION_HEADER_RE.match(line)
                        if sub_match:
                            cand = sub_match.group(1).strip().rstrip(",;")
                            if not ADD_FOR_PATTERN.match(cand) and not list_section_header_is_truncated_junk(cand, extra_trunc):
                                list_section_name = cand
                            continue
                        fallback_match = LIST_SECTION_FALLBACK_RE.match(line)
                        if fallback_match and len(line) >= 15:
                            cand = fallback_match.group(1).strip().rstrip(",;")
                            if not ADD_FOR_PATTERN.match(cand) and not list_section_header_is_truncated_junk(cand, extra_trunc):
                                list_section_name = cand
                            continue
                        simple_match = LIST_SECTION_SIMPLE_RE.match(line)
                        if simple_match and len(line) >= 10:
                            cand = simple_match.group(1).strip().rstrip(",;")
                            if not ADD_FOR_PATTERN.match(cand) and not list_section_header_is_truncated_junk(cand, extra_trunc):
                                list_section_name = cand
                            continue
                        header_match = LIST_SECTION_HEADER_RE.match(line)
                        if header_match and 5 <= len(line) <= 50:
                            cand = header_match.group(1).strip().rstrip(",;")
                            if "SECTION PAGE" in cand.upper() or "MARSHALL" in cand.upper() or "VALUATION SERVICE" in cand.upper():
                                continue
                            if ADD_FOR_PATTERN.match(cand):
                                continue
                            if list_section_header_is_truncated_junk(cand, extra_trunc):
                                continue
                            list_section_name = cand
                            continue
                        parsed_line = parse_list_cost_line(line, list_strategy)
                        if not parsed_line:
                            continue
                        append_component_from_list_line(parsed_line[0], parsed_line[1], layout_parsed=False)

                layout_cfg = profile.get("layout") or {}
                layout_pairs: list[tuple[str, str]] = []
                if profile_layout_list_enabled_for_page(profile, page_num):
                    from cce_layout_list_parse import parse_layout_list_lines

                    layout_pairs = parse_layout_list_lines(page, layout_cfg)

                if layout_pairs:
                    for item_raw, nums_str in layout_pairs:
                        append_component_from_list_line(item_raw, nums_str, layout_parsed=True)
                else:
                    for block in text_blocks:
                        process_list_lines(block.split("\n"))

            if not tables:
                continue

            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = table[0]
                header_str = " ".join(str(c or "") for c in header if c).upper()

                # --- Modifier tables (wall height, perimeter multipliers) ---
                if "AVERAGE WALL HEIGHT" in header_str or "WALL HEIGHT" in header_str or ("PERIMETER" in header_str and "AVERAGE" in header_str):
                    mod_type = "wall_height" if "WALL HEIGHT" in header_str else "perimeter"
                    for row in table[1:]:
                        if not row or len(row) < 3:
                            continue
                        nums = [parse_numeric(str(c or "").replace(",", "")) for c in row[:6]]
                        if not any(n is not None for n in nums):
                            continue
                        modifier_rows.append({
                            "modifier_type": mod_type,
                            "section_name": current_section_name,
                            "height_m": nums[0] if len(nums) > 0 else None,
                            "height_ft": nums[1] if len(nums) > 1 else None,
                            "sq_ft_multiplier": nums[2] if len(nums) > 2 else None,
                            "sq_m_multiplier": nums[3] if len(nums) > 3 else None,
                            "cu_ft_multiplier": nums[4] if len(nums) > 4 else None,
                            "source_page": page_num,
                        })
                    continue

                # --- Component cost tables (unit-in-place: item + cost columns) ---
                # Tables with ITEM/DESCRIPTION + numeric columns, but NOT occupancy tables
                if "CLASS" not in header_str or "TYPE" not in header_str:
                    if component_table_header_blocked(header, profile, page_text_upper=text_upper):
                        continue
                    if not component_table_header_allowed(header):
                        continue
                    desc_col = 0
                    cost_cols: list[int] = []
                    for idx, cell in enumerate(header):
                        c = (cell or "").upper()
                        cell_str = str(cell or "").strip()
                        if idx == 0 or "ITEM" in c or "DESCRIPTION" in c or "COMPONENT" in c:
                            desc_col = idx
                        elif "COST" in c or "LOW" in c or "MEDIAN" in c or "HIGH" in c or "TIER" in c or "$" in c:
                            cost_cols.append(idx)
                        elif parse_numeric(cell_str.replace(",", "")) is not None and idx > 0:
                            # Numeric header (e.g. 25,000 or capacity/size columns)
                            cost_cols.append(idx)
                        elif idx > 0 and re.match(r"^[\d¼½¾⅛⅜⅝⅞\/\"\'\s\.]+$", cell_str):
                            # Size header (e.g. ¼", ½", ¾", 1", 25,000)
                            cost_cols.append(idx)
                        elif idx > 0 and re.match(r"^[\d\s\.\'\"ftm]+$", cell_str, re.I):
                            # Size with units: "1\"", "2'", "10 FT", "10mm"
                            cost_cols.append(idx)
                        elif idx > 0 and re.match(r"^[A-Z][A-Za-z\s\-]+$", cell_str) and 2 <= len(cell_str) <= 25:
                            # Descriptive header (SPHEROID, HEMISPHEROID, WOOD TANK) - exclude CLASS/TYPE
                            if "CLASS" not in c and "TYPE" not in c and "OCCUPANCY" not in c:
                                cost_cols.append(idx)
                    # Broaden only when profile allows (default off — avoids multiplier / area grids)
                    if not cost_cols and len(header) >= 3 and component_table_allow_numeric_fallback(profile):
                        first_cell = str(header[0] or "").strip()
                        if first_cell and not re.match(r"^[\d\.\s,]+$", first_cell) and len(first_cell) >= 2:
                            numeric_count = sum(
                                1 for j in range(1, min(len(header), 6))
                                 if parse_numeric(str(header[j] or "").replace(",", "")) is not None
                                 or (j < len(header) and re.match(r"^[\d¼½¾\/\"\'\s\.]+$", str(header[j] or "").strip()))
                            )
                            if numeric_count >= 2:
                                cost_cols = list(range(1, min(5, len(header))))
                    # Skip false positives: letters, quality words, building classes, TOC
                    SKIP_ITEM_PATTERNS = (
                        r"^dear\b",
                        r"^dear\s+customer",
                        r"^it is a pleasure",
                        r"^customer\b",
                        r"^(excellent|very good|good|average|fair|low|cheap)$",
                        r"^(excellent|very good|good|average|fair|low|cheap)\s*[|\|]\s*[\d\.]+",
                        r"^(i|ii|iii|iv|v|vi)$",
                        r"^section\s+[ivxlcdm]+\s*$",
                        r"^[a-ds]\s*$",  # Single letter (building class)
                        r"^(a-b|c-d-s|d\s*pole|s\s*slant|d\s*hoop|cds)$",
                        r"^[a-ds]\s+pole$",
                        r"^[a-ds]\s+slant",
                        r"^[a-ds]\s+hoop",
                    )
                    if cost_cols and current_section_name and not is_life_expectancy_page:
                        for row in table[1:]:
                            if not row:
                                continue
                            item = coalesce(row[desc_col] if desc_col < len(row) else None)
                            if not item or len(item) < 3 or re.match(r"^[\d\.\s]+$", item):
                                continue
                            item_lower = item.lower()
                            if any(re.search(p, item_lower) for p in SKIP_ITEM_PATTERNS):
                                continue
                            nums = [parse_numeric(row[j] if j < len(row) else None) for j in cost_cols[:4]]
                            if any(n is not None for n in nums):
                                if not tier_order_ok(nums):
                                    extract_stats["rejected_non_monotonic"] += 1
                                    if len(extract_stats["non_mono_samples"]) < 12:
                                        extract_stats["non_mono_samples"].append({
                                            "page": page_num,
                                            "item": (item or "")[:55],
                                            "cols": nums[:4],
                                            "source": "table",
                                        })
                                    continue
                                n_non_null = sum(1 for x in nums if x is not None)
                                sparse_hint = n_non_null in (1, 2) and header_implies_multi_tier_costs(header_str, len(cost_cols))
                                if sparse_hint:
                                    extract_stats["sparse_tier_hint_rows"] += 1
                                item_trim = normalize_component_item_name(item)[:ITEM_MAX_LEN]
                                sec_tbl = apply_section_alias(profile, current_section_name) or (current_section_name or "")
                                flags_tbl = build_component_extraction_flags(
                                    item_raw=item,
                                    item_final=item_trim,
                                    sparse_tiers=sparse_hint,
                                    single_column=(n_non_null == 1),
                                    layout_parsed=False,
                                    component_table_gated=True,
                                )
                                dedupe_key = (sec_tbl, item_trim, page_num)
                                if dedupe_key not in list_seen:
                                    list_seen.add(dedupe_key)
                                    row_data = {
                                        "section_name": sec_tbl,
                                        "item_name": item_trim,
                                        "cost_tier": None,
                                        "col_1": nums[0] if len(nums) > 0 else None,
                                        "col_2": nums[1] if len(nums) > 1 else None,
                                        "col_3": nums[2] if len(nums) > 2 else None,
                                        "col_4": nums[3] if len(nums) > 3 else None,
                                        "source_page": page_num,
                                        "extraction_flags": flags_tbl,
                                        "normalization_version": NORMALIZATION_VERSION,
                                    }
                                    if occ_for_page:
                                        row_data["occupancy_code"] = occ_for_page["occupancy_code"]
                                    component_rows.append(row_data)
                    continue

                # Find occupancy for this page (use most recent one that started on or before this page)
                candidates = [
                    occ for occ in occupancies.values()
                    if occ["page_start"] <= page_num <= occ["page_end"]
                ]
                occ_for_page = max(candidates, key=lambda o: o["page_start"]) if candidates else None
                if not occ_for_page:
                    continue

                # --- Alternate format E2: Headerless tables where row 0 is data (e.g. 26.50 | 265.00 | C | EXCELLENT | FINE INTERIOR...) ---
                QUALITY_WORDS = {"EXCELLENT", "GOOD", "AVERAGE", "FAIR", "LOW", "CHEAP"}
                BUILDING_CLASS_PATTERN = re.compile(r"^[A-DS](-[A-DS]+)?$", re.I)

                def _looks_like_headerless_cost_row(row_cells: list) -> bool:
                    if not row_cells or len(row_cells) < 5:
                        return False
                    first_three = [parse_numeric(str(c or "").replace(",", "")) for c in row_cells[:3]]
                    if not all(n is not None and 0.1 < n < 10000 for n in first_three[:2]):
                        return False
                    class_candidates = [str(c or "").strip() for c in row_cells[3:6] if c]
                    has_class = any(
                        BUILDING_CLASS_PATTERN.match(c) or c.upper() in {"A", "B", "C", "D", "S", "A-B", "C-D-S"}
                        for c in class_candidates
                    )
                    has_quality = any(
                        any(q in str(c or "").upper() for q in QUALITY_WORDS)
                        for c in row_cells[3:7]
                    )
                    return has_class or has_quality

                if _looks_like_headerless_cost_row(header):
                    last_class = None
                    for row in table:
                        if not row or len(row) < 5:
                            continue
                        if not _looks_like_headerless_cost_row(row):
                            continue
                        sq_m = parse_numeric(str(row[0] or "").replace(",", ""))
                        sq_ft = parse_numeric(str(row[1] or "").replace(",", ""))
                        cu_ft = parse_numeric(str(row[2] or "").replace(",", "")) if len(row) > 2 else None
                        bc_raw = coalesce(row[3] if len(row) > 3 else None, row[4] if len(row) > 4 else None, last_class)
                        bc = normalize_building_class(str(bc_raw).strip()) if bc_raw else None
                        qt_raw = None
                        for j in range(3, min(6, len(row))):
                            val = str(row[j] or "").strip()
                            if val and any(q in val.upper() for q in QUALITY_WORDS):
                                qt_raw = val
                                break
                        if not qt_raw and len(row) > 4:
                            qt_raw = row[4] if row[4] else row[3]
                        qt = normalize_quality_type(str(qt_raw).strip()) if qt_raw else None
                        ext = coalesce(row[5] if len(row) > 5 else None, row[6] if len(row) > 6 else None)
                        int_ = coalesce(row[6] if len(row) > 6 else None, row[7] if len(row) > 7 else None)
                        if bc:
                            last_class = bc
                        if sq_m is None and sq_ft is None and cu_ft is None:
                            continue
                        cost_rows.append({
                            "occupancy_code": occ_for_page["occupancy_code"],
                            "occupancy_name": occ_for_page["occupancy_name"],
                            "building_class": bc,
                            "quality_type": qt,
                            "exterior_walls": str(ext).strip() if ext else None,
                            "interior_finish": str(int_).strip() if int_ else None,
                            "lighting_plumbing": None,
                            "heat": None,
                            "cost_sq_m": sq_m,
                            "cost_cu_ft": cu_ft,
                            "cost_sq_ft": sq_ft,
                            "source_page": page_num,
                        })
                    continue

                # --- Alternate format: CLASS | TYPE | DESCRIPTION | Cost Per Sq. M. | Cost Per Sq. Ft. ---
                has_alt_format = (
                    "COST PER SQ" in header_str or "COST PER SQ." in header_str
                ) and ("DESCRIPTION" in header_str or ("EXTERIOR" not in header_str and "INTERIOR" not in header_str))
                if has_alt_format:
                    col_map_alt = {}
                    for idx, cell in enumerate(header):
                        c = (cell or "").upper()
                        if "CLASS" in c and "TYPE" not in c:
                            col_map_alt["class"] = idx
                        elif "TYPE" in c and "CLASS" not in c:
                            col_map_alt["type"] = idx
                        elif "DESCRIPTION" in c:
                            col_map_alt["exterior"] = idx
                        elif ("SQ. M" in c or "SQ.M" in c) and "COST" in c:
                            col_map_alt["sq_m"] = idx
                        elif ("SQ. FT" in c or "SQ.FT" in c) and "COST" in c:
                            col_map_alt["sq_ft"] = idx
                    if "class" in col_map_alt and "sq_ft" in col_map_alt:
                        for row in table[1:]:
                            if not row:
                                continue
                            bc = coalesce(
                                str(row[col_map_alt["class"]]).strip() if col_map_alt["class"] < len(row) else None
                            )
                            qt = (
                                str(row[col_map_alt["type"]]).strip()
                                if col_map_alt["type"] < len(row) and row[col_map_alt["type"]]
                                else None
                            )
                            ext = (
                                str(row[col_map_alt["exterior"]]).strip()
                                if col_map_alt.get("exterior") is not None
                                and col_map_alt["exterior"] < len(row)
                                and row[col_map_alt["exterior"]]
                                else None
                            )
                            sq_m = parse_numeric(
                                str(row[col_map_alt["sq_m"]]).strip()
                                if col_map_alt.get("sq_m") is not None and col_map_alt["sq_m"] < len(row)
                                else None
                            )
                            sq_ft = parse_numeric(
                                str(row[col_map_alt["sq_ft"]]).strip()
                                if col_map_alt["sq_ft"] < len(row)
                                else None
                            )
                            if sq_m is None and sq_ft is None:
                                continue
                            bc = normalize_building_class(bc) if bc else None
                            qt = normalize_quality_type(qt) if qt else None
                            cost_rows.append({
                                "occupancy_code": occ_for_page["occupancy_code"],
                                "occupancy_name": occ_for_page["occupancy_name"],
                                "building_class": bc,
                                "quality_type": qt,
                                "exterior_walls": ext,
                                "interior_finish": None,
                                "lighting_plumbing": None,
                                "heat": None,
                                "cost_sq_m": sq_m,
                                "cost_cu_ft": None,
                                "cost_sq_ft": sq_ft,
                                "source_page": page_num,
                            })
                        continue

                # Map columns: CLASS, TYPE, EXTERIOR WALLS, INTERIOR FINISH, LIGHTING, HEAT, Sq.M., Cu.Ft., Sq.Ft.
                col_map = {}
                for idx, cell in enumerate(header):
                    c = (cell or "").upper()
                    if "CLASS" in c and "TYPE" not in c:
                        col_map["class"] = idx
                    elif "TYPE" in c and "CLASS" not in c:
                        col_map["type"] = idx
                    elif "EXTERIOR" in c:
                        col_map["exterior"] = idx
                    elif "INTERIOR" in c:
                        col_map["interior"] = idx
                    elif "LIGHTING" in c or "PLUMBING" in c:
                        col_map["lighting"] = idx
                    elif "HEAT" in c:
                        col_map["heat"] = idx
                    elif "SQ. M" in c or "SQ.M" in c:
                        col_map["sq_m"] = idx
                    elif "CU. FT" in c or "CU.FT" in c or (("COST" in c) and ("CU" in c)):
                        col_map["cu_ft"] = idx
                    elif "SQ. FT" in c or "SQ.FT" in c:
                        col_map["sq_ft"] = idx

                if "class" not in col_map or "sq_ft" not in col_map:
                    continue

                # Data rows (skip header)
                last_class = None
                for row in table[1:]:
                    if not row:
                        continue

                    def get(idx: Optional[int]) -> Optional[str]:
                        if idx is None or idx >= len(row):
                            return None
                        v = row[idx]
                        return str(v).strip() if v else None

                    bc_raw = coalesce(get(col_map.get("class")), last_class)
                    bc = normalize_building_class(bc_raw) if bc_raw else None
                    ext = get(col_map.get("exterior"))
                    int_ = get(col_map.get("interior"))
                    light = get(col_map.get("lighting"))
                    heat = get(col_map.get("heat"))
                    sq_m = parse_numeric(get(col_map.get("sq_m")))
                    cu_ft = parse_numeric(get(col_map.get("cu_ft")))
                    sq_ft = parse_numeric(get(col_map.get("sq_ft")))

                    qt_raw = get(col_map.get("type"))
                    qt = normalize_quality_type(qt_raw) if qt_raw else None
                    if bc:
                        last_class = bc

                    # Skip if no cost data
                    if sq_m is None and cu_ft is None and sq_ft is None:
                        continue

                    cost_rows.append({
                        "occupancy_code": occ_for_page["occupancy_code"],
                        "occupancy_name": occ_for_page["occupancy_name"],
                        "building_class": bc,
                        "quality_type": qt,
                        "exterior_walls": ext,
                        "interior_finish": int_,
                        "lighting_plumbing": light,
                        "heat": heat,
                        "cost_sq_m": sq_m,
                        "cost_cu_ft": cu_ft,
                        "cost_sq_ft": sq_ft,
                        "source_page": page_num,
                    })

    # Dedupe occupancies by code (keep first)
    occ_list = list(occupancies.values())
    print(f"Found {len(occ_list)} occupancies, {len(cost_rows)} cost rows, {len(cost_pct_rows)} cost % rows, {len(component_rows)} component rows, {len(modifier_rows)} modifier rows")

    if args.dry_run:
        print("\n--- DRY RUN ANALYSIS ---")
        print(f"Occupancies: {len(occ_list)}, Cost rows: {len(cost_rows)}")
        # Occupancy sample (filter out likely false positives from license text)
        valid_occ = [o for o in occ_list if len(o["occupancy_name"]) < 50 and o["occupancy_code"] > 50]
        print(f"\nSample occupancies (code > 50, name < 50 chars):")
        for occ in valid_occ[:10]:
            print(f"  {occ['occupancy_code']:4d} | {occ['occupancy_name'][:45]}")
        # Cost row stats
        sq_ft_vals = [r["cost_sq_ft"] for r in cost_rows if r["cost_sq_ft"] is not None]
        if sq_ft_vals:
            print(f"\nCost Sq.Ft stats: min={min(sq_ft_vals):.2f}, max={max(sq_ft_vals):.2f}, count={len(sq_ft_vals)}")
        # Building class distribution
        from collections import Counter
        bc = Counter(r["building_class"] for r in cost_rows if r["building_class"])
        print(f"\nBuilding classes: {dict(bc)}")
        # Sample rows
        print(f"\nSample cost rows:")
        for row in cost_rows[:5]:
            occ_name = next((o["occupancy_name"] for o in occ_list if o["occupancy_code"] == row["occupancy_code"]), "?")[:30]
            print(f"  {occ_name} | {row['building_class']} {row['quality_type']} | Sq.Ft=${row['cost_sq_ft']}")
        if cost_pct_rows:
            print(f"\nCost % rows: {len(cost_pct_rows)}")
            sections = set(r["section_name"] for r in cost_pct_rows)
            print(f"  Sections: {sections}")
            for row in cost_pct_rows[:5]:
                print(f"  {row['occupancy'][:30]} | {row['category']} | med={row['median_pct']}%")
        if component_rows:
            print(f"\nComponent rows: {len(component_rows)}")
            sections = set(r["section_name"] for r in component_rows if r.get("section_name"))
            print(f"  Sections: {sections}")
            for row in component_rows[:5]:
                print(f"  {row.get('item_name', '')[:40]} | {row.get('col_1')} {row.get('col_2')}")
        if extract_stats.get("rejected_non_monotonic", 0) or extract_stats.get("sparse_tier_hint_rows", 0):
            print("\n--- Component extract stats (dry run) ---")
            print(f"  Rejected non-monotonic tiers: {extract_stats.get('rejected_non_monotonic', 0)}")
            for s in extract_stats.get("non_mono_samples", [])[:8]:
                print(f"    page {s.get('page')} cols={s.get('cols')} item={s.get('item', '')[:45]}")
            print(f"  Sparse tier hints (table): {extract_stats.get('sparse_tier_hint_rows', 0)}")
        if modifier_rows:
            print(f"\nModifier rows: {len(modifier_rows)}")
            for row in modifier_rows[:5]:
                print(f"  {row.get('modifier_type')} | h_ft={row.get('height_ft')} sq_ft_mult={row.get('sq_ft_multiplier')}")
        return

    extraction_date_str = profile_extraction_date(profile, pdf_path).isoformat()

    if args.clear_first and supabase:
        supabase.table("cce_cost_rows").delete().gte("source_page", 0).execute()
        print("Cleared cce_cost_rows")
    elif supabase:
        # Replace same-month data (delete rows with same extraction_date before insert)
        try:
            r = supabase.table("cce_cost_rows").delete().eq("extraction_date", extraction_date_str).execute()
            print(f"Replaced existing rows for extraction_date={extraction_date_str}")
        except Exception as e:
            if "extraction_date" in str(e).lower() or "column" in str(e).lower():
                pass  # Column may not exist yet
            else:
                print(f"Note: delete by extraction_date skipped ({e})")

    if args.clear_cce_cost_percentages and supabase:
        supabase.table("cce_cost_percentages").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("Cleared cce_cost_percentages")

    if args.clear_cce_component_costs and supabase:
        supabase.table("cce_component_costs").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("Cleared cce_component_costs")
    elif supabase:
        try:
            supabase.table("cce_component_costs").delete().eq("extraction_date", extraction_date_str).execute()
            print(f"Replaced existing component rows for extraction_date={extraction_date_str}")
        except Exception as e:
            if "extraction_date" in str(e).lower() or "column" in str(e).lower():
                pass
            else:
                print(f"Note: delete cce_component_costs by extraction_date skipped ({e})")

    if args.clear_cce_modifiers and supabase:
        try:
            supabase.table("cce_modifiers").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print("Cleared cce_modifiers")
        except Exception as e:
            print(f"Note: cce_modifiers clear skipped ({e})")

    # Insert occupancies first (needed for occupancy_id on component_rows)
    occ_id_map: dict[int, str] = {}
    if occ_list and supabase:
        occ_rows = [
            {
                "occupancy_code": o["occupancy_code"],
                "occupancy_name": o["occupancy_name"],
                "section_number": o.get("section_number"),
                "page_start": o.get("page_start"),
                "page_end": o.get("page_end"),
            }
            for o in occ_list
        ]
        supabase.table("cce_occupancies").upsert(occ_rows, on_conflict="occupancy_code").execute()
        r = supabase.table("cce_occupancies").select("id, occupancy_code").execute()
        occ_id_map = {row["occupancy_code"]: row["id"] for row in (r.data or [])}

    # Insert modifier rows (if table exists)
    if modifier_rows and supabase:
        try:
            BATCH_MOD = 20
            for i in range(0, len(modifier_rows), BATCH_MOD):
                batch = modifier_rows[i : i + BATCH_MOD]
                supabase.table("cce_modifiers").insert(batch).execute()
            print(f"Inserted {len(modifier_rows)} modifier rows")
        except Exception as e:
            print(f"Note: cce_modifiers insert skipped ({e}). Run create-cce-modifier-tables.sql")

    # Dedupe component_rows by (section_name, item_name, source_page, extraction_date) - keep last occurrence
    if component_rows:
        seen_comp: dict[tuple, dict] = {}
        for r in component_rows:
            k = (r.get("section_name"), r.get("item_name"), r.get("source_page"), extraction_date_str)
            seen_comp[k] = r
        prev_len = len(component_rows)
        component_rows = list(seen_comp.values())
        if len(component_rows) < prev_len:
            print(f"Deduped component rows: {prev_len} -> {len(component_rows)}")

    # Insert component costs (with optional occupancy_id)
    if component_rows and supabase:
        BATCH_COMP = 50
        for i in range(0, len(component_rows), BATCH_COMP):
            batch = []
            for row in component_rows[i : i + BATCH_COMP]:
                r = dict(row)
                occ_code = r.pop("occupancy_code", None)
                occ_id = occ_id_map.get(occ_code) if occ_code else None
                if occ_id:
                    r["occupancy_id"] = occ_id
                r["extraction_date"] = extraction_date_str
                batch.append(r)
            try:
                supabase.table("cce_component_costs").insert(batch).execute()
                print(f"Inserted component batch {i // BATCH_COMP + 1} ({len(batch)} rows)")
            except Exception as e:
                print(f"Note: cce_component_costs insert skipped ({e})")

    # Insert cost percentage rows (upsert to avoid duplicates with unique constraint)
    if cost_pct_rows and supabase:
        BATCH_PCT = 50
        for i in range(0, len(cost_pct_rows), BATCH_PCT):
            batch = cost_pct_rows[i : i + BATCH_PCT]
            try:
                supabase.table("cce_cost_percentages").upsert(
                    batch, on_conflict="section_name,occupancy,category"
                ).execute()
                print(f"Upserted cost % batch {i // BATCH_PCT + 1} ({len(batch)} rows)")
            except Exception as e:
                print(f"Note: cce_cost_percentages upsert skipped ({e}). Run cce-audit-fixes migration.")

    # Insert cost rows (batch) - occ_id_map already computed above
    if not occ_list:
        print("No occupancies extracted; skipping cce_cost_rows.")
    else:
        # Dedupe cost_rows by logical key (keep last occurrence)
        seen: dict[tuple, dict] = {}
        for r in cost_rows:
            key = (
                r["occupancy_code"],
                r.get("building_class") or "",
                r.get("quality_type") or "",
                r.get("exterior_walls") or "",
                r.get("interior_finish") or "",
                r.get("lighting_plumbing") or "",
                r.get("heat") or "",
            )
            seen[key] = r
        cost_rows_deduped = list(seen.values())

        BATCH = 100
        for i in range(0, len(cost_rows_deduped), BATCH):
            batch = cost_rows_deduped[i : i + BATCH]
            rows_to_insert = []
            for r in batch:
                occ_id = occ_id_map.get(r["occupancy_code"])
                if not occ_id:
                    continue
                rows_to_insert.append({
                    "occupancy_id": occ_id,
                    "building_class": r["building_class"],
                    "quality_type": r["quality_type"],
                    "exterior_walls": r["exterior_walls"],
                    "interior_finish": r["interior_finish"],
                    "lighting_plumbing": r["lighting_plumbing"],
                    "heat": r["heat"],
                    "cost_sq_m": r["cost_sq_m"],
                    "cost_cu_ft": r["cost_cu_ft"],
                    "cost_sq_ft": r["cost_sq_ft"],
                    "source_page": r["source_page"],
                    "extraction_date": extraction_date_str,
                })
            if rows_to_insert:
                supabase.table("cce_cost_rows").insert(rows_to_insert).execute()
                print(f"Inserted batch {i // BATCH + 1} ({len(rows_to_insert)} rows)")

    # Insert extraction metadata (audit trail)
    if supabase:
        try:
            meta = {
                "pdf_path": pdf_path,
                "pdf_filename": os.path.basename(pdf_path),
                "page_start": start_idx + 1,
                "page_end": end_idx,
                "total_pages": total_pages,
                "occupancies_count": len(occ_list),
                "cost_rows_count": len(cost_rows),
                "cost_pct_rows_count": len(cost_pct_rows),
                "component_rows_count": len(component_rows),
                "modifier_rows_count": len(modifier_rows),
                "incremental": args.incremental,
                "last_page_extracted": end_idx,
                "status": "completed",
            }
            supabase.table("cce_extraction_metadata").insert(meta).execute()
            print("Recorded extraction metadata")
        except Exception as e:
            print(f"Note: cce_extraction_metadata insert skipped ({e}). Run create-cce-extraction-metadata.sql")

    print("Done.")
    if extract_stats.get("rejected_non_monotonic") or extract_stats.get("sparse_tier_hint_rows"):
        print(
            f"Component extract stats: rejected_non_monotonic={extract_stats.get('rejected_non_monotonic', 0)} "
            f"sparse_tier_hints={extract_stats.get('sparse_tier_hint_rows', 0)}"
        )

    # Optional: run validation report
    if args.validation_report and not args.dry_run and supabase:
        try:
            script_dir = Path(__file__).resolve().parent
            validate_script = script_dir / "validate-cce-extraction.py"
            if validate_script.exists():
                import subprocess
                print("\n--- Validation Report ---")
                subprocess.run([sys.executable, str(validate_script)], check=False, cwd=script_dir.parent)
        except Exception as e:
            print(f"Note: validation report skipped ({e})")


if __name__ == "__main__":
    main()
