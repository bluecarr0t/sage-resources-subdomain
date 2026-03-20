#!/usr/bin/env python3
"""
Dump pdfplumber extract_words() for a single page (layout spike / threshold tuning).

Usage:
  python3 scripts/dump_cce_page_words.py --pdf local_data/CCE_March_2026.pdf --page 27
  python3 scripts/dump_cce_page_words.py --pdf path/to.pdf --page 540 --json
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pip install pdfplumber", file=sys.stderr)
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cce_layout_list_parse import dump_page_words_json  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--pdf", required=True)
    p.add_argument("--page", type=int, required=True, help="1-indexed page number")
    p.add_argument("--json", action="store_true")
    p.add_argument("--y-tolerance", type=float, default=3.5)
    args = p.parse_args()

    path = Path(args.pdf)
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    idx = max(0, args.page - 1)
    with pdfplumber.open(str(path)) as pdf:
        if idx >= len(pdf.pages):
            print(f"Page {args.page} out of range (1-{len(pdf.pages)})", file=sys.stderr)
            sys.exit(1)
        page = pdf.pages[idx]
        pw, ph = float(page.width), float(page.height)
        words = dump_page_words_json(page, y_tolerance=args.y_tolerance)

    if args.json:
        print(json.dumps({"page": args.page, "width": pw, "height": ph, "words": words}, indent=2))
    else:
        print(f"Page {args.page}  size={pw:.1f}x{ph:.1f}  words={len(words)}")
        for w in words[:80]:
            print(f"  {w['text']!r}  x0={w['x0']}-{w['x1']}  top={w['top']}")
        if len(words) > 80:
            print(f"  ... ({len(words) - 80} more)")


if __name__ == "__main__":
    main()
