#!/usr/bin/env python3
"""
Re-apply normalize_component_item_name to cce_component_costs.item_name without re-parsing the PDF.

Uses NORMALIZATION_VERSION from cce_component_item_extract; only updates rows where
normalization_version < current (or all rows with --force).

Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)

Usage:
  python3 scripts/reclean-cce-component-items.py --dry-run
  python3 scripts/reclean-cce-component-items.py --extraction-date 2026-03-01
  python3 scripts/reclean-cce-component-items.py --force
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

try:
    from supabase import create_client
except ImportError:
    print("pip install supabase", file=sys.stderr)
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cce_component_item_extract import (  # noqa: E402
    ITEM_MAX_LEN,
    NORMALIZATION_VERSION,
    build_component_extraction_flags,
    normalize_component_item_name,
)


def main() -> None:
    p = argparse.ArgumentParser(description="Re-normalize cce_component_costs.item_name in Supabase")
    p.add_argument("--dry-run", action="store_true", help="Print counts only, no updates")
    p.add_argument("--extraction-date", default=None, help="Only rows with this extraction_date (YYYY-MM-DD)")
    p.add_argument("--force", action="store_true", help="Update all rows regardless of normalization_version")
    p.add_argument("--batch-size", type=int, default=200)
    args = p.parse_args()

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        print("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)

    sb = create_client(url, key)
    target_ver = NORMALIZATION_VERSION

    sel = "id,item_name,normalization_version,extraction_date,extraction_flags"
    base = sb.table("cce_component_costs").select(sel).order("id")
    if args.extraction_date:
        base = base.eq("extraction_date", args.extraction_date)

    changed = 0
    scanned = 0
    from_idx = 0
    batch_fetch = 500

    while True:
        try:
            r = base.range(from_idx, from_idx + batch_fetch - 1).execute()
        except Exception as e:
            if "normalization_version" in str(e).lower() or "column" in str(e).lower():
                print(
                    "Error: run scripts/migrations/add-cce-component-costs-flags.sql first.",
                    file=sys.stderr,
                )
            raise
        rows = r.data or []
        if not rows:
            break
        for row in rows:
            scanned += 1
            vid = row.get("id")
            old = row.get("item_name") or ""
            ver = row.get("normalization_version")
            if not args.force and ver is not None and int(ver) >= target_ver:
                continue
            new = normalize_component_item_name(old)[:ITEM_MAX_LEN]
            if new == old and not args.force:
                continue
            patch_flags = build_component_extraction_flags(item_raw=old, item_final=new)
            prev = row.get("extraction_flags")
            merged = dict(prev) if isinstance(prev, dict) else {}
            merged.update(patch_flags)
            changed += 1
            if args.dry_run:
                continue
            try:
                sb.table("cce_component_costs").update({
                    "item_name": new,
                    "normalization_version": target_ver,
                    "extraction_flags": merged,
                }).eq("id", vid).execute()
            except Exception as e:
                print(f"Update failed for {vid}: {e}", file=sys.stderr)
        if len(rows) < batch_fetch:
            break
        from_idx += batch_fetch

    print(
        f"Reclean: scanned={scanned} would_update/changed={changed} "
        f"target_normalization_version={target_ver} dry_run={args.dry_run}"
    )


if __name__ == "__main__":
    main()
