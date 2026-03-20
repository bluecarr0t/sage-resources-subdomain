#!/usr/bin/env python3
"""
Component data quality test for CCE extraction.

Validates cce_component_costs against issues observed in Cost Explorer:
- Duplicate rows (same section_name, item_name, source_page)
- Section quality: "add for" used as section (sub-header, not main section)
- Item misalignment: item_name containing cost-like numbers (column bleed)
- Column shift: col_4 < col_3 when col_3 is reasonable (Excellent < Good)
- Trailing punctuation in section (e.g. "Add for ornate finishes,")
- Low > High anomalies (col_2 < col_1)

Usage:
  python scripts/test-component-data-quality.py
  python scripts/test-component-data-quality.py --json
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))
from cce_component_item_extract import tier_order_ok  # noqa: E402

# Load .env.local
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
except ImportError:
    pass

try:
    from supabase import create_client
except ImportError:
    print("Error: pip install supabase")
    sys.exit(1)


def parse_numeric(s):
    if s is None:
        return None
    try:
        return float(str(s).strip().replace(",", ""))
    except (ValueError, TypeError):
        return None


def main():
    parser = argparse.ArgumentParser(description="Test CCE component data quality")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        print("Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    supabase = create_client(url, key)

    # Fetch component rows
    try:
        r = supabase.table("cce_component_costs").select(
            "id,section_name,item_name,col_1,col_2,col_3,col_4,source_page"
        ).range(0, 9999).execute()
        rows = r.data or []
    except Exception as e:
        print(f"Error fetching data: {e}")
        sys.exit(1)

    report = {
        "total_rows": len(rows),
        "duplicates": [],
        "section_add_for": [],
        "section_trailing_punct": [],
        "item_contains_cost_numbers": [],
        "item_toc_dot_runs": [],
        "tier_order_violations": [],
        "column_shift_excellent_lt_good": [],
        "low_gt_high": [],
        "summary": {},
    }

    # Cost-like number pattern: e.g. "34.34 57.80 97.31" or "3.19 5.37 9.04"
    COST_NUMBERS_RE = re.compile(r"\b\d{1,2}\.\d{2}\s+\d{1,2}\.\d{2}\s+\d{1,2}\.\d{2}\b")
    TOC_DOTS_RE = re.compile(r"\.{3,}")

    def tier_cols(row):
        out = []
        for i in range(1, 5):
            v = row.get(f"col_{i}")
            if v is None:
                out.append(None)
            else:
                try:
                    out.append(float(v))
                except (TypeError, ValueError):
                    out.append(None)
        return out

    seen_keys: dict[tuple, list] = defaultdict(list)
    for row in rows:
        section = (row.get("section_name") or "").strip()
        item = (row.get("item_name") or "").strip()
        page = row.get("source_page")
        key = (section, item, page)
        seen_keys[key].append(row.get("id"))

        # Duplicates
        if len(seen_keys[key]) > 1:
            report["duplicates"].append({
                "section_name": section,
                "item_name": item[:60],
                "source_page": page,
                "count": len(seen_keys[key]),
            })

        # Section: "add for" as section (sub-header used as main section)
        if section and re.match(r"^[Aa]dd\s+for\s+", section):
            report["section_add_for"].append({
                "section_name": section,
                "item_name": item[:50],
                "source_page": page,
            })

        # Section: trailing comma or punctuation
        if section and re.search(r"[,\;]$", section):
            report["section_trailing_punct"].append({
                "section_name": section,
                "item_name": item[:50],
                "source_page": page,
            })

        # Item: contains cost-like numbers (column bleed)
        if item and COST_NUMBERS_RE.search(item):
            report["item_contains_cost_numbers"].append({
                "section_name": section[:40],
                "item_name": item[:80],
                "source_page": page,
            })

        # Item: TOC leader dots (3+)
        if item and TOC_DOTS_RE.search(item):
            report["item_toc_dot_runs"].append({
                "section_name": section[:40],
                "item_name": item[:70],
                "source_page": page,
            })

        if not tier_order_ok(tier_cols(row)):
            report["tier_order_violations"].append({
                "section_name": section[:40],
                "item_name": item[:50],
                "cols": tier_cols(row),
                "source_page": page,
            })

        # Column shift: col_4 < col_3 when both present and col_3 reasonable
        c3 = parse_numeric(row.get("col_3"))
        c4 = parse_numeric(row.get("col_4"))
        if c3 is not None and c4 is not None and c3 > 1 and c4 < c3 * 0.5:
            report["column_shift_excellent_lt_good"].append({
                "section_name": section[:40],
                "item_name": item[:50],
                "col_3": c3,
                "col_4": c4,
                "source_page": page,
            })

        # Low > High
        c1 = parse_numeric(row.get("col_1"))
        c2 = parse_numeric(row.get("col_2"))
        if c1 is not None and c2 is not None and c2 < c1 * 0.5:
            report["low_gt_high"].append({
                "section_name": section[:40],
                "item_name": item[:50],
                "col_1": c1,
                "col_2": c2,
                "source_page": page,
            })

    # Dedupe duplicate report (one per key)
    seen_dup_keys = set()
    deduped = []
    for d in report["duplicates"]:
        k = (d["section_name"], d["item_name"], d["source_page"])
        if k not in seen_dup_keys:
            seen_dup_keys.add(k)
            deduped.append(d)
    report["duplicates"] = deduped

    report["summary"] = {
        "duplicate_groups": len(report["duplicates"]),
        "section_add_for_count": len(report["section_add_for"]),
        "section_trailing_punct_count": len(report["section_trailing_punct"]),
        "item_cost_numbers_count": len(report["item_contains_cost_numbers"]),
        "item_toc_dot_runs_count": len(report["item_toc_dot_runs"]),
        "tier_order_violations_count": len(report["tier_order_violations"]),
        "column_shift_count": len(report["column_shift_excellent_lt_good"]),
        "low_gt_high_count": len(report["low_gt_high"]),
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("=" * 60)
        print("CCE COMPONENT DATA QUALITY REPORT")
        print("=" * 60)
        print(f"\nTotal rows: {report['total_rows']}")
        print("\n--- Issues ---")
        print(f"  Duplicate groups: {report['summary']['duplicate_groups']}")
        print(f"  Section 'add for' (sub-header): {report['summary']['section_add_for_count']}")
        print(f"  Section trailing punctuation: {report['summary']['section_trailing_punct_count']}")
        print(f"  Item contains cost numbers (bleed): {report['summary']['item_cost_numbers_count']}")
        print(f"  Item TOC dot runs (3+): {report['summary']['item_toc_dot_runs_count']}")
        print(f"  Tier order violations: {report['summary']['tier_order_violations_count']}")
        print(f"  Column shift (Excellent < Good): {report['summary']['column_shift_count']}")
        print(f"  Low > High anomalies: {report['summary']['low_gt_high_count']}")

        if report["section_add_for"]:
            print("\n  Sample 'add for' sections:")
            for r in report["section_add_for"][:5]:
                print(f"    - {r['section_name'][:50]} | {r['item_name'][:50]}")

        if report["item_contains_cost_numbers"]:
            print("\n  Sample item cost bleed:")
            for r in report["item_contains_cost_numbers"][:3]:
                print(f"    - {r['item_name'][:70]}")

        if report["tier_order_violations"]:
            print("\n  Sample tier order violations:")
            for r in report["tier_order_violations"][:3]:
                print(f"    - cols={r['cols']} | {r['item_name'][:40]}")

        if report["column_shift_excellent_lt_good"]:
            print("\n  Sample column shift:")
            for r in report["column_shift_excellent_lt_good"][:3]:
                print(f"    - col_3={r['col_3']} col_4={r['col_4']} | {r['item_name'][:40]}")

        print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
