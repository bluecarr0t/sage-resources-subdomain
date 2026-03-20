#!/usr/bin/env python3
"""
Deep audit of CCE PDF extraction - identify ALL table types and ensure nothing is missed.

Usage:
  python scripts/audit-cce-pdf-extraction.py
  python scripts/audit-cce-pdf-extraction.py --start-page 1 --end-page 100

Output: Report of table types found, extraction coverage, and gaps.
"""

import argparse
import os
import re
from collections import defaultdict
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
except ImportError:
    pass

import pdfplumber


def main():
    parser = argparse.ArgumentParser(description="Audit CCE PDF extraction coverage")
    parser.add_argument("--pdf", default=None, help="Path to PDF")
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--end-page", type=int, default=None)
    args = parser.parse_args()

    base = Path(__file__).resolve().parent.parent
    pdf_path = args.pdf or str(base / "local_data" / "CCE_March_2026.pdf")
    if not os.path.isfile(pdf_path):
        print(f"Error: PDF not found: {pdf_path}")
        return 1

    SECTION_PAGE = re.compile(r"SECTION\s+(\d+)\s+PAGE\s+(\d+)", re.IGNORECASE)
    OCCUPANCY_NAME_CODE = re.compile(r"([A-Z][A-Za-z\s\-/]+?)\s*\((\d+)\)")

    # Track all table types by header signature
    table_types: dict[str, dict] = defaultdict(lambda: {"count": 0, "pages": [], "sample_headers": []})
    # Track section names
    sections_by_page: dict[int, tuple[int, str]] = {}
    # Occupancy cost tables (CLASS | TYPE | EXTERIOR)
    occupancy_tables = 0
    occupancy_tables_with_data = 0
    # Percentage tables
    pct_table_pages: set[int] = set()
    # Component-style tables (non-occupancy)
    component_style_tables = 0
    # List-style pages (no grid tables, e.g. BALCONIES AND CANOPIES)
    list_style_pages = 0
    # Tables we skip (no recognized pattern)
    unknown_tables: list[tuple[int, str]] = []
    # All unique header patterns
    all_headers: set[str] = set()

    print(f"Opening PDF: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        start_idx = max(0, args.start_page - 1)
        end_idx = min(total_pages, args.end_page) if args.end_page else total_pages
        end_idx = max(start_idx, end_idx)
        print(f"Total pages: {total_pages}, auditing pages {start_idx + 1}-{end_idx}\n")

        for i in range(start_idx, end_idx):
            page_num = i + 1
            page = pdf.pages[i]
            text = page.extract_text() or ""

            # Section detection
            sec_match = SECTION_PAGE.search(text)
            sec_name_match = re.search(r"SECTION\s+\d+\s+PAGE\s+\d+\s+([A-Z][A-Za-z\s]+?)(?:\s|$|\n)", text)
            current_section = int(sec_match.group(1)) if sec_match else None
            current_section_name = sec_name_match.group(1).strip() if sec_name_match else ""
            if current_section is not None:
                sections_by_page[page_num] = (current_section, current_section_name)

            # Percentage table detection (text-based)
            is_pct = (
                "OCCUPANCY" in text and "LOW" in text and "MEDIAN" in text
                and ("HIGH" in text or "TOTAL" in text or "ELECTRICAL" in text or "PLUMBING" in text or "HVAC" in text)
            )
            if is_pct:
                pct_table_pages.add(page_num)

            # Extract tables
            tables = page.extract_tables()
            if not tables:
                # List-style pages: no grid tables, but may have cost data (e.g. BALCONIES)
                list_cost_line = re.compile(r"^(.+?)\s+[\.\s]{2,}\s+([\d\.\s]+)$")
                for line in text.split("\n"):
                    if list_cost_line.match(line.strip()):
                        list_style_pages += 1
                        break  # Count page once
                continue

            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = table[0]
                header_str = " ".join(str(c or "") for c in header if c)
                header_upper = header_str.upper()
                header_sig = " | ".join(sorted(set((c or "").strip().upper()[:30] for c in header if c)))

                # Categorize by header
                has_class = "CLASS" in header_upper
                has_type = "TYPE" in header_upper
                has_exterior = "EXTERIOR" in header_upper
                has_sq_ft = "SQ. FT" in header_upper or "SQ.FT" in header_upper
                has_item = "ITEM" in header_upper or "DESCRIPTION" in header_upper or "COMPONENT" in header_upper
                has_cost = "COST" in header_upper or "LOW" in header_upper or "MEDIAN" in header_upper

                if has_class and has_type and has_exterior and has_sq_ft:
                    occupancy_tables += 1
                    data_rows = sum(1 for r in table[1:] if r and any(str(c or "").strip() for c in r))
                    if data_rows > 0:
                        occupancy_tables_with_data += 1
                    key = "OCCUPANCY_COST (CLASS|TYPE|EXTERIOR|SQ.FT)"
                elif (not has_class or not has_type) and (has_item or has_cost):
                    component_style_tables += 1
                    key = "COMPONENT_STYLE (item/cost cols)"
                else:
                    key = f"OTHER: {header_sig[:80]}"
                    unknown_tables.append((page_num, header_str[:100]))

                table_types[key]["count"] += 1
                if page_num not in table_types[key]["pages"][-10:]:  # Keep last 10 pages
                    if len(table_types[key]["pages"]) < 20:
                        table_types[key]["pages"].append(page_num)
                if len(table_types[key]["sample_headers"]) < 3:
                    table_types[key]["sample_headers"].append(header_str[:120])
                all_headers.add(header_sig[:100])

        # Report
        print("=" * 70)
        print("CCE PDF EXTRACTION AUDIT REPORT")
        print("=" * 70)

        print("\n## 1. TABLE TYPES FOUND")
        print("-" * 50)
        for key in sorted(table_types.keys(), key=lambda k: -table_types[k]["count"]):
            info = table_types[key]
            print(f"\n  {key}")
            print(f"    Count: {info['count']} tables")
            print(f"    Sample pages: {info['pages'][:10]}")
            for h in info["sample_headers"][:1]:
                print(f"    Sample header: {h[:80]}...")

        print("\n## 2. EXTRACTION COVERAGE")
        print("-" * 50)
        print(f"  Occupancy cost tables (CLASS|TYPE|EXTERIOR): {occupancy_tables} total, {occupancy_tables_with_data} with data")
        print(f"  Component-style tables: {component_style_tables}")
        print(f"  List-style pages (no grid, e.g. BALCONIES): {list_style_pages} pages")
        print(f"  Percentage table pages (OCCUPANCY+LOW+MEDIAN): {len(pct_table_pages)} pages")
        print(f"  Unknown/unmatched tables: {len(unknown_tables)}")

        print("\n## 3. SECTIONS IN PDF")
        print("-" * 50)
        section_pages: dict[tuple[int, str], list[int]] = defaultdict(list)
        for pg, (sec_num, sec_name) in sorted(sections_by_page.items()):
            section_pages[(sec_num, sec_name)].append(pg)
        for (sec_num, sec_name), pages in sorted(section_pages.items()):
            print(f"  Section {sec_num} {sec_name}: pages {min(pages)}-{max(pages)} ({len(pages)} pages)")

        print("\n## 4. UNKNOWN TABLE SAMPLES (potential gaps)")
        print("-" * 50)
        for pg, hdr in unknown_tables[:15]:
            sec = sections_by_page.get(pg, (0, ""))
            print(f"  Page {pg} [{sec[1]}]: {hdr[:70]}...")

        print("\n## 5. RECOMMENDATIONS")
        print("-" * 50)
        if unknown_tables:
            print(f"  - {len(unknown_tables)} tables have unrecognized headers. Review samples above.")
        if component_style_tables > 0:
            print(f"  - Component-style tables: ensure extraction logic matches header patterns.")
        if list_style_pages > 0:
            print(f"  - List-style pages: extraction uses text parsing when extract_tables() returns empty.")
        if len(pct_table_pages) > 0:
            print(f"  - Percentage tables: verify category mapping for non-ELECTRICAL sections (PLUMBING, HVAC).")
        print("  - Run full extraction with --dry-run to compare row counts.")

        print("\n" + "=" * 70)
        return 0


if __name__ == "__main__":
    exit(main())
