#!/usr/bin/env python3
"""
CCE Extraction Validation Report

Validates CCE data in Supabase and prints a report with:
- Row counts by section/table
- Cost outliers (col_1 outside 1st-99th percentile)
- Missing values
- Low > High anomalies (col_2 < col_1 when both present)
- Occupancy-linked component stats
- Suggested fixes

Usage:
  python scripts/validate-cce-extraction.py
  python scripts/validate-cce-extraction.py --json  # Machine-readable output
"""

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
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


def main():
    parser = argparse.ArgumentParser(description="Validate CCE extraction data in Supabase")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        print("Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    supabase = create_client(url, key)
    report = {"tables": {}, "component_validation": {}, "suggestions": []}

    # --- Row counts ---
    for table, label in [
        ("cce_occupancies", "Occupancies"),
        ("cce_cost_rows", "Cost rows"),
        ("cce_cost_percentages", "Cost % rows"),
        ("cce_component_costs", "Component costs"),
        ("cce_modifiers", "Modifiers"),
    ]:
        try:
            r = supabase.table(table).select("id", count="exact").execute()
            count = r.count or 0
            report["tables"][table] = {"count": count, "label": label}
        except Exception as e:
            report["tables"][table] = {"count": 0, "label": label, "error": str(e)}

    # --- Component validation ---
    try:
        # Fetch up to 10k rows for validation (Supabase default limit is 1000)
        cols = "section_name,item_name,col_1,col_2,col_3,col_4,source_page"
        try:
            r = supabase.table("cce_component_costs").select(cols + ",occupancy_id").range(0, 9999).execute()
        except Exception:
            r = supabase.table("cce_component_costs").select(cols).range(0, 9999).execute()
        rows = r.data or []
    except Exception as e:
        report["component_validation"]["error"] = str(e)
        rows = []

    if rows:
        # Section distribution
        sections = Counter(r.get("section_name") or "(null)" for r in rows)
        report["component_validation"]["sections"] = dict(sections.most_common(20))
        report["component_validation"]["total_rows"] = len(rows)

        # Occupancy-linked count (0 if occupancy_id column not yet migrated)
        with_occ = sum(1 for r in rows if r.get("occupancy_id"))
        report["component_validation"]["with_occupancy_id"] = with_occ
        report["component_validation"]["without_occupancy_id"] = len(rows) - with_occ

        # Cost values for outlier detection
        col1_vals = [float(r["col_1"]) for r in rows if r.get("col_1") is not None]
        if col1_vals:
            col1_vals.sort()
            n = len(col1_vals)
            p1 = col1_vals[int(n * 0.01)] if n > 100 else col1_vals[0]
            p99 = col1_vals[int(n * 0.99) - 1] if n > 100 else col1_vals[-1]
            report["component_validation"]["col_1_percentiles"] = {
                "p1": round(p1, 2),
                "p99": round(p99, 2),
                "min": round(min(col1_vals), 2),
                "max": round(max(col1_vals), 2),
            }

            # Outliers: outside p1-p99
            outliers_low = [r for r in rows if r.get("col_1") is not None and float(r["col_1"]) < p1]
            outliers_high = [r for r in rows if r.get("col_1") is not None and float(r["col_1"]) > p99]
            report["component_validation"]["outliers_below_p1"] = len(outliers_low)
            report["component_validation"]["outliers_above_p99"] = len(outliers_high)
            if outliers_low and len(outliers_low) <= 5:
                report["component_validation"]["sample_outliers_low"] = [
                    {"section": r.get("section_name"), "item": (r.get("item_name") or "")[:40], "col_1": r.get("col_1")}
                    for r in outliers_low[:5]
                ]
            if outliers_high and len(outliers_high) <= 5:
                report["component_validation"]["sample_outliers_high"] = [
                    {"section": r.get("section_name"), "item": (r.get("item_name") or "")[:40], "col_1": r.get("col_1")}
                    for r in outliers_high[:5]
                ]

        # Low > High anomalies (col_2 < col_1 when both present)
        anomalies = [
            r for r in rows
            if r.get("col_1") is not None and r.get("col_2") is not None
            and float(r["col_2"]) < float(r["col_1"]) * 0.5
        ]
        report["component_validation"]["low_gt_high_anomalies"] = len(anomalies)
        if anomalies and len(anomalies) <= 5:
            report["component_validation"]["sample_anomalies"] = [
                {"section": r.get("section_name"), "item": (r.get("item_name") or "")[:40], "col_1": r.get("col_1"), "col_2": r.get("col_2")}
                for r in anomalies[:5]
            ]

        # Missing values
        missing_section = sum(1 for r in rows if not r.get("section_name"))
        missing_item = sum(1 for r in rows if not r.get("item_name"))
        missing_col1 = sum(1 for r in rows if r.get("col_1") is None)
        report["component_validation"]["missing"] = {
            "section_name": missing_section,
            "item_name": missing_item,
            "col_1": missing_col1,
        }

        # Section quality: "add for" used as section (sub-header, not main section)
        import re as _re
        add_for_sections = [r for r in rows if r.get("section_name") and _re.match(r"^[Aa]dd\s+for\s+", str(r.get("section_name", "")))]
        report["component_validation"]["section_add_for_count"] = len(add_for_sections)
        if add_for_sections and len(add_for_sections) <= 5:
            report["component_validation"]["sample_add_for_sections"] = [
                {"section": r.get("section_name"), "item": (r.get("item_name") or "")[:40]}
                for r in add_for_sections[:5]
            ]

        # Duplicates (same section, item, page)
        seen = defaultdict(list)
        for r in rows:
            k = (r.get("section_name"), r.get("item_name"), r.get("source_page"))
            seen[k].append(r.get("id"))
        dup_groups = [(k, v) for k, v in seen.items() if len(v) > 1]
        report["component_validation"]["duplicate_groups"] = len(dup_groups)
        if dup_groups and len(dup_groups) <= 3:
            report["component_validation"]["sample_duplicates"] = [
                {"section": k[0], "item": (k[1] or "")[:40], "page": k[2], "count": len(v)}
                for k, v in dup_groups[:3]
            ]

        # Item contains cost-like numbers (column bleed)
        cost_nums_re = _re.compile(r"\b\d{1,2}\.\d{2}\s+\d{1,2}\.\d{2}\s+\d{1,2}\.\d{2}\b")
        item_bleed = [r for r in rows if r.get("item_name") and cost_nums_re.search(str(r.get("item_name", "")))]
        report["component_validation"]["item_cost_bleed_count"] = len(item_bleed)

        # TOC-style leader dots still in item (post-normalize quality signal)
        toc_dots_re = _re.compile(r"\.{3,}")
        item_toc_dots = [r for r in rows if r.get("item_name") and toc_dots_re.search(str(r.get("item_name", "")))]
        report["component_validation"]["item_toc_dot_runs_count"] = len(item_toc_dots)

        # Tier monotonicity (same rules as extract; DB may contain legacy rows)
        def _tier_cols(row):
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

        tier_violations = [r for r in rows if not tier_order_ok(_tier_cols(r))]
        report["component_validation"]["tier_order_violations"] = len(tier_violations)
        if tier_violations and len(tier_violations) <= 5:
            report["component_validation"]["sample_tier_violations"] = [
                {
                    "section": r.get("section_name"),
                    "item": (r.get("item_name") or "")[:45],
                    "cols": _tier_cols(r),
                    "page": r.get("source_page"),
                }
                for r in tier_violations[:5]
            ]

    # --- Extraction metadata (last run) ---
    try:
        r = supabase.table("cce_extraction_metadata").select("*").order("created_at", desc=True).limit(1).execute()
        if r.data and len(r.data) > 0:
            m = r.data[0]
            report["last_extraction"] = {
                "pdf_filename": m.get("pdf_filename"),
                "page_start": m.get("page_start"),
                "page_end": m.get("page_end"),
                "status": m.get("status"),
                "component_rows_count": m.get("component_rows_count"),
                "occupancies_count": m.get("occupancies_count"),
            }
    except Exception:
        pass

    # --- Suggestions ---
    if report.get("component_validation", {}).get("low_gt_high_anomalies", 0) > 0:
        report["suggestions"].append(
            "Review rows where col_2 (High) < col_1 (Low) – may indicate misparsed columns or truncated values."
        )
    if report.get("component_validation", {}).get("outliers_below_p1", 0) > 10:
        report["suggestions"].append(
            "Many low col_1 values – consider filtering or validating extraction for small-cost items."
        )
    if report.get("component_validation", {}).get("missing", {}).get("section_name", 0) > 0:
        report["suggestions"].append(
            f"{report['component_validation']['missing']['section_name']} rows have null section_name – check section detection."
        )
    if report.get("component_validation", {}).get("with_occupancy_id", 0) == 0 and report.get("component_validation", {}).get("total_rows", 0) > 0:
        report["suggestions"].append(
            "No occupancy-linked components. Run migration add-cce-component-occupancy-id.sql and re-extract."
        )
    if report.get("component_validation", {}).get("section_add_for_count", 0) > 0:
        report["suggestions"].append(
            "Section names starting with 'Add for' are sub-headers, not main sections. Block these in extraction (LIST_SECTION_HEADER_RE / blocklist)."
        )
    if report.get("component_validation", {}).get("duplicate_groups", 0) > 0:
        report["suggestions"].append(
            "Duplicate rows (same section, item, page). Add deduplication before insert or fix extraction to avoid double-parsing."
        )
    if report.get("component_validation", {}).get("item_cost_bleed_count", 0) > 0:
        report["suggestions"].append(
            "Item names contain cost-like numbers (column bleed). Tighten LIST_COST_LINE_RE or table column mapping."
        )
    if report.get("component_validation", {}).get("tier_order_violations", 0) > 0:
        report["suggestions"].append(
            "Some rows fail Low→Excellent monotonicity (col_1..col_4). Re-run extract with tier_order_ok or clean legacy rows."
        )
    if report.get("component_validation", {}).get("item_toc_dot_runs_count", 0) > 0:
        report["suggestions"].append(
            "Item names still contain long dot runs (TOC leaders). Review normalize_component_item_name coverage."
        )

    # --- Output ---
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("=" * 60)
        print("CCE EXTRACTION VALIDATION REPORT")
        print("=" * 60)
        print("\nRow counts:")
        for table, data in report["tables"].items():
            err = f" ({data['error']})" if data.get("error") else ""
            print(f"  {data['label']}: {data['count']}{err}")
        if report.get("last_extraction"):
            print("\nLast extraction:")
            for k, v in report["last_extraction"].items():
                print(f"  {k}: {v}")
        if report.get("component_validation"):
            cv = report["component_validation"]
            print("\nComponent validation:")
            print(f"  Total rows: {cv.get('total_rows', 0)}")
            print(f"  With occupancy_id: {cv.get('with_occupancy_id', 0)}")
            print(f"  Low > High anomalies: {cv.get('low_gt_high_anomalies', 0)}")
            if cv.get("col_1_percentiles"):
                print(f"  col_1 range: {cv['col_1_percentiles']['min']} - {cv['col_1_percentiles']['max']}")
            if cv.get("missing"):
                print(f"  Missing: section={cv['missing'].get('section_name', 0)}, item={cv['missing'].get('item_name', 0)}, col_1={cv['missing'].get('col_1', 0)}")
            if cv.get("sections"):
                print("  Top sections:", list(cv["sections"].items())[:8])
            if cv.get("section_add_for_count", 0) > 0:
                print(f"  Section 'add for' (sub-header): {cv['section_add_for_count']}")
            if cv.get("duplicate_groups", 0) > 0:
                print(f"  Duplicate groups: {cv['duplicate_groups']}")
            if cv.get("item_cost_bleed_count", 0) > 0:
                print(f"  Item cost bleed: {cv['item_cost_bleed_count']}")
            if cv.get("tier_order_violations", 0) > 0:
                print(f"  Tier order violations: {cv['tier_order_violations']}")
            if cv.get("item_toc_dot_runs_count", 0) > 0:
                print(f"  Item TOC dot runs (3+ dots): {cv['item_toc_dot_runs_count']}")
        if report.get("suggestions"):
            print("\nSuggestions:")
            for s in report["suggestions"]:
                print(f"  • {s}")
        print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
