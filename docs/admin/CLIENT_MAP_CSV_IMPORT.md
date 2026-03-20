# Sage Outdoor Client Projects CSV → Past Reports / Client Map

## Source file

Typical name: `Sage Outdoor Client Projects - Website MAP - Internal Projects Map.csv`

## Columns (header row)

| Column        | Meaning |
|---------------|---------|
| **Job Number** | Study / job ID (e.g. `17-121A-03`). Placeholder `ARG` appears for multiple distinct projects — each gets a synthetic `study_id` in the DB (`ARG-<slug>-<ST>`). |
| **Property**   | Property or client-facing name. |
| **Location**   | Usually `"City, ST"` (header may be `Location ` with a trailing space). Multi-part values like `"…, Cabazon, CA"` are parsed with **state = last segment** and **city = segment before state** (see `lib/parse-csv-location.ts`). |
| **State**      | USPS state code (e.g. `AZ`). |
| **Resort Type**| Free text: site counts, RV/glamping/marina, proposed vs existing, etc. Drives `market_type` and parsed `total_sites`. |
| **Service**    | Drives `service`: Appraisal, Feasibility Study, Consulting, Market Study / Market Analysis, Glamping Revenue (stored as `revenue_projection`), combined strings, etc. |

## Values observed

- **Service**: Mostly `Appraisal`, `Feasibility Study`, `Consulting`, `Market Study`, glamping revenue–style lines (mapped to **Revenue Projection** / `revenue_projection`), and compounds like `Feasibility Study and Appraisal`.
- **Resort Type**: Phrases like `Proposed 97-Site RV Park`, `Existing ... Marina`, `Glamping Resort`, `Outdoor`, `Tiny Home`, `Micro Resort` — mapped to `rv`, `glamping`, `rv_glamping`, `marina`, or `outdoor_hospitality`.
- **Job Number quirks**: Duplicate IDs in the sheet (e.g. same job listed twice for different client names) receive `study_id` suffixes `__2`, `__3`, …
- **Junk rows**: Lines with `Value in column …` in the job column are skipped.

## Import command

From repo root (requires `.env.local` with Supabase service role and optional Google key for geocoding):

```bash
npx tsx scripts/populate-client-map-from-csv.ts --csv "/path/to/Sage Outdoor Client Projects - Website MAP - Internal Projects Map.csv"
```

Dry run:

```bash
npx tsx scripts/populate-client-map-from-csv.ts --dry-run --csv "/path/to/file.csv"
```

Rows that already qualify as **Past Reports** (DOCX/XLSX uploaded, unit mix, Dropbox link, or narrative) are **not** overwritten by this script so uploads are not clobbered.

**Coordinates:** The script tries Google Geocoding (`City, ST, USA`) first using **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** from `.env.local` (same key as the client map), with optional fallback to `GOOGLE_MAPS_API_KEY`. If Google fails (e.g. Geocoding API not enabled—`REQUEST_DENIED`), it falls back to **Nominatim** (~1s delay per row). If both fail, it uses the US state centroid (map clusters by state).

After import, you can still run coordinate backfill for rows that only have centroids:

```bash
npx tsx scripts/backfill-report-map-coordinates.ts
```

Target one job (e.g. pin shows state default but address says Salem):

```bash
npx tsx scripts/backfill-report-map-coordinates.ts --study-id 20-250A-05
```

## Troubleshooting: “Salem, OR” pin near Brothers, OR

Oregon’s **fallback centroid** in `lib/us-state-centers.ts` is near **Brothers**, not Salem. That is what gets stored when geocoding fails or when older imports only wrote state-level placeholders.

The **address line** in the map popup comes from `city` / `location` in the database; the **pin** comes from `latitude` / `longitude`. If those coordinates are still the OR default (or null), the UI shows an **approximate pin** warning until you run the backfill (or re-import non–past-report rows with a working Geocoding API key).
