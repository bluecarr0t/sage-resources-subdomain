#!/usr/bin/env python3
"""
Remove CCE component cost rows that were incorrectly extracted from LIFE EXPECTANCY tables.
Those tables contain years (e.g. 12, 14, 16, 19) not cost values.

Usage:
  python scripts/remove-cce-life-expectancy-rows.py
  python scripts/remove-cce-life-expectancy-rows.py --dry-run
  python scripts/remove-cce-life-expectancy-rows.py --pdf path/to/CCE_March_2026.pdf

Requires: pip install -r requirements.txt
Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
except ImportError:
    pass

import pdfplumber
from supabase import create_client, Client


def main():
    parser = argparse.ArgumentParser(
        description="Remove CCE component costs incorrectly extracted from LIFE EXPECTANCY tables"
    )
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted, do not delete")
    parser.add_argument(
        "--pdf",
        default=None,
        help="Path to PDF (default: local_data/CCE_March_2026.pdf)",
    )
    args = parser.parse_args()

    base = Path(__file__).resolve().parent.parent
    pdf_path = args.pdf or str(base / "local_data" / "CCE_March_2026.pdf")
    if not os.path.isfile(pdf_path):
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    # Find pages containing LIFE EXPECTANCY
    life_expectancy_pages: list[int] = []
    print(f"Scanning PDF: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_num = i + 1
            text = page.extract_text() or ""
            if "LIFE EXPECTANCY" in text.upper():
                life_expectancy_pages.append(page_num)

    if not life_expectancy_pages:
        print("No LIFE EXPECTANCY pages found in PDF. Nothing to remove.")
        sys.exit(0)

    print(f"Found LIFE EXPECTANCY on pages: {life_expectancy_pages}")

    if args.dry_run:
        print("--dry-run: would delete cce_component_costs where source_page in", life_expectancy_pages)
        # Still connect to show count
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
        if url and key:
            supabase: Client = create_client(url, key)
            for p in life_expectancy_pages:
                r = supabase.table("cce_component_costs").select("id", count="exact").eq("source_page", p).execute()
                count = r.count or 0
                if count > 0:
                    print(f"  Page {p}: {count} row(s) would be deleted")
        sys.exit(0)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        print("Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)")
        sys.exit(1)

    supabase: Client = create_client(url, key)
    total_deleted = 0
    for page_num in life_expectancy_pages:
        r = supabase.table("cce_component_costs").delete().eq("source_page", page_num).execute()
        # Supabase delete returns the deleted rows
        deleted = len(r.data) if r.data else 0
        total_deleted += deleted
        if deleted > 0:
            print(f"Deleted {deleted} row(s) from page {page_num}")

    print(f"Done. Removed {total_deleted} life expectancy row(s) from cce_component_costs.")


if __name__ == "__main__":
    main()
