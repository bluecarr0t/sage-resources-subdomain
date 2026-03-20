#!/usr/bin/env python3
"""Unit tests for cce_component_item_extract helpers (no PDF required)."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from cce_component_item_extract import (  # noqa: E402
    ITEM_MAX_LEN,
    join_list_continuation_lines,
    list_section_header_is_truncated_junk,
    normalize_component_item_name,
    parse_list_cost_line,
    section_name_is_weak_short,
    tier_order_ok,
)


class TestTierOrderOk(unittest.TestCase):
    def test_allows_partial(self):
        self.assertTrue(tier_order_ok([10.0, None, None, None]))
        self.assertTrue(tier_order_ok([None, None, None, None]))

    def test_monotonic_four(self):
        self.assertTrue(tier_order_ok([1.0, 2.0, 3.0, 4.0]))
        self.assertFalse(tier_order_ok([4.0, 3.0, 2.0, 1.0]))

    def test_tolerance(self):
        self.assertTrue(tier_order_ok([100.0, 100.0, 100.01, 100.02]))

    def test_three_non_null(self):
        self.assertTrue(tier_order_ok([5.0, 10.0, 20.0, None]))
        self.assertFalse(tier_order_ok([20.0, 10.0, 5.0, None]))


class TestJoinListContinuationLines(unittest.TestCase):
    """Pre-pass: glue description-only lines to the next four-tier cost line."""

    def _nop_protect(self, _line: str) -> bool:
        return False

    def test_merges_two_lines_before_parse(self):
        raw = [
            "Kitchen wall upper",
            "cabinets .......... 32.75 43.00 55.50 72.00",
        ]
        out = join_list_continuation_lines(raw, strategy="auto", line_is_protected=self._nop_protect)
        self.assertEqual(len(out), 1)
        r = parse_list_cost_line(out[0], "auto")
        self.assertIsNotNone(r)
        self.assertIn("Kitchen", r[0])
        self.assertIn("72.00", r[1])

    def test_merges_three_continuation_lines(self):
        raw = [
            "Built-in",
            "bookcases with",
            "adjustable shelves .......... 10.0 20.0 30.0 40.0",
        ]
        out = join_list_continuation_lines(raw, strategy="auto", line_is_protected=self._nop_protect)
        self.assertEqual(len(out), 1)
        self.assertIsNotNone(parse_list_cost_line(out[0], "auto"))

    def test_no_merge_when_next_has_only_two_tail_numbers(self):
        raw = [
            "Orphan description",
            "sparse line .......... 10.0 20.0",
        ]
        out = join_list_continuation_lines(raw, strategy="auto", line_is_protected=self._nop_protect)
        self.assertEqual(len(out), 2)

    def test_parsed_single_line_unchanged(self):
        line = "Single line item .......... 1.0 2.0 3.0 4.0"
        out = join_list_continuation_lines([line], strategy="auto", line_is_protected=self._nop_protect)
        self.assertEqual(out, [line])

    def test_protected_header_stops_merge(self):
        def prot(s: str) -> bool:
            return s.strip().upper() == "WALL COSTS"

        raw = [
            "Hanging fragment only",
            "WALL COSTS",
            "Concrete footings .......... 32.75 43.00 55.50 72.00",
        ]
        out = join_list_continuation_lines(raw, strategy="auto", line_is_protected=prot)
        self.assertEqual(len(out), 3)
        self.assertEqual(out[1].strip().upper(), "WALL COSTS")


class TestParseListCostLine(unittest.TestCase):
    def test_dot_leader(self):
        r = parse_list_cost_line("Concrete footings .......... 32.75 43.00 55.50 72.00")
        self.assertIsNotNone(r)
        item, tail = r
        self.assertIn("Concrete", item)
        self.assertIn("32.75", tail)

    def test_double_space_in_desc_with_dots_requires_dot_match(self):
        # When line has .. leader, legacy space split should not be used alone
        line = "Some item  with spaces ........ 1.0 2.0 3.0 4.0"
        r = parse_list_cost_line(line)
        self.assertIsNotNone(r)

    def test_right_anchored_fallback(self):
        r = parse_list_cost_line("Plain line 10.5 20.5 30.5 40.5")
        self.assertIsNotNone(r)
        self.assertIn("Plain line", r[0])

    def test_strategy_spaces_prefers_legacy_when_no_dots(self):
        line = "Description only spaces  12.5 15.0 18.0 22.0"
        r = parse_list_cost_line(line, strategy="spaces")
        self.assertIsNotNone(r)


class TestGoldenListLineShapes(unittest.TestCase):
    """
    Line-level shapes that mirror problematic CCE PDF pages (e.g. early section list pages ~27,
    long segregated / multi-column stretches ~540). Capture real strings from --dry-run when PDFs change.
    """

    def test_golden_page27_style_balcony_list_with_dot_leader(self):
        # Typical unit-in-place list: description + dot leader + four tiers
        line = (
            "EXTERIOR BALCONIES .............. 45.20 58.00 72.50 91.00"
        )
        r = parse_list_cost_line(line)
        self.assertIsNotNone(r, "dot-first should win over interior spaces")
        item, tail = r
        self.assertIn("BALCON", item.upper())
        self.assertTrue(all(x in tail for x in ("45.20", "91.00")))

    def test_golden_page540_style_segregated_dense_line(self):
        # Segregated / narrow column: tight dot leader, no double-space in description
        line = "Metal roof panels ................ 18.25 24.10 31.00 40.50"
        r = parse_list_cost_line(line)
        self.assertIsNotNone(r)
        item, nums = r
        self.assertIn("Metal roof", item)
        self.assertEqual(len(nums.split()), 4)


class TestNormalizeItem(unittest.TestCase):
    def test_trailing_dots(self):
        s = normalize_component_item_name("Balcony rail ..........")
        self.assertNotRegex(s, r"\.{3,}$")

    def test_mid_dot_run(self):
        s = normalize_component_item_name("Foo .............. Bar")
        self.assertNotIn("........", s)

    def test_length_cap_applied_by_caller(self):
        long_raw = "Word " * 80
        s = normalize_component_item_name(long_raw)[:ITEM_MAX_LEN]
        self.assertLessEqual(len(s), ITEM_MAX_LEN)


class TestNormalizeRealWorldSamples(unittest.TestCase):
    """Strings shaped like Cost Explorer / audit findings (column bleed, leaders, footnotes)."""

    def test_pumps_decimal_bleed_triplet(self):
        raw = "Circulating pumps 34.34 57.80 97.31"
        s = normalize_component_item_name(raw)
        self.assertNotIn("34.34", s)
        self.assertIn("pump", s.lower())

    def test_trailing_see_section_stripped(self):
        raw = "Skylight curb — see section 12"
        s = normalize_component_item_name(raw)
        self.assertNotIn("section 12", s.lower())
        self.assertIn("Skylight", s)

    def test_trailing_page_ref_stripped(self):
        raw = "Gutter downspout P. 540"
        s = normalize_component_item_name(raw)
        self.assertNotRegex(s, r"(?i)p\.?\s*540\s*$")

    def test_footnote_marker_stripped(self):
        raw = "Handrail height standard †"
        s = normalize_component_item_name(raw)
        self.assertNotIn("†", s)

    def test_integer_pair_bleed_after_description(self):
        raw = "Florida rooms 66 2"
        s = normalize_component_item_name(raw)
        self.assertNotRegex(s, r"\b66\s+2\s*$")


class TestSectionWeakShort(unittest.TestCase):
    def test_quality_rejected(self):
        self.assertTrue(section_name_is_weak_short("QUALITY"))

    def test_long_ok(self):
        self.assertFalse(section_name_is_weak_short("QUALITY ASSURANCE PROGRAM"))


class TestListTruncatedHeaders(unittest.TestCase):
    def test_and_public_buildings_rejected(self):
        self.assertTrue(list_section_header_is_truncated_junk("AND PUBLIC BUILDINGS"))

    def test_and_retail_rejected(self):
        self.assertTrue(list_section_header_is_truncated_junk("AND RETAIL"))

    def test_real_section_ok(self):
        self.assertFalse(list_section_header_is_truncated_junk("WALL COSTS"))
        self.assertFalse(list_section_header_is_truncated_junk("SHEDS AND FARM BUILDINGS"))


if __name__ == "__main__":
    unittest.main()
