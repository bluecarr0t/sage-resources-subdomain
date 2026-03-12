# RoverPass amenities_raw – Unmapped to Column

Amenities that appear in RoverPass `amenities_raw` but are **not** mapped to any `all_roverpass_data` column in the combine script.

| RoverPass Amenity | Occurrences | Suggested Mapping | Notes |
|-------------------|-------------|-------------------|-------|
| RV Hookup | 361 | `electrical_hook_up` or `rv_parking` | Generic RV hookup (power/water/sewer) |
| Back-in RV Sites | 356 | `rv_parking` | Back-in parking type |
| Pull-Thru RV Sites | 293 | `rv_parking` | Pull-through parking type |
| Big Rig Friendly | 267 | `rv_vehicle_length` | Large RV support |
| Dump Station | 263 | `sewer_hook_up` | Mapped |
| Slide Outs | 245 | `rv_accommodates_slideout` | Slide-out support |
| Gravel Roads | 239 | `rv_surface_type` | Surface type |
| Gasoline Nearby | 213 | — | No column |
| Paved Roads | 117 | `rv_surface_type` | Surface type |
| Propane Refilling Station | 89 | `propane_refilling_station` | Mapped (new column) |
| Dirt Roads | 76 | `rv_surface_type` | Surface type |
| RV Sanitation | 62 | — | No column; dump station related |
| Hike / Bike Campsites | 57 | — | No column |
| ADA Accessible | 57 | — | No column |
| Fitness Room | 36 | `fitness_room` | Mapped (new column) |
| Trek-in > 1.5m | 7 | — | No column; hike-in distance |

## Columns that exist but are not used in the mapping

- `rv_parking` – could map Back-in RV Sites, Pull-Thru RV Sites, RV Hookup
- `rv_accommodates_slideout` – could map Slide Outs
- `rv_vehicle_length` – could map Big Rig Friendly
- `rv_surface_type` – could map Gravel Roads, Paved Roads, Dirt Roads

## Amenities with no matching column

- Dump Station  
- Gasoline Nearby  
- Propane Refilling Station  
- RV Sanitation  
- Hike / Bike Campsites  
- ADA Accessible  
- Fitness Room  
- Trek-in > 1.5m  

These would need new columns if you want to store them.
