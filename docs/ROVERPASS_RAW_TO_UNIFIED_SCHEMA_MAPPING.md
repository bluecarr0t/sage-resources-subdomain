# RoverPass Raw Columns → Unified Schema Mapping Review

Review of `amenities_raw`, `activities_raw`, and `lifestyle_raw` in `all_roverpass_data_new` and what else can be mapped to `property_`, `setting_`, and `activities_` columns.

---

## 1. amenities_raw → property_* and other columns

### Currently mapped (via combine script → old schema → migration)

| RoverPass Amenity | Unified Column | Notes |
|------------------|----------------|-------|
| Laundry Facilities | `property_laundry` | ✓ |
| Playground | `property_playground` | ✓ |
| Pool | `property_pool` | ✓ |
| Food On Site | `property_food_on_site` | ✓ |
| Restaurant | `property_restaurant` | ✓ |
| Dog Park | `property_dog_park` | ✓ |
| Clubhouse | `property_clubhouse` | ✓ |
| Alcohol Available | `property_alcohol_available` | ✓ |
| Golf Cart Rental | `property_golf_cart_rental` | ✓ |
| Waterpark | `property_waterpark` | ✓ |
| General Store | `property_general_store` | ✓ |
| Waterfront | `property_waterfront` | ✓ |
| Fitness Room | `property_fitness_room` | ✓ |
| Propane Refilling Station | `property_propane_refilling_station` | ✓ |

### Unmapped – can map to existing columns

| RoverPass Amenity | Occurrences | Map To | Notes |
|-------------------|-------------|--------|-------|
| Back-in RV Sites | 356 | `rv_parking` | Append or set; may need to combine with Pull-Thru |
| Pull-Thru RV Sites | 293 | `rv_parking` | Same as above |
| RV Hookup | 361 | `rv_water_hookup` or `rv_electrical_hook_up` | Generic hookup |
| Big Rig Friendly | 267 | `rv_vehicle_length` | Set to "Yes" or descriptive text |
| Slide Outs | 245 | `rv_accommodates_slideout` | ✓ |
| Gravel Roads | 239 | `rv_surface_type` | Or append to existing |
| Paved Roads | 117 | `rv_surface_type` | Or append to existing |
| Dirt Roads | 76 | `rv_surface_type` | Or append to existing |
| ADA Accessible | 57 | `unit_ada_accessibility` | ✓ |

### Mapped (added in add-roverpass-property-columns.sql)

| RoverPass Amenity | Column | Occurrences |
|-------------------|--------|-------------|
| Gasoline Nearby | `property_gasoline_nearby` | 213 |

### Unmapped – no matching column

| RoverPass Amenity | Occurrences | Notes |
| RV Sanitation | 62 | Overlaps with sewer/dump |
| Hike / Bike Campsites | 57 | Would need new column |
| Trek-in > 1.5m | 7 | Hike-in distance |

---

## 2. activities_raw → activities_* columns

### Currently mapped (via combine script)

| RoverPass Activity | Unified Column | Count |
|--------------------|----------------|-------|
| Fishing | `activities_fishing` | 270 |
| Hiking | `activities_hiking` | 206 |
| Wildlife Viewing | `activities_wildlife_watching` | 201 |
| Biking | `activities_biking` | 187 |
| Swimming Outdoors | `activities_swimming` | 175 |
| Boating | `activities_boating` | 142 |
| Kayaking, Canoeing, Kayaking & Canoeing | `activities_canoeing_kayaking` | 367 |
| Off-Roading/ATV | `activities_off_roading_ohv` | 94 |
| Horseback Riding | `activities_horseback_riding` | 52 |
| Hunting | `activities_hunting` | 81 |
| Golf | `activities_golf` | 75 |
| Backpacking | `activities_backpacking` | 105 |
| Historic Sightseeing | `activities_historic_sightseeing` | 124 |
| Scenic Drives | `activities_scenic_drives` | 157 |
| Stargazing | `activities_stargazing` | 178 |

### Unmapped – can map to existing activities_* columns (quick wins)

| RoverPass Activity | Count | Map To | Notes |
|--------------------|-------|--------|-------|
| Surfing | 7 | `activities_surfing` | Column exists |
| Rock Climbing | 28 | `activities_climbing` | ✓ |
| Bouldering | 13 | `activities_climbing` | ✓ |
| Snow Sports | 27 | `activities_snow_sports` | ✓ |
| Stand-Up Paddleboards | 45 | `activities_paddling` | ✓ |
| White-Water Rafting | 12 | `activities_whitewater_paddling` | ✓ |
| Whitewater Rafting & Kayaking | 12 | `activities_whitewater_paddling` | ✓ |
| Swimming Indoors | 15 | `activities_swimming` | ✓ |
| Kite-Boarding | 6 | `activities_wind_sports` | ✓ |

### Unmapped – could map to property_* or other columns

| RoverPass Activity | Count | Map To | Notes |
|--------------------|-------|--------|-------|
| Beer/Wine Tasting | 49 | `property_alcohol_available` | Indicates alcohol on site |

### Mapped (added in add-roverpass-property-columns.sql)

| RoverPass Activity | Column | Count |
|--------------------|--------|-------|
| Basketball | `property_basketball` | 72 |
| Volleyball | `property_volleyball` | 66 |
| Jet Skiing | `property_jet_skiing` | 42 |
| Tennis | `property_tennis` | 26 |

### Unmapped – activities with no matching column

| RoverPass Activity | Count | Notes |
|--------------------|-------|-------|
| Waterskiing | 38 | Water sports |
| Tubing | 37 | Water sports |
| Mini Golf | 32 | |
| Wakeboarding | 23 | |
| Badminton | 18 | |
| Table Tennis | 17 | |
| Shuffleboard | 16 | |
| Caving/Spelunking | 13 | → `setting_cave` (see below) |
| Splash Pad | 7 | |
| Scuba Diving | 7 | |
| Snorkeling | 7 | |

---

## 3. activities_raw / amenities_raw → setting_* columns

RoverPass does **not** have a dedicated "setting" or "environment" field. A few activities can infer setting:

| RoverPass Value | Count | Map To | Notes |
|-----------------|-------|--------|-------|
| Caving/Spelunking | 13 | `setting_cave` | Only clear setting inference from activities |

Other setting_ columns (ranch, beach, coastal, forest, lake, etc.) are typically from manual data entry or other sources. RoverPass lifestyle/activities do not directly provide these.

---

## 4. lifestyle_raw → property_* columns

### Currently mapped

| RoverPass Lifestyle | Unified Column | Count |
|---------------------|----------------|-------|
| Extended Stay | `property_extended_stay` | 228 |
| Family Friendly | `property_family_friendly` | 311 |
| Remote Work Friendly | `property_remote_work_friendly` | 152 |

### Mapped (added in add-roverpass-property-columns.sql)

| RoverPass Lifestyle | Column | Count |
|---------------------|--------|-------|
| 55-plus | `property_age_restricted_55_plus` | 90 |
| Rentals | `property_has_rentals` | 79 |
| LGBTIQ Friendly | `property_lgbtiq_friendly` | 78 |
| Mobile Home Community | `property_mobile_home_community` | 15 |

### Unmapped – would need new property_* columns

| RoverPass Lifestyle | Count | Suggested Column | Notes |
|---------------------|-------|------------------|-------|
| Military | 122 | `property_military_friendly` | Military discounts/friendly |
| RVing | 282 | — | Could inform `unit_type` or filter; not a property amenity |
| Tent Camping | 184 | — | Same as above |
| Big Rig Friendly | 196 | — | Already mappable to `rv_vehicle_length` from amenities |
| Pet Friendly | 341 | — | Redundant with `unit_pets` from amenities |
| Members Only | 4 | `property_members_only` | Optional |
| Nude Recreation | 3 | `property_nude_recreation` | Optional |

---

## 5. Summary: Recommended additions to parsing

### High impact, no schema change (add to AMENITY_MAP / ACTIVITY_MAP)

**amenities_raw → rv_* / unit_*:**
- `Back-in RV Sites`, `Pull-Thru RV Sites` → `rv_parking` (or combine into descriptive text)
- `Big Rig Friendly` → `rv_vehicle_length`
- `Slide Outs` → `rv_accommodates_slideout`
- `Gravel Roads`, `Paved Roads`, `Dirt Roads` → `rv_surface_type`
- `ADA Accessible` → `unit_ada_accessibility`

**activities_raw → activities_*:**
- `Surfing` → `activities_surfing`
- `Rock Climbing`, `Bouldering` → `activities_climbing`
- `Snow Sports` → `activities_snow_sports`
- `Stand-Up Paddleboards` → `activities_paddling`
- `White-Water Rafting`, `Whitewater Rafting & Kayaking` → `activities_whitewater_paddling`
- `Swimming Indoors` → `activities_swimming`
- `Kite-Boarding` → `activities_wind_sports`
- `Beer/Wine Tasting` → `property_alcohol_available`

**activities_raw → setting_*:**
- `Caving/Spelunking` → `setting_cave`

### Schema change required (new property_* columns)

If you want to capture more lifestyle values:
- `property_military_friendly` (122)
- `property_age_restricted_55_plus` (90)
- `property_has_rentals` (79)
- `property_lgbtiq_friendly` (78)

---

## 6. Implementation options

1. **Backfill script** – Extend `scripts/backfill-roverpass-lifestyle-amenity-columns.ts` to parse the additional mappings above and update `all_roverpass_data_new` (or run on raw and then migrate).

2. **Combine script** – Update `scripts/combine-roverpass-and-upload.ts` AMENITY_MAP and ACTIVITY_MAP so future imports populate the new mappings.

3. **SQL backfill** – One-time migration that parses `amenities_raw`, `activities_raw`, `lifestyle_raw` with `LIKE` or regex and updates the target columns.

---

## 7. Top 10 Recommended New Columns (if schema changes allowed)

If you were to add new columns to capture unmapped RoverPass data, these would be the top 10 by impact and rationale:

| Rank | Column | Source | Count | Rationale |
|------|--------|--------|-------|-----------|
| 1 | `property_military_friendly` | lifestyle_raw | 122 | Military discounts/friendly; strong niche segment with dedicated travelers and VA benefits. |
| 2 | `property_age_restricted_55_plus` | lifestyle_raw | 90 | 55+ communities; important for age-restricted properties and senior travelers. |
| 3 | `property_has_rentals` | lifestyle_raw | 79 | Indicates cabins/units for rent on site; differentiates from tent-only and drives higher revenue. |
| 4 | `property_lgbtiq_friendly` | lifestyle_raw | 78 | Inclusive travel filter; aligns with diversity-focused travelers and brand values. |
| 5 | `property_gasoline_nearby` | amenities_raw | 213 | Gasoline Nearby has no column; critical for RV travelers planning fuel stops. |
| 6 | `property_basketball` | activities_raw | 72 | Court sports; common family/group activity, complements playground. |
| 7 | `property_volleyball` | activities_raw | 66 | Court sports; popular at campgrounds and group settings. |
| 8 | `property_jet_skiing` | activities_raw | 42 | Water sports; differentiates waterfront properties. |
| 9 | `property_mobile_home_community` | lifestyle_raw | 15 | Mobile home/long-term community; distinct property type. |
| 10 | `property_tennis` | activities_raw | 26 | Court sports; appeals to active travelers. |

**Note:** `property_family_friendly`, `property_extended_stay`, `property_remote_work_friendly`, `unit_ada_accessibility`, and `property_pickball_courts` already exist and are among the highest-value columns.
