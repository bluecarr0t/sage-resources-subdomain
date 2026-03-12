# New Columns Added to all_roverpass_data

Columns added beyond the base `all_glamping_properties` schema.

---

## RoverPass Core (original)

| Column | Type | Source | Description |
|--------|------|--------|-------------|
| `roverpass_campground_id` | bigint | Site Data | Campground/property ID for grouping |
| `roverpass_occupancy_rate` | numeric | Occupancy Data | Occupancy rate (latest year) |
| `roverpass_occupancy_year` | numeric | Occupancy Data | Year of occupancy data |
| `amenities_raw` | text | Campground Data | Original amenities string |
| `activities_raw` | text | Campground Data | Original activities string |
| `lifestyle_raw` | text | Campground Data | Original lifestyle string |

---

## Lifestyle (from lifestyle_raw)

| Column | Type | Source | Description |
|--------|------|--------|-------------|
| `extended_stay` | text | lifestyle_raw | Extended Stay |
| `family_friendly` | text | lifestyle_raw | Family Friendly |
| `remote_work_friendly` | text | lifestyle_raw | Remote Work Friendly |

---

## Amenities (from amenities_raw)

| Column | Type | Source | Description |
|--------|------|--------|-------------|
| `fitness_room` | text | amenities_raw | Fitness Room |
| `propane_refilling_station` | text | amenities_raw | Propane Refilling Station |

---

## Activities (from activities_raw)

| Column | Type | Source | Description |
|--------|------|--------|-------------|
| `hunting` | text | activities_raw | Hunting |
| `golf` | text | activities_raw | Golf |
| `backpacking` | text | activities_raw | Backpacking |
| `historic_sightseeing` | text | activities_raw | Historic Sightseeing |
| `scenic_drives` | text | activities_raw | Scenic Drives |
| `stargazing` | text | activities_raw | Stargazing |

---

## Summary

| Category | Columns |
|----------|---------|
| RoverPass Core | 6 |
| Lifestyle | 3 |
| Amenities | 2 |
| Activities | 6 |
| **Total** | **17** |

---

## Migration Scripts

- **Add lifestyle + amenity + activity columns (all 11):** `scripts/add-roverpass-lifestyle-amenity-columns.sql`
- **Add activity columns only (6):** `scripts/add-roverpass-activity-columns.sql`
