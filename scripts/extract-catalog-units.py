#!/usr/bin/env python3
"""
Extract Converted Containers and similar catalog unit data from PDF into Supabase.

Usage:
  python scripts/extract-catalog-units.py --start-page 42
  python scripts/extract-catalog-units.py --start-page 42 --end-page 60
  python scripts/extract-catalog-units.py --pdf path/to/catalog.pdf --dry-run

Requires: pip install -r requirements.txt
Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
"""

import argparse
import os
import re
import sys
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


def parse_numeric(s: Optional[str]) -> Optional[float]:
    if s is None or not isinstance(s, str):
        return None
    s = s.strip().replace(",", "").replace("$", "")
    try:
        return float(s)
    except ValueError:
        return None


def coalesce(*vals) -> Optional[str]:
    for v in vals:
        if v is not None and str(v).strip():
            return str(v).strip()
    return None


# Status icon mapping: PDF symbols/glyphs -> DB enum
STATUS_MAP = {
    "included": "included",
    "partial": "partial",
    "not included": "not_included",
    "not_included": "not_included",
    "add on": "add_on",
    "add_on": "add_on",
    "no data": "no_data",
    "no_data": "no_data",
    # Common symbols that might be extracted as text
    "●": "included",
    "○": "not_included",
    "▪": "partial",
    "•": "included",
    "✓": "included",
    "✗": "not_included",
    "x": "not_included",
    "-": "no_data",
    "—": "no_data",
    "n/a": "no_data",
    "n/a.": "no_data",
}


def normalize_status(s: Optional[str]) -> Optional[str]:
    if s is None or not isinstance(s, str):
        return None
    s = s.strip().lower()
    if not s:
        return None
    return STATUS_MAP.get(s) or STATUS_MAP.get(s.strip("."))


# Materials legend abbreviations (store as-is; expand in UI if desired)
MATERIAL_ABBREVS = {"FRP", "FB", "IP", "M", "SFM", "S", "W"}


def extract_hyperlink_text_to_uri(page) -> dict[str, str]:
    """Build a map of link text -> URI by merging hyperlinks with same URI and extracting text from merged bbox.

    PDFs often have multiple small link annotations per product (e.g. each word). Merging by URI
    gives the full product model text for reliable matching against table cells.
    """
    from collections import defaultdict

    result: dict[str, str] = {}
    try:
        links = getattr(page, "hyperlinks", None) or []
    except Exception:
        links = []
    # Group links by URI (same product can have many small annotations)
    uri_to_bboxes: dict[str, list[tuple[float, float, float, float]]] = defaultdict(list)
    for link in links:
        uri = link.get("uri") or link.get("url")
        if not uri or not isinstance(uri, str) or not uri.startswith("http"):
            continue
        x0 = link.get("x0") or link.get("left", 0)
        top = link.get("top") or link.get("y0", 0)
        x1 = link.get("x1") or link.get("right", 0)
        bottom = link.get("bottom") or link.get("y1", 0)
        uri_to_bboxes[uri].append((x0, top, x1, bottom))
    # Merge bboxes per URI, extract text from merged region
    for uri, bboxes in uri_to_bboxes.items():
        if not bboxes:
            continue
        x0 = min(b[0] for b in bboxes)
        y0 = min(b[1] for b in bboxes)
        x1 = max(b[2] for b in bboxes)
        y1 = max(b[3] for b in bboxes)
        try:
            cropped = page.crop((x0, y0, x1, y1))
            text = (cropped.extract_text() or "").strip()
            if text and len(text) > 2:
                key = " ".join(text.split())
                if key and key not in result:
                    result[key] = uri
        except Exception:
            pass
    return result


def resolve_unit_link_from_map(link_map: dict[str, str], product_model: Optional[str]) -> Optional[str]:
    """Resolve product_model to external URL from link map. Tries exact match, then substring match."""
    if not product_model or not link_map:
        return None
    model_norm = " ".join(product_model.split()) if product_model else ""
    if not model_norm:
        return None
    # Exact match first
    uri = link_map.get(model_norm) or link_map.get(product_model)
    if uri:
        return uri
    # Substring match: product_model contained in key (e.g. "ALT 20'Luxe - Base Model" in merged key)
    # Prefer shortest matching key (most specific)
    best: Optional[tuple[int, str]] = None
    for key, url in link_map.items():
        if model_norm in key:
            if best is None or len(key) < best[0]:
                best = (len(key), url)
    return best[1] if best else None


def unreverse_text(s: str) -> str:
    """Reverse text extracted with reversed character order (e.g. rotated PDF table headers)."""
    if not s:
        return s
    return " ".join(word[::-1] for word in s.replace("\n", " ").split())


def is_catalog_table(header_str: str) -> bool:
    """Detect if table header matches catalog format (Manufacturer, Product, Price, etc.)."""
    for h in (header_str.upper(), unreverse_text(header_str).upper()):
        if (
            ("MANUFACTURER" in h or "PRODUCT" in h or "MODEL" in h)
            and ("PRICE" in h or "$" in h)
            and ("LENGTH" in h or "WIDTH" in h or "DIMENSIONS" in h or "FLOOR" in h or "AREA" in h)
        ):
            return True
    return False


def is_directory_table(header_str: str) -> bool:
    """Detect directory-style table (Company Name, Website, E-mail, etc.) - e.g. Treehouse Builders."""
    for h in (header_str.upper(), unreverse_text(header_str).upper()):
        if ("COMPANY" in h or "NAME" in h) and (
            "WEBSITE" in h or "E-MAIL" in h or "EMAIL" in h or "CONTACT" in h or "STATE" in h
        ):
            return True
    return False


# Canonical unit type categories (must match Cost Explorer filter)
CANONICAL_UNIT_TYPES = [
    "A-Frames",
    "Converted Containers",
    "Domes",
    "Mirror Cabins",
    "Pods",
    "Treehouses",
    "Tents",
    "Vintage Trailers",
    "Wagons",
    "Yurts",
]

# Map extracted section headers to canonical unit type (case-insensitive substring match)
# Order matters: more specific patterns (Vintage Trailer, Mirror Cabin) before generic (Container)
SECTION_TO_CANONICAL: list[tuple[list[str], str]] = [
    (["a-frame", "a frame", "aframe"], "A-Frames"),
    (["vintage trailer", "vintage trailers", "retro trailer"], "Vintage Trailers"),
    (["mirror cabin", "mirror cabins"], "Mirror Cabins"),
    (["container", "shipping container", "converted container"], "Converted Containers"),
    (["dome", "geodesic", "geo dome"], "Domes"),
    (["pod", "glamping pod", "nature pod", "space pod"], "Pods"),
    (["treehouse", "tree house"], "Treehouses"),
    (["tent", "safari tent", "bell tent", "canvas tent", "teepee", "tipi"], "Tents"),
    (["wagon", "covered wagon", "conestoga"], "Wagons"),
    (["yurt"], "Yurts"),
]


def normalise_catalog_section(extracted: Optional[str]) -> str:
    """Map extracted section header to canonical unit type. Default: Converted Containers."""
    if not extracted or not extracted.strip():
        return "Converted Containers"
    s = extracted.strip().lower()
    for keywords, canonical in SECTION_TO_CANONICAL:
        if any(kw in s for kw in keywords):
            return canonical
    return "Converted Containers"


def parse_dimensions(s: Optional[str]) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """Parse '20x8' or '20 x 8' -> (20, 8, '20x8'). Returns (length, width, dimensions_ft)."""
    if not s or not isinstance(s, str):
        return None, None, None
    s = s.strip()
    m = re.match(r"(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)", s)
    if m:
        l_val = float(m.group(1))
        w_val = float(m.group(2))
        return l_val, w_val, f"{int(l_val)}x{int(w_val)}"
    return None, None, s if s else None


def main():
    parser = argparse.ArgumentParser(description="Extract catalog units from PDF to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Extract but do not insert")
    parser.add_argument("--pdf", default=None, help="Path to PDF (default: local_data/CCE_March_2026.pdf)")
    parser.add_argument("--start-page", type=int, default=40, help="Start page (1-indexed; 40 for Walden Buyers Guide)")
    parser.add_argument("--end-page", type=int, default=None, help="End page inclusive (default: start+90)")
    parser.add_argument("--clear-first", action="store_true", help="Clear cce_catalog_units before insert")
    parser.add_argument("--debug", action="store_true", help="Print tables and headers found on each page (no insert)")
    args = parser.parse_args()

    base = Path(__file__).resolve().parent.parent
    local_data = base / "local_data"
    # Prefer Walden Buyers Guide (has catalog tables); fallback to CCE
    walden_path = base / "local_data" / "Walden_2025_Unique_Accommodation_Buyers_Guide_1.1 (2).pdf"
    walden_glob = list(local_data.glob("Walden*Buyers*Guide*.pdf")) if local_data.exists() else []
    cce_path = base / "local_data" / "CCE_March_2026.pdf"
    default_pdf = walden_path if walden_path.exists() else (walden_glob[0] if walden_glob else cce_path)
    pdf_path = args.pdf or str(default_pdf)
    if not os.path.isfile(pdf_path):
        print(f"Error: PDF not found: {pdf_path}")
        sys.exit(1)

    supabase: Optional[Client] = None
    if not args.dry_run:
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
        if not url or not key:
            print("Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)")
            sys.exit(1)
        supabase = create_client(url, key)

    catalog_rows: list[dict] = []
    current_catalog_section: Optional[str] = None
    current_price_category: Optional[str] = None
    end_page = args.end_page or (args.start_page + 90)

    print(f"Opening PDF: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        start_idx = max(0, args.start_page - 1)
        end_idx = min(total_pages, end_page)
        end_idx = max(start_idx, end_idx)
        print(f"Total pages: {total_pages}, extracting pages {start_idx + 1}-{end_idx}")

        for i in range(start_idx, end_idx):
            page_num = i + 1
            page = pdf.pages[i]
            text = page.extract_text() or ""

            # Detect catalog section title from page text (e.g. "Converted Container Manufacturers", "Domes")
            section_patterns = [
                r"(?:Vintage\s+)?Trailers?\s+(?:Manufacturers?)?",
                r"Mirror\s+Cabins?\s+(?:Manufacturers?)?",
                r"(?:Converted\s+)?Container\s+(?:Manufacturers?)?",
                r"(?:Geodesic\s+)?Domes?\s+(?:Manufacturers?)?",
                r"(?:Glamping\s+)?Pods?\s+(?:Manufacturers?)?",
                r"Treehouses?\s+(?:Manufacturers?|Builders?)?",
                r"(?:Safari\s+)?Tents?\s+(?:Manufacturers?)?",
                r"(?:Covered\s+)?Wagons?\s+(?:Manufacturers?)?",
                r"Yurts?\s+(?:Manufacturers?)?",
                r"[A-Za-z][A-Za-z\s]+(?:Containers|Structures|Units|Homes|Manufacturers?)",
            ]
            for pat in section_patterns:
                section_match = re.search(pat, text, re.IGNORECASE)
                if section_match:
                    current_catalog_section = section_match.group(0).strip()
                    break

            # Also scan first few lines for standalone category words (Domes, Pods, Yurts, etc.)
            if not current_catalog_section:
                for line in text.split("\n")[:15]:
                    line = line.strip()
                    if len(line) > 3 and len(line) < 80:
                        for keywords, _ in SECTION_TO_CANONICAL:
                            if any(kw in line.lower() for kw in keywords):
                                current_catalog_section = line
                                break
                        if current_catalog_section:
                            break

            # Detect price category header (e.g. "$0 - $50,000")
            price_cat_match = re.search(r"(\$[\d,]+\s*-\s*\$[\d,]+)", text)
            if price_cat_match:
                current_price_category = price_cat_match.group(1).strip()

            # Extract hyperlinks for this page (product model -> URI)
            link_map = extract_hyperlink_text_to_uri(page)

            tables = page.extract_tables()
            if args.debug:
                print(f"\n--- Page {page_num} ---")
                print(f"Tables found: {len(tables) if tables else 0}")
                if text:
                    preview = text[:500].replace("\n", " ")
                    print(f"Text preview: {preview[:300]}...")
                for ti, table in enumerate(tables or []):
                    if not table or len(table) < 1:
                        continue
                    header = table[0]
                    header_str = " ".join(str(c or "") for c in header if c)
                    matched = is_catalog_table(header_str)
                    print(f"  Table {ti + 1}: is_catalog={matched}")
                    print(f"    Header: {header_str[:150]}")
                    if len(table) > 1:
                        print(f"    Row 1 sample: {[str(c)[:20] for c in (table[1][:6] if len(table[1]) >= 6 else table[1])]}")
            for table in tables or []:
                if not table or len(table) < 2:
                    continue

                header = table[0]
                _first_header = " ".join(str(c or "") for c in table[0] if c)
                header_str = " ".join(str(c or "") for c in header if c)
                # Walden PDF may have 2 header rows: row 0 = categories, row 1 = column names (sometimes reversed)
                header_row_idx = 0
                is_directory = False
                for try_idx in range(min(4, len(table))):
                    try_header = " ".join(str(c or "") for c in table[try_idx] if c)
                    if not try_header.strip():
                        continue
                    if is_catalog_table(try_header):
                        header = table[try_idx]
                        header_str = try_header
                        header_row_idx = try_idx
                        # Check row(s) above header for section title (e.g. "Converted Container Manufacturers")
                        for prev_idx in range(try_idx - 1, -1, -1):
                            prev_row = " ".join(str(c or "") for c in table[prev_idx] if c).strip()
                            if prev_row and 8 < len(prev_row) < 80:
                                if any(kw in prev_row.lower() for keywords, _ in SECTION_TO_CANONICAL for kw in keywords):
                                    current_catalog_section = prev_row
                                    break
                        break
                    elif is_directory_table(try_header):
                        header = table[try_idx]
                        header_str = try_header
                        header_row_idx = try_idx
                        is_directory = True
                        for prev_idx in range(try_idx - 1, -1, -1):
                            prev_row = " ".join(str(c or "") for c in table[prev_idx] if c).strip()
                            if prev_row and 8 < len(prev_row) < 80:
                                if any(kw in prev_row.lower() for keywords, _ in SECTION_TO_CANONICAL for kw in keywords):
                                    current_catalog_section = prev_row
                                    break
                        break
                else:
                    continue

                if is_directory:
                    pass  # directory table matched

                # Build column index map (handle reversed/rotated header text)
                col_map: dict[str, int] = {}
                header_normal = unreverse_text(header_str).upper()
                for idx, cell in enumerate(header):
                    c = (cell or "").upper()
                    c_normal = unreverse_text(str(cell or "")).upper()
                    c_combined = c + " " + c_normal
                    if "MANUFACTURER" in c_combined or ("NAME" in c_combined and "MANUFACTURER" in header_normal):
                        col_map["manufacturer"] = idx
                    elif "PRODUCT" in c_combined or "MODEL" in c_combined:
                        col_map["product_model"] = idx
                    elif "PRICE" in c_combined or ("$" in c_combined and "CATEGORY" not in c_combined):
                        col_map["price"] = idx
                    elif "LENGTH" in c_combined and "WIDTH" not in c_combined:
                        col_map["length"] = idx
                    elif "WIDTH" in c_combined:
                        col_map["width"] = idx
                    elif "DIMENSIONS" in c_combined or "L X W" in c_combined:
                        col_map["dimensions"] = idx
                    elif "FLOOR" in c_combined or "AREA" in c_combined:
                        col_map["floor_area"] = idx
                    elif "FRAME" in c_combined:
                        col_map["frame"] = idx
                    elif "EXTERIOR" in c_combined:
                        col_map["exterior"] = idx
                    elif "INSULATION" in c_combined:
                        col_map["insulation"] = idx
                    elif "BATHROOM" in c_combined:
                        col_map["bathroom"] = idx
                    elif "SHOWER" in c_combined:
                        col_map["shower"] = idx
                    elif "KITCHEN" in c_combined:
                        col_map["kitchen"] = idx
                    elif "HVAC" in c_combined:
                        col_map["hvac"] = idx
                    elif "PLUMBING" in c_combined:
                        col_map["plumbing"] = idx
                    elif "ELECTRICAL" in c_combined:
                        col_map["electrical"] = idx
                    elif "LEAD" in c_combined or ("TIME" in c_combined and "WARRANTY" not in c_combined):
                        col_map["lead_time"] = idx
                    elif "WARRANTY" in c_combined:
                        col_map["warranty"] = idx
                    elif "CERTIFICATION" in c_combined:
                        col_map["certification"] = idx
                    elif is_directory and "COMPANY" in c_combined and "NAME" in c_combined and "LOGO" not in c_combined:
                        col_map["manufacturer"] = idx
                    elif is_directory and "WEBSITE" in c_combined:
                        col_map["unit_link"] = idx

                if is_directory:
                    if "manufacturer" not in col_map:
                        col_map["manufacturer"] = 0
                    col_map["product_model"] = col_map.get("manufacturer", 0)
                elif "manufacturer" not in col_map or "product_model" not in col_map:
                    continue

                for row in table[header_row_idx + 1 :]:
                    if not row:
                        continue

                    def get(idx: Optional[int]) -> Optional[str]:
                        if idx is None or idx >= len(row):
                            return None
                        v = row[idx]
                        return str(v).strip() if v else None

                    manufacturer = coalesce(get(col_map.get("manufacturer")))
                    product_model = coalesce(get(col_map.get("product_model"))) if not is_directory else (f"{manufacturer} Builder" if manufacturer else "Builder")
                    if not manufacturer:
                        continue
                    if is_directory and manufacturer in ("United States", "Mexico", "Canada"):
                        continue
                    if not is_directory and (not product_model or len(product_model) < 2):
                        continue

                    unit_link = None
                    if is_directory and "unit_link" in col_map:
                        unit_link = coalesce(get(col_map.get("unit_link")))
                        if unit_link and not unit_link.startswith("http"):
                            unit_link = "https://" + unit_link if unit_link else None

                    price = parse_numeric(get(col_map.get("price"))) if not is_directory else None
                    length = parse_numeric(get(col_map.get("length")))
                    width = parse_numeric(get(col_map.get("width")))
                    dims_raw = get(col_map.get("dimensions"))
                    length2, width2, dimensions_ft = parse_dimensions(dims_raw)
                    if length is None and length2 is not None:
                        length = length2
                    if width is None and width2 is not None:
                        width = width2
                    floor_area = parse_numeric(get(col_map.get("floor_area")))

                    frame = coalesce(get(col_map.get("frame")))
                    exterior = coalesce(get(col_map.get("exterior")))
                    insulation = coalesce(get(col_map.get("insulation")))

                    bathroom = normalize_status(get(col_map.get("bathroom")))
                    shower = normalize_status(get(col_map.get("shower")))
                    kitchen = normalize_status(get(col_map.get("kitchen")))
                    hvac = normalize_status(get(col_map.get("hvac")))
                    plumbing = normalize_status(get(col_map.get("plumbing")))
                    electrical = normalize_status(get(col_map.get("electrical")))

                    lead_time = coalesce(get(col_map.get("lead_time")))
                    warranty = coalesce(get(col_map.get("warranty")))
                    certification = coalesce(get(col_map.get("certification")))

                    # Resolve unit link from hyperlink map (catalog only; directory uses Website column)
                    if not is_directory:
                        unit_link = resolve_unit_link_from_map(link_map, product_model)

                    raw_section = current_catalog_section or "Converted Containers"
                    if args.debug and is_directory:
                        print(f"  [dir] {manufacturer} -> {normalise_catalog_section(raw_section)}")
                    catalog_rows.append({
                        "catalog_section": normalise_catalog_section(raw_section),
                        "manufacturer": manufacturer,
                        "product_model": product_model,
                        "unit_link": unit_link,
                        "price": price,
                        "price_category": current_price_category,
                        "length_ft": length,
                        "width_ft": width,
                        "dimensions_ft": dimensions_ft,
                        "floor_area_sqft": floor_area,
                        "frame_material": frame,
                        "exterior_material": exterior,
                        "insulation_material": insulation,
                        "bathroom": bathroom,
                        "shower": shower,
                        "kitchen": kitchen,
                        "hvac": hvac,
                        "plumbing_system": plumbing,
                        "electrical_system": electrical,
                        "lead_time_weeks": lead_time,
                        "warranty": warranty,
                        "certification": certification,
                        "source_page": page_num,
                    })

    print(f"Found {len(catalog_rows)} catalog unit rows")

    if args.debug:
        return

    if args.dry_run:
        print("\n--- DRY RUN ---")
        for row in catalog_rows[:5]:
            print(f"  {row.get('manufacturer')} | {row.get('product_model')} | ${row.get('price')} | {row.get('unit_link') or '-'}")
        return

    if args.clear_first and supabase:
        supabase.table("cce_catalog_units").delete().gte("source_page", 0).execute()
        print("Cleared cce_catalog_units")

    if catalog_rows and supabase:
        BATCH = 50
        for i in range(0, len(catalog_rows), BATCH):
            batch = catalog_rows[i : i + BATCH]
            try:
                supabase.table("cce_catalog_units").upsert(
                    batch,
                    on_conflict="manufacturer,product_model,source_page",
                ).execute()
                print(f"Upserted batch {i // BATCH + 1} ({len(batch)} rows)")
            except Exception as e:
                try:
                    supabase.table("cce_catalog_units").insert(batch).execute()
                    print(f"Inserted batch {i // BATCH + 1} ({len(batch)} rows)")
                except Exception as e2:
                    print(f"Error inserting batch: {e2}")

    print("Done.")


if __name__ == "__main__":
    main()
