# RoverPass activities_raw – Mapped vs Unmapped

## Currently Mapped (11 activities)

| RoverPass Activity | Column | Count |
|--------------------|--------|-------|
| Fishing | `fishing` | 270 |
| Hiking | `hiking` | 206 |
| Wildlife Viewing | `wildlife_watching` | 201 |
| Biking | `biking` | 187 |
| Swimming Outdoors | `swimming` | 175 |
| Boating | `boating` | 142 |
| Kayaking | `canoeing_kayaking` | 128 |
| Kayaking & Canoeing | `canoeing_kayaking` | 127 |
| Canoeing | `canoeing_kayaking` | 112 |
| Off-Roading/ATV | `off_roading_ohv` | 94 |
| Horseback Riding | `horseback_riding` | 52 |

---

## Unmapped – Can Map to Existing Columns

| RoverPass Activity | Count | Map To | Notes |
|--------------------|-------|--------|-------|
| Surfing | 7 | `surfing` | Column exists, not in map |
| Rock Climbing | 28 | `climbing` | |
| Bouldering | 13 | `climbing` | |
| Snow Sports | 27 | `snow_sports` | |
| Stand-Up Paddleboards | 45 | `paddling` | |
| White-Water Rafting | 12 | `whitewater_paddling` | |
| Whitewater Rafting & Kayaking | 12 | `whitewater_paddling` | |
| Swimming Indoors | 15 | `swimming` | |
| Kite-Boarding | 6 | `wind_sports` | |

---

## Mapped (added as new columns)

| RoverPass Activity | Column | Count |
|--------------------|--------|-------|
| Stargazing | `stargazing` | 178 |
| Scenic Drives | `scenic_drives` | 157 |
| Historic Sightseeing | `historic_sightseeing` | 124 |
| Backpacking | `backpacking` | 105 |
| Hunting | `hunting` | 81 |
| Golf | `golf` | 75 |

---

## Unmapped – Lower Priority (Optional)

| RoverPass Activity | Count | Notes |
|--------------------|-------|-------|
| Basketball | 72 | Court sports |
| Volleyball | 66 | Court sports |
| Beer/Wine Tasting | 49 | Could map to `alcohol_available` |
| Jet Skiing | 42 | Water sports |
| Waterskiing | 38 | Water sports |
| Tubing | 37 | Water sports |
| Mini Golf | 32 | |
| Tennis | 26 | |
| Wakeboarding | 23 | |
| Badminton | 18 | |
| Table Tennis | 17 | |
| Shuffleboard | 16 | |
| Caving/Spelunking | 13 | Could add `caving` |
| Splash Pad | 7 | |
| Scuba Diving | 7 | |
| Snorkeling | 7 | |

---

## Summary

**Quick wins (add to ACTIVITY_MAP, no new columns):**
- Surfing → `surfing`
- Rock Climbing, Bouldering → `climbing`
- Snow Sports → `snow_sports`
- Stand-Up Paddleboards → `paddling`
- White-Water Rafting, Whitewater Rafting & Kayaking → `whitewater_paddling`
- Swimming Indoors → `swimming`
- Kite-Boarding → `wind_sports`

**Recommend adding as new columns (top 6):**
1. `stargazing` (178)
2. `scenic_drives` (157)
3. `historic_sightseeing` (124)
4. `backpacking` (105)
5. `hunting` (81)
6. `golf` (75)
