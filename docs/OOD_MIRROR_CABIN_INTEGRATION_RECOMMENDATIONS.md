# ÖÖD House Mirror Cabin Integration – Recommendations

## Summary

Analysis of `csv/ood-deals-13847150-271.csv` (ÖÖD House unit sales to glamping locations) against `all_glamping_properties`:

| Metric | Count |
|--------|-------|
| **Total ÖÖD deals (unique locations)** | 137 |
| **MATCHED** (existing properties) | 28 |
| **NO MATCH** (candidates for new records) | 109 |

### Match breakdown (fuzzy: address, city, state, zip)
- **City + state + zip**: 11
- **City + state**: 17
- **Exact address**: 0
- **Partial address**: 0

### 10 matched ÖÖD deal locations → 8 unique properties

| # | ÖÖD Deal Location | Matched Property | id | Match Type |
|---|-------------------|------------------|-----|------------|
| 1 | 757 Forest Hollow Dr, Fairbanks, AK 99712 | Borealis Basecamp | 9574 | city+state+zip |
| 2 | 9105 Thorpe Rd, Bozeman, MT 59718 | Heritage Ranch MT | 9612 | city+state+zip |
| 3 | 202 Prospect St, Nevada City, CA 95959 | Inn Town Campground | 10103 | city+state+zip |
| 4 | 132 Stewart Gap Rd, Asheville, NC 28804 | Hidden Flower Tiny Farm | 9994 | city+state+zip |
| 5 | Asheville, NC | Hidden Flower Tiny Farm | 9994 | city+state |
| 6 | 6080 Floyd Avenue, Cloverdale, OR 97112 | Two Capes Lookout | 10355 | city+state+zip |
| 7 | 201 Sam King Rd, Hendersonville, NC 28739 | Dupont Yurts | 9793 | city+state+zip |
| 8 | 500 Vista West Ranch Rd, Dripping Springs, TX 78620 | The Yurtopian | 9831 | city+state+zip |
| 9 | 500 Fifth Avenue, New York, NY 10110 | Collective Governors Island | 9509 | city+state |
| 10 | New York, NY | Collective Governors Island | 9509 | city+state |

**8 unique properties** (add new Mirror Cabin record for each):
1. Borealis Basecamp (id=9574) – Fairbanks, AK
2. Heritage Ranch MT (id=9612) – Bozeman, MT
3. Inn Town Campground (id=10103) – Nevada City, CA
4. Hidden Flower Tiny Farm (id=9994) – Asheville, NC (2 deal rows)
5. Two Capes Lookout (id=10355) – Cloverdale, OR
6. Dupont Yurts (id=9793) – Hendersonville, NC
7. The Yurtopian (id=9831) – Dripping Springs, TX
8. Collective Governors Island (id=9509) – New York, NY (2 deal rows)

---

## Approach 1: Add Mirror Cabin Records to Existing Properties

### Recommended implementation

For the **10 matched** ÖÖD deal locations (8 unique properties) listed above:

**Add a new record** for each matched property with `unit_type` = `"Mirror Cabin"` and `discovery_source` = `"ÖÖD House"`. Each record in `all_glamping_properties` represents a specific unit type. Many properties currently have only one record due to needing additional research; adding a Mirror Cabin record creates a separate row for that unit type.

1. **Insert new records**  
   For each matched property, insert a new row that copies the property’s location and identity fields, with:
   - `unit_type` = `"Mirror Cabin"`
   - `discovery_source` = `"ÖÖD House"`

2. **Avoid duplicates**  
   Before inserting, check that the property does not already have a record with `unit_type` containing `"Mirror Cabin"` or `"ÖÖD House"`.

3. **SQL example**
   ```sql
   -- Insert one Mirror Cabin record per matched property (copy from existing record)
   -- Use DISTINCT ON to avoid duplicate inserts when a property has multiple unit-type rows
   INSERT INTO all_glamping_properties (
     property_name, site_name, slug, property_type, research_status, is_glamping_property, is_closed,
     source, discovery_source, date_added, date_updated,
     address, city, state, zip_code, country, lat, lon,
     property_total_sites, quantity_of_units, year_site_opened, operating_season_months, number_of_locations,
     unit_type, url, phone_number, description, minimum_nights,
     rate_avg_retail_daily_rate, rate_category
     -- include other columns as needed
   )
   SELECT DISTINCT ON (property_name, city, state)
     property_name, site_name, slug, property_type, research_status, is_glamping_property, is_closed,
     source, 'ÖÖD House', date_added, date_updated,
     address, city, state, zip_code, country, lat, lon,
     property_total_sites, quantity_of_units, year_site_opened, operating_season_months, number_of_locations,
     'Mirror Cabin', url, phone_number, description, minimum_nights,
     rate_avg_retail_daily_rate, rate_category
   FROM all_glamping_properties
   WHERE id IN (9574, 9612, 10103, 9994, 10355, 9793, 9831, 9509)
     AND NOT EXISTS (
       SELECT 1 FROM all_glamping_properties p2
       WHERE p2.property_name = all_glamping_properties.property_name
         AND p2.city = all_glamping_properties.city
         AND p2.state = all_glamping_properties.state
         AND (p2.unit_type ILIKE '%mirror cabin%' OR p2.unit_type ILIKE '%ööd%')
     )
   ORDER BY property_name, city, state, id;
   ```

4. **Validation**  
   - Confirm each matched property actually has ÖÖD units (e.g. via website or [Stay ÖÖD](https://oodhouse.com/en-us)).
   - **State-only matches** (Kentucky, Colorado, Washington, Idaho) are speculative—"Kentucky, USA" could refer to any property in that state. Verify before inserting.

---

## Approach 2: Add New Properties for No-Match Locations

### Considerations

The **109 no-match** locations include:

- **Private/individual installations** – Many ÖÖD units are on private land, not glamping resorts.
- **New or small glamping sites** – Not yet in `all_glamping_properties`.
- **Vague locations** – e.g. "Kentucky, USA", "Colorado, USA", "United States" (insufficient for matching).
- **Known glamping areas** – e.g. Cameron Ranch Glamping (Coldspring), Lake Placid, Deep Creek MD, Dripping Springs TX.

### Recommended workflow

1. **Prioritize by location quality**
   - **High priority**: Full street address + city + state (e.g. `"372 River Rd, Lake Placid, NY 12946"`).
   - **Medium priority**: City + state (e.g. `"Cameron Ranch Glamping, England Lane, Coldspring, TX"`).
   - **Low priority**: State only or very vague (e.g. `"Kentucky, USA"`).

2. **Web research for each candidate**
   - Search: `"[address/city] glamping"` or `"[property name from deal] glamping"`.
   - Check [Stay ÖÖD](https://oodhouse.com/en-us) for listed properties.
   - Confirm it is a glamping property (multiple units, bookable, hospitality-focused).

3. **Enrichment fields**
   - `property_name`
   - `url` (booking or official site)
   - `address`, `city`, `state`, `zip_code`, `country`
   - `lat`, `lon` (e.g. Google Maps / geocoding)
   - `description` (2–4 sentences)
   - `unit_type` including `"Mirror Cabin"`
   - `discovery_source` = `"ÖÖD House"`

4. **Automation options**
   - Reuse `scripts/enrich-new-glamping-properties.ts` for AI-based enrichment.
   - Use Google Places API for geocoding and basic details.
   - Batch process high-priority addresses first.

### High-priority no-match candidates (with full address)

| Location | Deal |
|----------|------|
| Cameron Ranch Glamping, England Lane, Coldspring, TX | Garrett / Garrett Brown |
| 372 River Rd, Lake Placid, NY 12946 | Johnathan Esper |
| 1160 Lakeside Dr, Wimberley, TX 78676 | Arish Rustomj |
| 76 Sugarbush Village Drive, Warren, VT 05674 | Amanda Harris |
| 353 Forestdale Farm Lane, Stowe, VT 05672 | Frederick and Kristin Yardley |
| 7411 County Road 204, Plantersville, TX 77363 | Corey Hoffman (AutoCamp Hill Country) |

---

## Script

Run the analysis script:

```bash
npx tsx scripts/analyze-ood-deals-vs-glamping-properties.ts
```

It outputs:
- Match/no-match counts
- Matched properties with IDs and current `unit_type`
- Full list of no-match locations with parsed address components

---

## Unit type naming

For consistency with existing data and SEO (e.g. `docs/seo/SEO_KEYWORD_LIST_100.csv`):

- Prefer **`Mirror Cabin`** in `unit_type`.
- Optionally add `"ÖÖD House"` in `unit_description` or `alternate_names` for clarity.
