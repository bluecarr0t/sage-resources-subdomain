# RoverPass Data Analysis & Integration Plan

## Executive Summary

This document analyzes three RoverPass CSV files and recommends how to combine them into a single CSV for upload to `all_roverpass_data`. RoverPass data is stored in a **separate table** (`all_roverpass_data`), a duplicate of `all_glamping_properties` with RoverPass-specific columns. The table uses **one row per site/unit** (not per property), so each Site Data record becomes one `all_roverpass_data` row.

---

## 1. Source File Analysis

### Campground Data (662 rows)
| Column | Type | Description |
|--------|------|-------------|
| `id` | int | Primary key – RoverPass campground ID (property-level) |
| `city_name` | text | City |
| `state_name` | text | State/province |
| `zip` | text | ZIP/postal code |
| `amenities` | text | Comma-separated list (e.g., "WiFi, Laundry, Pet Friendly") |
| `activities` | text | Comma-separated list (e.g., "Hiking, Fishing, Boating") |
| `lifestyle` | text | Comma-separated list (e.g., "Family Friendly, Pet Friendly") |

**Critical gap:** No `property_name` – campgrounds are identified only by ID and location. Use synthetic name (no lookup at this time).

### Occupancy Data (436 rows)
| Column | Type | Description |
|--------|------|-------------|
| `campground_id` | int | FK → Campground Data `id` |
| `year` | int | 2023, 2024, or 2025 |
| `booked_nights` | int | Nights booked |
| `bookable_nights` | int | Total bookable nights |

- 424 unique campgrounds have occupancy data
- Occupancy will be calculated separately; do not add `roverpass_booked_nights` or `roverpass_bookable_nights` to the table

### Site Data (28,567 rows)
| Column | Type | Description |
|--------|------|-------------|
| `id` | int | Site ID – **is** `all_roverpass_data.id` (use as primary key on insert) |
| `campground_id` | int | FK → Campground Data `id` |
| `site_type` | text | rv_site, tent, cabin, glamping, tiny_home, etc. |
| `weekly` | numeric | Weekly rate |
| `mon`–`sun` | numeric | Daily rates by day of week |

**Site type distribution:** rv_site (20,442), tent (3,153), cabin (702), glamping (72), tiny_home (58), plus storage, overnight_camping, rental, boat_slip, etc.

- 473 unique campgrounds have site data
- **One row per site** = one row in `all_roverpass_data`

### Join Key Overlap
- **663** campgrounds in Campground Data
- **423** have both occupancy and site data
- **189** have neither occupancy nor site data

---

## 2. Recommended Approach to Combine

### Strategy: Site-Centric (One Record per Site/Unit)

`all_roverpass_data` stores one row per site/unit (same design as `all_glamping_properties`). Therefore:

1. **Base:** Site Data (one row per site → one row in output)
2. **LEFT JOIN Campground Data** on `site.campground_id` = `campground.id` for location, amenities, activities, lifestyle
3. **Property identity:** Use synthetic `property_name` = `"Campground {campground_id} - {city_name}, {state_name}"` and `roverpass_campground_id` = `campground_id` (no lookup for actual property name at this time)
4. **ID mapping:** RoverPass Site Data `id` **is** `all_roverpass_data.id` (insert with explicit `id`)

### Per-Site Output Logic

| Output Field | Source | Logic |
|--------------|--------|-------|
| `id` | Site Data | RoverPass Site Data `id` – use as `all_roverpass_data.id` on insert |
| `property_name` | Campground Data | Synthetic: `"Campground {campground_id} - {city_name}, {state_name}"` |
| `roverpass_campground_id` | Site Data | `campground_id` (property-level identifier for grouping) |
| `unit_type` | Site Data | `site_type` (rv_site, tent, cabin, glamping, etc.) |
| `quantity_of_units` | — | 1 (each row is one unit) |
| `city`, `state`, `zip_code` | Campground Data | From joined campground |
| `avg_retail_daily_rate` | Site Data | `(mon + tue + wed + thu + fri + sat + sun) / 7` (where present) |
| `winter_weekday` / `winter_weekend` | Site Data | Use weekday avg (mon–thu) and weekend avg (fri–sun) as proxy |
| `spring_weekday` / `spring_weekend` | Site Data | Same proxy (mon–thu / fri–sun) |
| `summer_weekday` / `summer_weekend` | Site Data | Same proxy |
| `fall_weekday` / `fall_weekend` | Site Data | Same proxy |
| `weekly` | Site Data | Map to existing column if present, or derive |

### Occupancy

Pass the **Occupancy Data** CSV as the 3rd argument to the combine script to populate `roverpass_occupancy_rate` and `roverpass_occupancy_year`. The script uses the latest year per campground and calculates `rate = booked_nights / bookable_nights`. Do not add `roverpass_booked_nights` or `roverpass_bookable_nights` to the table.

---

## 3. Column Mapping: RoverPass → all_roverpass_data

### Direct Mappings (Existing Columns)

| RoverPass | all_roverpass_data |
|-----------|-------------------------|
| Site Data `id` | `id` |
| Site Data `campground_id` | `roverpass_campground_id` (new column) |
| Campground Data `city_name` | `city` |
| Campground Data `state_name` | `state` |
| Campground Data `zip` | `zip_code` |
| Site Data `site_type` | `unit_type` |

### Property Name

Synthetic only (no lookup): `"Campground {campground_id} - {city_name}, {state_name}"`

### Parsed Mappings (Amenities → Existing Columns)

Parse comma-separated `amenities` from Campground Data and map to existing boolean/text columns:

| RoverPass Amenity | all_roverpass_data Column |
|-------------------|-------------------------------|
| Community Restrooms, Toilet | `toilet` |
| Community Showers, Shower | `shower` |
| Water Hookups, Drinking Water | `water` |
| Trash Service | `trash` |
| BBQ/Grill, Fire Ring / Grill | `cooking_equipment` or `charcoal_grill` |
| Picnic Table, Picnic Area | `picnic_table` |
| WiFi | `wifi` |
| Laundry Facilities | `laundry` |
| Fire Pit, Community Fire Pit | `campfires` |
| Playground | `playground` |
| Hot Tub | `hot_tub_or_sauna` or `property_hot_tub` |
| Waterfront | `waterfront` |
| Pet Friendly, Pets Allowed | `pets` |
| Sewer Hookups | `sewer_hook_up` |
| 20 Amps, 30 Amps, 50 Amps | `electrical_hook_up` |
| Water Hookups | `water_hookup` |
| General Store | `general_store` |
| Clubhouse | `clubhouse` |
| Restaurant | `restaurant` |
| Cable Hookups | `cable` |

### Parsed Mappings (Activities → Existing Columns)

| RoverPass Activity | all_roverpass_data Column |
|--------------------|--------------------------------|
| Fishing | `fishing` |
| Hiking | `hiking` |
| Boating | `boating` |
| Swimming Outdoors | `swimming` |
| Biking | `biking` |
| Horseback Riding | `horseback_riding` |
| Kayaking, Canoeing, Kayaking & Canoeing | `canoeing_kayaking` |
| Off-Roading/ATV | `off_roading_ohv` |
| Wildlife Viewing | `wildlife_watching` |
| Stargazing | (no direct match – could add or skip) |
| Golf | (no direct match) |

### Defaults for RoverPass Imports

- `source` = `"RoverPass"`
- `discovery_source` = `"RoverPass"`
- `is_glamping_property` = `"No"` (unless site_type includes glamping/cabin/tiny_home)
- `is_closed` = `"No"`
- `country` = `"USA"` (or derive from state for Canada/Mexico)
- `research_status` = `"new"`
- `date_added` = today
- `date_updated` = today

---

## 4. Table: all_roverpass_data

RoverPass data is stored in a **separate table** `all_roverpass_data`, created as a duplicate of `all_glamping_properties` with RoverPass-specific columns built in. Run:

```bash
# Create the table (run in Supabase SQL Editor or psql)
psql -f scripts/create-all-roverpass-data-table.sql
```

The table includes all columns from `all_glamping_properties` plus:

### New Column Descriptions

| Column | Type | Purpose |
|--------|------|---------|
| `roverpass_campground_id` | bigint | RoverPass campground/property ID; groups sites by property; used in synthetic `property_name` |
| `roverpass_occupancy_rate` | numeric | Occupancy rate (calculated separately; not from booked/bookable) |
| `roverpass_occupancy_year` | numeric | Year of occupancy data (e.g. 2025) |
| `amenities_raw` | text | Original amenities string from Campground Data |
| `activities_raw` | text | Original activities string from Campground Data |
| `lifestyle_raw` | text | Original lifestyle string from Campground Data |
| `extended_stay` | text | From lifestyle (Extended Stay) |
| `family_friendly` | text | From lifestyle (Family Friendly) |
| `remote_work_friendly` | text | From lifestyle (Remote Work Friendly) |
| `fitness_room` | text | From amenities (Fitness Room) |
| `propane_refilling_station` | text | From amenities (Propane Refilling Station) |
| `hunting` | text | From activities (Hunting) |
| `golf` | text | From activities (Golf) |
| `backpacking` | text | From activities (Backpacking) |
| `historic_sightseeing` | text | From activities (Historic Sightseeing) |
| `scenic_drives` | text | From activities (Scenic Drives) |
| `stargazing` | text | From activities (Stargazing) |

**Not added:** `roverpass_site_id` – RoverPass Site Data `id` is used directly as `all_roverpass_data.id`. `roverpass_booked_nights`, `roverpass_bookable_nights` – occupancy will be calculated separately.

---

## 5. Implementation Options

### Option A: TypeScript Script (Recommended)

Create `scripts/combine-roverpass-and-upload.ts` that:

1. Reads Campground Data, Site Data, and optionally Occupancy Data CSVs
2. Uses **Site Data as base** (one output row per site)
3. LEFT JOINs Campground Data on `site.campground_id` = `campground.id`
4. Sets `id` = Site Data `id` (RoverPass site id becomes `all_roverpass_data.id`)
5. Sets `property_name` = `"Campground {campground_id} - {city_name}, {state_name}"`
6. Sets `roverpass_campground_id` = `campground_id`
7. Joins Occupancy Data (if provided): `roverpass_occupancy_rate` = booked_nights/bookable_nights, `roverpass_occupancy_year` = year (latest per campground)
8. Maps site rates (mon–sun) to seasonal rate columns
9. Parses amenities/activities into existing columns; stores raw in `roverpass_*_raw`
10. Outputs a single CSV matching `all_roverpass_data` schema
11. Uploads to `all_roverpass_data`

### Option B: Python/Excel Pre-Processing

Use pandas to merge Site Data with Campground Data (one row per site), then export CSV for upload.

### Option C: Database ETL

Load raw CSVs into staging tables, run SQL to merge (Site Data LEFT JOIN Campground Data), then insert into `all_roverpass_data`.

---

## 6. Data Quality Notes

1. **Property names:** Synthetic only – no lookup for actual property name at this time.
2. **Coordinates:** No lat/lon. Geocode from city + state + zip if needed.
3. **Seasonal rates:** Site Data has mon–sun only. Map to winter/spring/summer/fall using a simple heuristic (e.g. weekday = mon–thu avg, weekend = fri–sun avg).
4. **Glamping focus:** Most rows are RV/tent. Use `is_glamping_property = "No"` or filter to cabin/glamping/tiny_home only.
5. **Duplicate prevention:** RoverPass Site Data `id` is `all_roverpass_data.id`; use upsert on `id` to avoid re-importing the same site.

---

## 7. Summary

| Item | Recommendation |
|------|----------------|
| **Target table** | `all_roverpass_data` (separate table, duplicate of `all_glamping_properties` with RoverPass columns) |
| **Combine approach** | Site-centric: base = Site Data (one row per site), LEFT JOIN Campground Data |
| **Record granularity** | One row per site/unit (matches `all_glamping_properties` design) |
| **ID mapping** | RoverPass Site Data `id` **is** `all_roverpass_data.id` (no separate roverpass_site_id column) |
| **Property identity** | Synthetic `property_name` + `roverpass_campground_id`; no lookup |
| **RoverPass columns** | roverpass_campground_id, roverpass_occupancy_rate, roverpass_occupancy_year, amenities_raw, activities_raw, lifestyle_raw |
| **Occupancy** | Calculated separately; do not add roverpass_booked_nights or roverpass_bookable_nights |
| **Table creation** | Run `scripts/create-all-roverpass-data-table.sql` |
| **Implementation** | TypeScript script in `scripts/` that merges CSVs and uploads to `all_roverpass_data` |
