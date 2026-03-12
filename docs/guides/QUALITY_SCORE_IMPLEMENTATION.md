# Quality Score Implementation

**Date:** December 7, 2025

## Overview

A quality score system has been added to the `sage-glamping-data` table to assess data completeness and accuracy for each property. Scores range from 1-100, with higher scores indicating more complete and accurate data.

## Database Schema

### New Column

- **Column Name:** `quality_score`
- **Type:** INTEGER
- **Range:** 1-100
- **Nullable:** Yes (initially null)
- **Indexed:** Yes (for fast filtering/sorting)

## Scoring Algorithm

The quality score is calculated based on data completeness and accuracy, with weighted scoring for critical fields and penalties for invalid data.

### Scoring Breakdown (100 points total)

#### A. Core Identity Fields (25 points)
- Property Name: 10 points (required)
- Slug: 5 points (required for URL generation)
- Property Type: 5 points
- Unit Type: 5 points

#### B. Location Data (30 points)
- City: 5 points
- State: 5 points (must be valid 2-letter code)
- Country: 5 points
- Full Address: 8 points
- Valid Coordinates (lat/lon): 7 points

#### C. Contact & Information (20 points)
- Website URL: 8 points (must be valid format)
- Description: 7 points (graded by length: 100+ chars = full, 50-99 = partial, <50 = minimal)
- Phone Number: 5 points (from Google or direct)

#### D. Property Details (15 points)
- Number of Units: 3 points
- Year Opened: 2 points
- Operating Season: 3 points
- Minimum Nights: 2 points
- Getting There: 2 points
- Site Name: 3 points

#### E. Google Places Data Enhancement (10 points)
- Google Rating: 3 points
- Google Business Status: 2 points (OPERATIONAL gets points)
- Google Photos: 2 points (has photos array)
- Google Opening Hours: 1 point
- Google Description: 1 point
- Google Phone Number: 1 point

### Accuracy Penalties

The following issues reduce the score:

- Invalid coordinates: -3 points
- Invalid URL format: -2 points
- Invalid state code: -2 points
- Coordinates outside USA/Canada bounds: -2 points
- Placeholder text ("Not available", "Unavailable"): -1 point per field
- Invalid ZIP code format: -1 point

### Final Score Calculation

```
Base Score = Sum of all field points
Accuracy Adjustments = Apply penalties for invalid data
Final Score = max(1, min(100, Base Score - Penalties))
```

## Usage

### Step 1: Add Column to Database

Run the SQL migration script:

```sql
-- Run in Supabase SQL Editor
\i scripts/add-quality-score-column.sql
```

Or manually run:

```sql
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS quality_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_quality_score 
ON "sage-glamping-data" (quality_score) 
WHERE quality_score IS NOT NULL;
```

### Step 2: Calculate Quality Scores

Run the calculation script:

```bash
# Calculate scores for all properties
npx tsx scripts/calculate-quality-scores.ts

# Calculate scores only for properties without scores
npx tsx scripts/calculate-quality-scores.ts --skip-existing

# Recalculate all scores (overwrite existing)
npx tsx scripts/calculate-quality-scores.ts --update-all
```

### Step 3: Query by Quality Score

After scores are calculated, you can query properties by quality:

```sql
-- Get properties with high quality scores (80+)
SELECT property_name, city, state, quality_score
FROM "sage-glamping-data"
WHERE quality_score >= 80
ORDER BY quality_score DESC;

-- Get properties with low quality scores (need improvement)
SELECT property_name, city, state, quality_score
FROM "sage-glamping-data"
WHERE quality_score < 50
ORDER BY quality_score ASC;

-- Average quality score
SELECT AVG(quality_score) as avg_quality_score
FROM "sage-glamping-data"
WHERE quality_score IS NOT NULL;
```

## Score Interpretation

| Score Range | Quality Level | Description |
|-------------|---------------|-------------|
| 81-100 | Excellent | Complete data with high accuracy |
| 61-80 | Very Good | Most fields populated, good accuracy |
| 41-60 | Good | Moderate completeness, some gaps |
| 21-40 | Fair | Significant data gaps or accuracy issues |
| 1-20 | Poor | Minimal data or major accuracy problems |

## Files Created

1. **`scripts/add-quality-score-column.sql`** - Database migration script
2. **`scripts/calculate-quality-scores.ts`** - Calculation script with algorithm
3. **`lib/types/sage.ts`** - Updated type definition (added `quality_score` field)

## Algorithm Details

### Validation Functions

The script includes validation functions for:
- State codes (validates US/Canadian province codes)
- URLs (checks format and placeholder text)
- ZIP codes (validates format based on country)
- Coordinates (validates ranges and USA/Canada bounds)
- Placeholder text detection

### Batch Processing

- Processes properties in batches of 1000 for fetching
- Updates database in batches of 100 for efficiency
- Provides progress updates during processing

### Statistics Reporting

The script provides:
- Total properties processed
- Average, median, min, max scores
- Score distribution by ranges
- Sample high/low scoring properties

## Example Output

```
📊 QUALITY SCORE STATISTICS

Total Properties: 567
Average Score: 58.3/100
Median Score: 60/100
Min Score: 15/100
Max Score: 95/100

Score Distribution:
  1-20 (Poor)             23 (  4.1%) ████
  21-40 (Fair)            45 (  7.9%) ████████
  41-60 (Good)           189 ( 33.3%) ████████████████████████████
  61-80 (Very Good)      234 ( 41.3%) ████████████████████████████████████████
  81-100 (Excellent)      76 ( 13.4%) ██████████████
```

## Maintenance

### Recalculating Scores

Scores should be recalculated when:
- New properties are added
- Existing property data is updated
- Data quality improvements are made

Run the calculation script with `--update-all` to recalculate all scores:

```bash
npx tsx scripts/calculate-quality-scores.ts --update-all
```

### Incremental Updates

To only calculate scores for new properties:

```bash
npx tsx scripts/calculate-quality-scores.ts --skip-existing
```

## Integration

The quality score can be used for:
- **Data Quality Monitoring:** Track overall data quality trends
- **Prioritization:** Focus improvement efforts on low-scoring properties
- **Filtering:** Display only high-quality properties to users
- **Reporting:** Generate data quality reports
- **Validation:** Ensure minimum quality thresholds

---

**Implementation Date:** December 7, 2025  
**Scripts:** `scripts/add-quality-score-column.sql`, `scripts/calculate-quality-scores.ts`
