# Comparables Test Fixtures

Add real XLSX feasibility study files here to validate extraction against the comparables page.

## Adding fixtures

1. Copy an XLSX file from your Supabase storage or local uploads
2. Name it by study ID, e.g. `25-175A-04.xlsx`, `25-138B-03.xlsx`
3. Run the comparison script or tests

## Running the comparison script

```bash
# Compare local XLSX against stored page data (requires .env.local with Supabase keys)
npx tsx scripts/compare-xlsx-to-page.ts 25-175A-04 __tests__/fixtures/25-175A-04.xlsx

# Or download from Supabase storage and compare
npx tsx scripts/compare-xlsx-to-page.ts 25-175A-04 --from-storage
```

## Running tests

```bash
npm test -- __tests__/comparables-extraction.test.ts
```

Tests will parse any `.xlsx` files in this directory and validate structure.

For **2023-style** workbooks (Best Comps only), `comparables-extraction.test.ts` also runs an integration case when `local_data/past_reports/2023/23-6304A-12 Robbinsville, NC RV FS.xlsx` exists (gitignored).
