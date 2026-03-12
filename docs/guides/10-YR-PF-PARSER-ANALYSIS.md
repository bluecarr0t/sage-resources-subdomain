# 10 yr PF Parser vs Excel Discrepancy Analysis

## Observed Mismatch (25-175A-04)

| Metric | Excel "10 yr PF" | Web Page | Issue |
|--------|------------------|----------|-------|
| Year 1 Revenue | $4,957,267 (~$5M) | $0.37M | **~13x smaller** |
| Year 14 Revenue | $15,874,904 (~$15.9M) | $0.52M | **~30x smaller** |
| Total Units | 512 | 512 | ✓ Matches |
| Years | 14 | 14 | ✓ Matches |

## Root Causes

### 1. "Total Lodging Revenue" not matched

The parser looks for `joined.includes('total revenue')` to capture the total revenue row. The Excel sheet uses **"Total Lodging Revenue"** — the substring `"total revenue"` does not appear contiguously (there is "lodging" between them), so the row is never captured.

**Fix:** Also match `"total lodging revenue"` or use a regex like `/total\s+(?:lodging\s+)?revenue/i`.

### 2. Label column assumption

The parser uses `label = row[1] ?? row[0]`. In layouts where column A = label and column B = Year 1, `row[1]` is the first year value (a number), so the label becomes that number instead of "Total Lodging Revenue". The parser may be misidentifying which column holds the label.

### 3. Total Expense / NOI row matching

- **Total Expense:** Parser requires `joined.includes('total expense') && joined.includes('reserve')` — both in the same row. Some sheets use "Total Expenses" or "Total Operating Expenses" without "reserve" on the same row.
- **NOI:** Parser looks for `joined.includes('net operating income')` or `labelLower === 'noi'`. This is usually correct.

### 4. Year column range

The fallback for plain numeric year headers uses `v >= 1 && v <= 10`, so Years 11–14 are ignored. The regex for "Year 11" etc. should work, but the fallback needs to support up to 20+ years.

### 5. Possible fallback to wrong data

If "Total Lodging Revenue" is never matched, `yearlyTotals` stays empty and no valuation is created — unless data comes from another sheet (e.g. "Monthly PF", "Total Proj") or a different layout. The displayed values may be from a single unit type’s revenue (e.g. one lodging category) rather than the full total.

## Excel Structure (from 25-175A-04)

- **Lodging types:** RV Pull-thru transient, RV Back-in transient, Airstreams, Treehouse, RV Back-in Site-Monthly
- **Per-type rows:** Units, ADR, Occupancy, Site Nights, Revenue
- **Total row:** "Total Lodging Revenue" (row 37) — sum of all lodging revenues
- **Years:** 1–14 (columns may skip 8–9 in display)
- **Expense section:** Below revenue, with Total Expense, NOI, etc.

## Recommended Parser Changes

1. Match "Total Lodging Revenue" for total revenue capture.
2. Prefer `row[0]` for label when it is a non-numeric string.
3. Relax Total Expense matching (e.g. allow "total expense" without "reserve").
4. Extend year fallback range to 1–20.
5. Add a fallback: if no "Total Revenue" row is found, sum revenue from parsed unit types to derive total lodging revenue.
