#!/usr/bin/env python3
"""Tests for component grid → cce_component_costs header gating."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from cce_component_table_gate import (  # noqa: E402
    component_table_allow_numeric_fallback,
    component_table_header_allowed,
    component_table_header_blocked,
)


def _p(**kwargs):
    base = {"component_table": {}}
    base["component_table"].update(kwargs)
    return base


class TestHeaderBlocked(unittest.TestCase):
    def test_area_multiplier_blocked(self):
        h = ["TOTAL AREA (Square Feet)", "Basement", "4", "6", "8"]
        self.assertTrue(component_table_header_blocked(h, {}))

    def test_built_ins_not_blocked(self):
        h = ["ITEM", "LOW", "AVG.", "GOOD", "EXCL."]
        self.assertFalse(component_table_header_blocked(h, {}))

    def test_profile_extra_exclude(self):
        h = ["FOO", "BAR", "CUSTOM BAD PHRASE HERE"]
        self.assertFalse(component_table_header_blocked(h, {}))
        self.assertTrue(
            component_table_header_blocked(h, _p(header_substrings_exclude=["CUSTOM BAD PHRASE"]))
        )

    def test_optional_page_text(self):
        h = ["LOW", "X", "Y", "Z"]
        self.assertFalse(component_table_header_blocked(h, {}))
        self.assertTrue(
            component_table_header_blocked(
                h,
                _p(optional_page_text_exclude=True),
                page_text_upper="SEE AREA MULTIPLIER TABLE BELOW",
            )
        )


class TestHeaderAllowed(unittest.TestCase):
    def test_four_tier_headers(self):
        h = ["", "LOW", "AVG.", "GOOD", "EXCL."]
        self.assertTrue(component_table_header_allowed(h))

    def test_excellent_not_excl(self):
        h = ["Desc", "LOW", "AVERAGE", "GOOD", "EXCELLENT"]
        self.assertTrue(component_table_header_allowed(h))

    def test_item_first_column(self):
        h = ["ITEM", "A", "B", "C", "D"]
        self.assertTrue(component_table_header_allowed(h))

    def test_type_first_column_rejected(self):
        h = ["TYPE", "EXTERIOR", "COST", "X", "Y"]
        self.assertFalse(component_table_header_allowed(h))

    def test_random_numeric_headers_rejected(self):
        h = ["10", "20", "30", "40"]
        self.assertFalse(component_table_header_allowed(h))


class TestNumericFallback(unittest.TestCase):
    def test_default_off(self):
        self.assertFalse(component_table_allow_numeric_fallback({}))

    def test_profile_on(self):
        self.assertTrue(component_table_allow_numeric_fallback(_p(allow_numeric_fallback=True)))


if __name__ == "__main__":
    unittest.main()
