# RoverPass lifestyle_raw – Recommended Columns

Lifestyle values from RoverPass and which are worth tracking as separate columns.

## Lifestyle values (by frequency)

| RoverPass Lifestyle | Count | Recommendation |
|---------------------|-------|-----------------|
| Pet Friendly | 341 | Already have `pets` (from amenities) – redundant |
| Family Friendly | 311 | **Add** – core filter for family vacations |
| RVing | 282 | **Add** – RV vs tent focus |
| Extended Stay | 228 | **Add** – long-term / monthly stays |
| Big Rig Friendly | 196 | Already have `rv_vehicle_length` – can map |
| Tent Camping | 184 | **Add** – tent vs RV focus |
| Remote Work Friendly | 152 | **Add** – digital nomads / work-from-camp |
| Military | 122 | **Add** – military discounts / friendly |
| 55-plus | 90 | **Add** – age-restricted communities |
| Rentals | 79 | **Add** – has rental units on site |
| LGBTIQ Friendly | 78 | **Add** – inclusive travel |
| Mobile Home Community | 15 | Optional |
| Members Only | 4 | Optional |
| Nude Recreation | 3 | Optional |

---

## Recommended columns to add

### High priority (strong search/filter value)

| Column | Type | Rationale |
|--------|------|-----------|
| `family_friendly` | text | 311 properties; common family vacation filter |
| `extended_stay` | text | 228 properties; long-term / monthly stays |
| `remote_work_friendly` | text | 152 properties; digital nomads, work-from-camp |
| `military_friendly` | text | 122 properties; military segment |
| `age_restricted_55_plus` | text | 90 properties; 55+ communities |

### Medium priority (differentiation)

| Column | Type | Rationale |
|--------|------|-----------|
| `lgbtiq_friendly` | text | 78 properties; inclusive travel |
| `has_rentals` | text | 79 properties; cabins/units for rent on site |
| `primary_accommodation` | text | RV vs tent focus (RVing 282, Tent Camping 184) |

### Optional

- `mobile_home_community` – 15 properties
- `members_only` – 4 properties
- `nude_recreation` – 3 properties

---

## Minimal set (if adding only a few)

1. **`family_friendly`** – most common and widely used filter
2. **`extended_stay`** – distinct use case (long-term stays)
3. **`remote_work_friendly`** – growing segment
4. **`military_friendly`** – niche but important
5. **`age_restricted_55_plus`** – important for 55+ communities

---

## SQL to add columns

```sql
ALTER TABLE public.all_roverpass_data
  ADD COLUMN IF NOT EXISTS family_friendly text NULL,
  ADD COLUMN IF NOT EXISTS extended_stay text NULL,
  ADD COLUMN IF NOT EXISTS remote_work_friendly text NULL,
  ADD COLUMN IF NOT EXISTS military_friendly text NULL,
  ADD COLUMN IF NOT EXISTS age_restricted_55_plus text NULL,
  ADD COLUMN IF NOT EXISTS lgbtiq_friendly text NULL,
  ADD COLUMN IF NOT EXISTS has_rentals text NULL;
```
