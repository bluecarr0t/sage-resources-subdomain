# Rate Category Column Migration Guide

This guide explains how to add the `rate_category` column to the `sage-glamping-data` table and populate it with rate categories.

## Overview

The `rate_category` column stores one of five rate categories for each property:
- `≤$149`
- `$150-$249`
- `$250-$399`
- `$400-$549`
- `$550+`

This allows for efficient filtering at the database level instead of calculating categories on the fly.

## Steps

### 1. Add the Column

Run the SQL migration script in your Supabase SQL Editor:

```sql
-- Run scripts/add-rate-category-column.sql
```

Or manually execute:

```sql
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS rate_category TEXT;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_rate_category 
ON "sage-glamping-data" (rate_category) 
WHERE rate_category IS NOT NULL;
```

### 2. Populate the Column

Run the TypeScript script to calculate and populate rate categories for all properties:

```bash
npx tsx scripts/populate-rate-category.ts
```

This script will:
1. Fetch all records from `sage-glamping-data`
2. Group records by `property_name`
3. Calculate the average rate for each property using `avg__rate__next_12_months_`
4. Assign the appropriate rate category to all records for each property
5. Display a summary of the category distribution

### 3. Verify the Results

Check that the column was populated correctly:

```sql
SELECT 
  rate_category,
  COUNT(*) as count
FROM "sage-glamping-data"
WHERE rate_category IS NOT NULL
GROUP BY rate_category
ORDER BY rate_category;
```

## How It Works

### Rate Category Calculation

For each property:
1. All records with the same `property_name` are grouped together
2. The average of all `avg__rate__next_12_months_` values is calculated
3. The average rate is categorized into one of the 5 categories
4. All records for that property are updated with the same category

### Filtering

The map component now filters by `rate_category` at the database level:

```typescript
if (filterRateRange.length > 0) {
  query = query.in('rate_category', filterRateRange);
}
```

This is more efficient than calculating categories on the fly for each property.

## Backward Compatibility

The code includes a fallback mechanism: if `rate_category` is not set in the database, it will calculate the category from the min/max rates. This ensures the feature works even if the column hasn't been populated yet.

## Troubleshooting

### Column Already Exists

If you see an error that the column already exists, that's fine - the migration is idempotent and safe to run multiple times.

### No Records Updated

If the population script shows 0 records updated:
1. Check that `avg__rate__next_12_months_` has valid numeric values
2. Verify that `property_name` is not null for records
3. Check Supabase connection and credentials

### Incorrect Categories

If categories seem incorrect:
1. Verify the `avg__rate__next_12_months_` values are correct
2. Re-run the population script to recalculate categories
3. Check for any data type issues (rates should be NUMERIC)

## Maintenance

If you update rate data in the database, you may want to recalculate categories:

```bash
# Re-run the population script
npx tsx scripts/populate-rate-category.ts
```

This will update all rate categories based on the current data.

