# CSV Upload to Supabase Guide

This guide explains how to upload a CSV file to the `sage-updated` table in Supabase.

## Quick Start

1. **Place your CSV file** in the project directory (e.g., `data/sage-updated.csv`)

2. **Run the upload script:**
   ```bash
   npx tsx scripts/upload-csv-to-supabase.ts <path-to-your-csv-file>
   ```

   Example:
   ```bash
   npx tsx scripts/upload-csv-to-supabase.ts data/sage-updated.csv
   ```

## Prerequisites

1. **Supabase credentials** must be set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`

2. **Table must exist** in Supabase. If it doesn't, the script will provide SQL to create it.

## Creating the Table

If the `sage-updated` table doesn't exist, the script will provide SQL instructions. You can also create it manually:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Run the SQL provided by the script, or use this template:

```sql
CREATE TABLE IF NOT EXISTS sage-updated (
  id BIGSERIAL PRIMARY KEY,
  -- Add your columns here based on your CSV
  -- Example:
  -- property_name TEXT,
  -- city TEXT,
  -- state TEXT,
  -- lat NUMERIC,
  -- lon NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional)
ALTER TABLE "sage-updated" ENABLE ROW LEVEL SECURITY;

-- Allow public read access (optional)
CREATE POLICY "Allow public read access" ON "sage-updated"
  FOR SELECT
  USING (true);
```

**Note:** Replace the column definitions with your actual CSV columns. The script will automatically sanitize column names (lowercase, replace special characters with underscores).

## CSV Format Requirements

- **First row** should contain column headers
- **Column names** will be automatically sanitized:
  - Converted to lowercase
  - Special characters replaced with underscores
  - Example: `Property Name` → `property_name`

## How It Works

1. **Parses CSV**: Reads and parses your CSV file
2. **Detects columns**: Uses the first row as column names
3. **Checks table**: Verifies the table exists in Supabase
4. **Uploads in batches**: Uploads data in batches of 1000 rows (Supabase best practice)
5. **Uses upsert**: Uses `upsert` to handle duplicates (based on `id` column)

## Troubleshooting

### "Table does not exist" Error
- Create the table in Supabase using the SQL provided by the script
- Make sure the table name matches exactly: `sage-updated`

### "Column does not exist" Error
- Check that your CSV column names match the table columns
- Column names are case-insensitive and special characters are replaced with underscores
- Example: CSV column `Property Name` → table column `property_name`

### "Permission denied" Error
- Make sure `SUPABASE_SECRET_KEY` is set correctly in `.env.local`
- The secret key is required for server-side operations

### Empty CSV
- Make sure your CSV file has at least one data row (in addition to the header row)
- Check that the file path is correct

## Example CSV Structure

```csv
property_name,city,state,lat,lon,address
"Sunset Campground","Denver","CO",39.7392,-104.9903,"123 Main St"
"Mountain View RV Park","Boulder","CO",40.0150,-105.2705,"456 Oak Ave"
```

## Next Steps

After uploading:
1. Verify data in Supabase Dashboard → Table Editor → `sage-updated`
2. Check Row Level Security policies if you need public access
3. Use the data in your application via the Supabase client

## Script Options

The script automatically:
- ✅ Sanitizes column names
- ✅ Converts empty strings to `null`
- ✅ Attempts to convert numeric strings to numbers
- ✅ Uploads in batches for performance
- ✅ Provides helpful error messages

