# Glamping Properties Data Collection Plan

## Overview
This document outlines a comprehensive strategy for adding more properties to the `all_glamping_properties` table, prioritizing data points to collect, and determining when to leverage different data collection methods (AI research, Google Places API, OpenStreetMap, Upwork researchers, or manual collection).

## Important Data Model Note

**⚠️ Critical Understanding: Each Record = One Unit/Site, NOT One Property**

The `all_glamping_properties` table uses a **unit-centric data model** where:
- **Each record represents a specific unit/site type** at a property
- **Multiple records can share the same `property_name`** (representing different unit types/sites at the same property)
- **Example**: A property called "Collective Yellowstone" might have 3 records:
  - Record 1: `property_name="Collective Yellowstone"`, `site_name="Safari Tent"`, `unit_type="Safari Tent"`
  - Record 2: `property_name="Collective Yellowstone"`, `site_name="Yurt"`, `unit_type="Yurt"`
  - Record 3: `property_name="Collective Yellowstone"`, `site_name="Cabin"`, `unit_type="Cabin"`

This structure allows users to:
- See all available accommodation types at each property
- Filter by specific unit types (tents, yurts, domes, etc.)
- Compare rates and amenities across different unit types at the same property

**When adding new properties:**
1. **Research the property first** to identify all available unit types/sites
2. **Create separate records** for each distinct unit type
3. **Share property-level data** (location, website, description) across all records
4. **Capture unit-specific data** (rates, capacity, unit amenities) per record

## Table Structure Summary

The `all_glamping_properties` table (also referenced as `sage-glamping-data`) contains comprehensive unit/site information organized into these categories:

### Core Fields

**Property-Level Fields** (Shared across all units at a property):
- **Basic Information**: `property_name`, `property_type`, `description`
- **Location**: `address`, `city`, `state`, `country`, `zip_code`, `lat`, `lon` (same for all units)
- **Contact**: `url`, `phone_number`, `google_phone_number`, `google_website_uri` (same for all units)
- **Operating Info**: `operating_season__months_`, `year_site_opened` (property-level)

**Unit/Site-Level Fields** (Varies per record):
- **Unit Identification**: `site_name` (specific site/unit name), `unit_type` (category: Safari Tent, Yurt, Dome, etc.)
- **Unit Capacity**: `unit_capacity` (e.g., "2-4 guests" - specific to this unit type)
- **Unit-Specific Rates**: `avg__retail_daily_rate_2024`, seasonal rates (can vary by unit type)
- **Unit-Specific Amenities**: `private_bathroom`, `unit_hot_tub`, `unit_suana` (may differ by unit)
- **Minimum Nights**: `minimum_nights` (may vary by unit type)

**Aggregate Property Fields** (Property-level totals):
- **Total Sites**: `property__total_sites` (total number of sites across all unit types)
- **Quantity of Units**: `quantity_of_units` (number of units of THIS specific type at the property)

### Pricing Fields (High Priority)
- `avg__retail_daily_rate_2024` - Average daily rate (most important)
- `avg__rate__next_12_months_` - Projected rate
- `high_rate_2024`, `low_rate_2024` - Rate range
- `winter_weekday`, `winter_weekend`, `spring_weekday`, `spring_weekend`, `summer_weekday`, `summer_weekend`, `fall_weekday`, `fall_weekend` - Seasonal rates
- `rate_category` - Categorized pricing (≤$149, $150-$249, $250-$399, $400-$549, $550+)
- `retail_daily_rate__fees__2024` - Rate including fees

### Amenities Fields (High Priority)
- **Bathroom/Amenities**: `private_bathroom` (CRITICAL), `toilet`, `shower`, `water`
- **Luxury Features**: `hot_tub___sauna`, `pool`, `kitchen`, `wifi`, `electricity`
- **Outdoor Features**: `patio`, `campfires`, `picnic_table`, `charcoal_grill`
- **Additional**: `laundry`, `trash`, `cooking_equipment`, `general_store`, `cable`
- **Hot Tub/Sauna Detail**: `unit_hot_tub`, `unit_suana`, `property_hot_tub`, `property_suana`

### Google Places Integration Fields
- `google_place_id` - Permanent Place ID
- `google_rating` - Rating (0-5)
- `google_user_rating_total` - Number of reviews
- `google_photos` - Photo metadata (JSONB)
- `google_opening_hours` - Business hours
- `google_business_status` - OPERATIONAL, CLOSED_TEMPORARILY, etc.
- `google_price_level` - Price level indicator
- `google_allows_dogs` - Pet policy

### Activity & Location Features
- Activities: `fishing`, `swimming`, `hiking`, `biking`, `wildlife_watching`, etc.
- Location features: `beach`, `forest`, `lake`, `mountainous`, `waterfront`, etc.

### Metadata
- `source` - Data source identifier
- `manually_reviewed` - Whether property was manually verified (Yes/No)
- `is_closed` - Whether property is closed (Yes/No)
- `created_at`, `updated_at`, `last_verified`

---

## Top Priority Data Points

### Tier 1: Essential (Must Have)

**Per Record (Unit/Site):**
1. **Property Name** - Shared identifier for grouping units (`property_name`)
2. **Unit Type** - Type of accommodation for THIS record (`unit_type`: Safari Tent, Yurt, Dome, Cabin, etc.)
3. **Location** - `city`, `state`, `country`, `lat`, `lon` (same coordinates for all units at property)
4. **Website URL** - Property website (shared across all units)
5. **Private Bathroom** - Whether THIS unit type has private bathroom (`private_bathroom`)
6. **Average Daily Rate** - Rate for THIS unit type (`avg__retail_daily_rate_2024`)
7. **Unit Capacity** - Guest capacity for THIS unit type (`unit_capacity`: e.g., "2-4 guests")
8. **Site Name** - Optional specific site name if different from unit type (`site_name`)

**Note:** When adding a new property, identify ALL unit types available and create separate records for each.

### Tier 2: High Value (Strongly Preferred)

**Property-Level (Same for all units):**
1. **Google Place ID** - Enables automated data enrichment (shared for all units)
2. **Phone Number** - Contact information (shared)
3. **Operating Season** - When property is open (`operating_season__months_` - shared)
4. **Description** - Property overview (can reference all unit types)

**Unit-Level (Per record):**
1. **Minimum Nights** - Booking requirements for THIS unit type (may vary)
2. **Unit-Specific Amenities**:
   - `unit_hot_tub` / `unit_suana` (hot tub/sauna in THIS unit)
   - `kitchen` (full kitchen vs. kitchenette in THIS unit)
   - `private_bathroom` (reiterated from Tier 1 - critical)
3. **Quantity of Units** - Number of units of THIS type at the property (`quantity_of_units`)
4. **Seasonal Rates** - Unit-specific rates by season if available

**Property-Level Amenities** (Shared across all units):
- `property_hot_tub` / `property_suana` (shared facilities)
- `pool` (shared pool)
- `wifi` (property-wide)
- `pets` (property-wide policy)

### Tier 3: Enhanced Data (Nice to Have)
1. **Seasonal Rates** - Detailed pricing by season/weekday/weekend
2. **Activities** - Available activities (fishing, hiking, etc.)
3. **Location Features** - Setting (beach, forest, lake, etc.)
4. **RV-Specific Data** - If applicable (hookups, max length, etc.)
5. **Google Rating & Reviews** - Social proof
6. **Photos** - Visual representation
7. **Operating Details** - Check-in/out times, policies

---

## Data Collection Methods & When to Use Each

### 1. AI Research (OpenAI/ChatGPT) ⭐ Primary Discovery Method

**When to Use:**
- **Initial property discovery** - Finding new glamping properties in specific regions
- **Comprehensive data gathering** - When website is available but data needs extraction
- **Amenities research** - Determining what amenities are available
- **Description generation** - Creating property descriptions from multiple sources
- **Data enrichment** - Filling gaps for existing properties

**Best For:**
- Properties with websites but incomplete data
- Researching specific regions (e.g., "glamping in Tuscany")
- Extracting structured data from unstructured sources
- Batch processing multiple properties

**Cost:** ~$0.01-0.05 per property (depending on data complexity)

**Scripts Available:**
- `scripts/research-italy-glamping-resorts.ts`
- `scripts/research-switzerland-glamping-resorts.ts`
- `scripts/research-uk-glamping-resorts.ts`
- `scripts/research-germany-glamping-resorts.ts`
- `scripts/research-france-glamping-resorts.ts`
- `scripts/research-properties-amenities.ts` (for amenities specifically)

**Limitations:**
- Requires website URL or sufficient context
- May miss properties without online presence
- Rate information often requires manual verification
- Accuracy depends on source quality

---

### 2. Google Places API ⭐ Essential for Enrichment

**When to Use:**
- **After initial discovery** - Enrich properties with Place ID, ratings, photos
- **Location verification** - Confirming coordinates and addresses
- **Contact information** - Getting phone numbers and verified websites
- **Business status** - Checking if property is operational
- **Rating/Reviews** - Social proof data
- **Photos** - High-quality property images
- **Opening hours** - Business operation details

**Best For:**
- Properties already in database needing enrichment
- Verifying and updating existing data
- Getting current business status
- Photo collection
- Rating aggregation

**Cost:** 
- Text Search: $0.032 per request
- Place Details: $0.017 per request
- Photos: $0.007 per photo

**Scripts Available:**
- `scripts/populate-google-place-ids.ts` - Batch Place ID population
- `scripts/fetch_google_places_extended.py` - Comprehensive data fetch
- `lib/google-places.ts` - API integration library

**When NOT to Use:**
- Initial discovery (too expensive for broad searches)
- Properties not yet in Google's database
- Very new properties that may not be indexed yet

**Strategy:**
1. Use AI research or manual methods for discovery
2. Once property is identified, use Google Places API to:
   - Get `google_place_id` (stored permanently)
   - Enrich with ratings, photos, contact info
   - Verify business status
   - Update address/coordinates if more accurate

---

### 3. OpenStreetMap (OSM) ⭐ Secondary Discovery Method

**When to Use:**
- **Geographic discovery** - Finding properties in specific areas by coordinates
- **Complementary data** - When Google Places doesn't have the property
- **Location validation** - Verifying coordinates
- **OSM tag extraction** - Getting operator info, website, phone from OSM tags

**Best For:**
- Regional searches (e.g., "all glamping properties in California")
- Properties in remote areas with good OSM coverage
- Getting basic location data when other sources fail
- Extracting operator information

**Scripts Available:**
- `scripts/fetch-california-rv-properties-osm.ts`
- `scripts/fetch-oregon-washington-campgrounds-osm.ts`
- `scripts/discover-california-private-campgrounds.ts`
- Uses Overpass API and Nominatim API

**Limitations:**
- Incomplete coverage (many properties not in OSM)
- Data quality varies by region
- Often lacks detailed amenities/pricing
- Requires filtering to find glamping-specific properties

**Strategy:**
- Use for broad geographic discovery in well-mapped regions
- Filter results to glamping-specific properties (tags: `tourism=camp_site`, `glamping=yes`)
- Use as starting point, then enrich with AI research or Google Places

---

### 4. Upwork Researchers (Overseas Research) ⭐ Scale & Efficiency

**When to Use:**
- **Large-scale data collection** - When you need 100+ properties researched
- **Structured research tasks** - Clear requirements, repetitive work
- **Cost efficiency** - When time is more valuable than money
- **Language barriers** - Properties in non-English markets
- **Rate verification** - Manual rate collection from booking sites

**Best For:**
- Batch property research (e.g., "research 200 glamping properties in Europe")
- Rate data collection (checking booking sites directly)
- Data verification and quality control
- Filling data gaps for existing properties
- Multi-language market research

**Cost:** $5-15 per hour (depending on researcher location and expertise)

**Efficiency:** Researcher can process 20-50 properties per day depending on complexity

**Workflow:**
1. Create detailed research template/instructions
2. Provide list of properties or search criteria
3. Researcher collects data into structured format (CSV/JSON)
4. Review and validate data quality
5. Import to database

**Research Template Should Include:**

**Property-Level (Collected Once):**
- Property name, location (city, state, country)
- Website URL
- Coordinates (lat/lon) - use Google Maps
- Description (2-3 sentences, can mention all unit types)
- Phone number
- Operating season
- Property-level amenities (pool, shared facilities)

**Per Unit Type (Multiple Records):**
- Unit type (Safari Tent, Yurt, Dome, etc.)
- Site name (if specific names exist)
- Quantity of this unit type at property
- Unit capacity (guests per unit)
- Unit-specific rates (nightly, seasonal if available)
- Unit-specific amenities:
  - Private bathroom (Yes/No for this unit type)
  - Unit hot tub/sauna (if applicable)
  - Kitchen (full vs. kitchenette)
  - Other unit-specific features

**Example Research Template:**
```
Property: [Name]
Location: [City, State, Country]
URL: [Website]
Coordinates: [Lat, Lon]

Unit Types Available:
  1. Safari Tent
     - Quantity: 8
     - Capacity: 2-4 guests
     - Rate: $250/night
     - Private Bathroom: Yes
     - Hot Tub: No (property-level only)
     
  2. Yurt
     - Quantity: 3
     - Capacity: 4-6 guests
     - Rate: $350/night
     - Private Bathroom: Yes
     - Hot Tub: Yes (in-unit)
     
  3. Treehouse
     - Quantity: 2
     - Capacity: 2 guests
     - Rate: $450/night
     - Private Bathroom: Yes
     - Hot Tub: Yes (in-unit)
```

**Quality Control:**
- Spot-check 10-20% of entries
- Verify URLs are accessible
- Check coordinate accuracy
- Validate rate data against booking sites

---

### 5. Manual Collection/Review ⭐ Quality Control & Premium Properties

**When to Use:**
- **High-value properties** - Premium/resort properties that need perfect data
- **Data verification** - Spot-checking automated research
- **Complex properties** - Properties with unusual features or pricing
- **Final review** - Before marking property as `manually_reviewed = 'Yes'`
- **Rate collection** - When automated methods miss pricing or need verification

**Best For:**
- Flagship properties (top 10-20% by visibility/importance)
- Properties with missing critical data
- Quality assurance for bulk imports
- Researching properties where automated methods failed

**Process:**
1. Visit property website directly
2. Check booking calendar for rates
3. Verify all amenities listed
4. Confirm location/coordinates
5. Review photos and description
6. Check for seasonal variations
7. Update `manually_reviewed` flag to 'Yes'

---

## Recommended Data Collection Workflow

### Phase 1: Property Discovery & Unit Identification

**Critical First Step: Identify ALL Unit Types**

Before creating records, research each property to identify:
1. **All available unit types** (Safari Tents, Yurts, Domes, Cabins, Treehouses, etc.)
2. **Number of each unit type** (e.g., "5 Safari Tents, 3 Yurts, 2 Cabins")
3. **Differences between unit types** (rates, capacity, amenities)

**For New Regions/Markets:**
1. **Start with AI Research** - Use scripts like `research-italy-glamping-resorts.ts`
   - Ask AI to identify ALL unit types available at each property
   - Get website URLs and property-level data
   - Request unit-specific information for each unit type
   
2. **Validate with Google Places** - For properties found via AI
   - Get Place ID for future automation (one per property, shared across units)
   - Verify coordinates (same for all units)
   - Get ratings and photos (property-level)

**For Geographic Discovery:**
1. **Use OSM Overpass API** - For well-mapped regions
   - Query by bounding box or region
   - Filter for glamping-specific tags
   - Extract basic location and contact data

2. **Enrich with AI or Manual** - Add missing details, identify unit types

**For Large-Scale Collection:**
1. **Upwork Researcher** - For batch collection
   - Provide search criteria or property list
   - **CRITICAL**: Instruct researcher to identify ALL unit types per property
   - Researcher fills structured template with separate rows for each unit type
   - Import bulk data (multiple records per property)

### Phase 2: Record Creation Strategy

**When adding a new property, create records as follows:**

1. **Research Property-Level Data** (shared across all units):
   - Property name, location (address, city, state, country, coordinates)
   - Website URL, phone number
   - Property description
   - Operating season
   - Property-level amenities (pool, shared facilities)
   - Google Place ID (one per property)

2. **For EACH Unit Type, create a separate record with:**
   - Same `property_name` (for grouping)
   - Unique `unit_type` (e.g., "Safari Tent", "Yurt", "Dome")
   - `site_name` if specific names exist (optional)
   - Unit-specific rates (`avg__retail_daily_rate_2024`)
   - Unit-specific capacity (`unit_capacity`)
   - Unit-specific amenities (`private_bathroom`, `unit_hot_tub`, etc.)
   - `quantity_of_units` (number of this specific unit type)

**Example Record Creation:**
```
Property: "Wilderness Glamping Resort"

Record 1:
  property_name: "Wilderness Glamping Resort"
  unit_type: "Safari Tent"
  site_name: "Safari Tent"
  quantity_of_units: 8
  unit_capacity: "2-4 guests"
  avg__retail_daily_rate_2024: 250
  private_bathroom: "Yes"
  
Record 2:
  property_name: "Wilderness Glamping Resort"
  unit_type: "Yurt"
  site_name: "Deluxe Yurt"
  quantity_of_units: 3
  unit_capacity: "4-6 guests"
  avg__retail_daily_rate_2024: 350
  private_bathroom: "Yes"
  unit_hot_tub: true
  
Record 3:
  property_name: "Wilderness Glamping Resort"
  unit_type: "Treehouse"
  site_name: "Eagle's Nest Treehouse"
  quantity_of_units: 2
  unit_capacity: "2 guests"
  avg__retail_daily_rate_2024: 450
  private_bathroom: "Yes"
```

### Phase 3: Enrichment (After initial discovery)

1. **Google Places API** - For all properties (once per property, not per unit)
   - Populate `google_place_id` (same for all units at property)
   - Add ratings, photos, contact info (property-level)
   - Verify business status
   - Copy to all unit records for that property

2. **AI Research** - For missing unit-specific data
   - Focus on unit-specific rates (may differ by unit type)
   - Research unit-specific amenities (private bathroom per unit type)
   - Verify unit capacities
   - Generate/improve descriptions (can mention all unit types)

3. **Manual Review** - For critical properties
   - Verify all unit types are captured
   - Check that unit-specific data (rates, amenities) is accurate
   - Fill data gaps
   - Mark as `manually_reviewed = 'Yes'` (all units or property-level flag)

### Phase 4: Quality Control

1. **Automated Checks:**
   - Verify coordinates are valid (within country bounds)
   - Check URLs are accessible
   - Validate rate data is reasonable (units may have different rates)
   - Ensure required fields are populated
   - **Check for duplicate property names** - verify they represent different unit types
   - **Verify `quantity_of_units`** - ensure sum matches `property__total_sites` if provided

2. **Manual Spot Checks:**
   - Review 10-20% of new properties (check all unit records)
   - Verify all unit types are captured (visit website/booking page)
   - Verify unit-specific rates against booking sites
   - Check amenity accuracy per unit type
   - Confirm property is actually glamping (not regular camping)
   - Ensure unit-level data (rates, capacity) is correctly assigned to each unit type

---

## Priority Data Collection by Property Type

### Premium/Resort Properties (High Visibility)
- **Method**: Manual review + Google Places + AI research
- **Unit Coverage**: Capture ALL unit types available (important for premium properties)
- **Priority Fields**: All Tier 1 + Tier 2 fields, plus:
  - Detailed seasonal rates **per unit type** (may vary significantly)
  - High-quality photos (property-level)
  - Comprehensive activity list (property-level)
  - Detailed descriptions mentioning all unit types
  - Unit-specific amenity details (which units have hot tubs, etc.)

### Standard Properties
- **Method**: AI research + Google Places
- **Unit Coverage**: Capture major unit types (at minimum, the most common/popular types)
- **Priority Fields**: Tier 1 + essential Tier 2 fields
  - Private bathroom status **per unit type**
  - Basic rates **per unit type**
  - Core amenities (property and unit level)
  - Location and contact info (shared)

### Budget/Lower-Profile Properties
- **Method**: OSM discovery + AI research (minimal)
- **Unit Coverage**: May start with single unit type if property has many identical units
- **Priority Fields**: Tier 1 fields only
  - Name, location, URL (shared)
  - Unit type (at minimum one record)
  - Basic amenities if easily available

---

## Cost Optimization Strategy

### For Initial Discovery (Low Cost)
- Use AI research for discovery ($0.01-0.05/property)
- Use OSM for geographic searches (free)
- Limit Google Places API calls to essential properties

### For Enrichment (Balanced Cost)
- Google Places API for Place ID + basic enrichment ($0.05/property)
- AI research for missing amenities ($0.02-0.03/property)
- Upwork researchers for bulk rate collection ($0.50-1.00/property)

### For Premium Properties (Higher Investment)
- Manual review (time cost)
- Full Google Places enrichment including photos
- Comprehensive AI research for all fields

**Total Cost per Property Estimate:**
- Basic property: $0.10-0.20
- Standard property: $0.25-0.50
- Premium property: $1.00-2.00 (including manual review time)

---

## Data Quality Metrics

### Completeness Targets
- **Tier 1 Fields**: 100% (Essential)
- **Tier 2 Fields**: 80%+ (High Value)
- **Tier 3 Fields**: 50%+ (Enhanced)

### Accuracy Targets
- **Coordinates**: Within 100m of actual location
- **Rates**: Within $20 of actual booking rates
- **Amenities**: 95%+ accuracy on critical amenities (private bathroom, hot tub, pool)
- **Contact Info**: 98%+ accuracy (URL, phone)

### Verification Status
- Track `manually_reviewed` flag
- Target: 20-30% of properties manually reviewed (prioritize high-traffic properties)
- Regular refresh cycle: Re-verify high-priority properties annually

---

## Implementation Recommendations

### Immediate Actions
1. **Audit existing data** - Identify properties with missing unit types
   - Check for properties with only 1 record - may need to add additional unit types
   - Verify `quantity_of_units` matches actual availability
   - Identify properties where unit types may have been missed
2. **Prioritize rate collection** - Rates are critical and may vary by unit type
   - Ensure rates are unit-specific, not just property-level averages
3. **Focus on private bathroom data** - Key differentiator, ensure it's captured per unit type
4. **Establish Upwork workflow** - For scalable data collection
   - **Critical**: Train researchers to identify ALL unit types per property
   - Provide clear templates showing multiple records per property

### Short-term (1-3 months)
1. **Implement batch Google Places enrichment** - Populate Place IDs (one per property)
   - Share Place ID across all unit records for same property
2. **Create AI research templates** - Standardize unit type identification
   - Update prompts to explicitly ask for ALL unit types available
   - Request unit-specific data (rates, capacity, amenities) per unit type
3. **Build quality control scripts** - Automated validation checks
   - Verify property names with multiple records have different unit types
   - Check that `quantity_of_units` sum matches `property__total_sites` where available
   - Validate unit-specific rates are reasonable
4. **Train Upwork researchers** - Establish repeatable process
   - Emphasize importance of capturing all unit types
   - Show examples of properties with multiple unit types

### Long-term (3-6 months)
1. **Automated data refresh pipeline** - Keep rates and status current
   - Update unit-specific rates when available
   - Refresh property-level data (location, contact) across all unit records
2. **Photo collection automation** - Leverage Google Places photos (property-level)
3. **Regional specialization** - Develop region-specific collection strategies
   - Some regions may have more diverse unit types than others
4. **Quality scoring system** - Track and improve data completeness
   - Track completeness per property (all unit types captured)
   - Score based on unit-specific data quality
5. **Unit Type Deduplication** - Identify and merge duplicate unit types
   - Detect when same unit type appears multiple times with slight name variations
   - Standardize unit type names (e.g., "Safari Tent" vs "Luxury Safari Tent")

---

## Tools & Scripts Reference

### Existing Scripts
- **AI Research**: `scripts/research-*-glamping-resorts.ts` (various countries)
- **Google Places**: `scripts/populate-google-place-ids.ts`, `scripts/fetch_google_places_extended.py`
- **OSM Discovery**: `scripts/fetch-*-campgrounds-osm.ts`, `scripts/discover-california-private-campgrounds.ts`
- **Data Upload**: `scripts/upload-to-sage-glamping-data.ts`
- **Amenities Research**: `scripts/research-properties-amenities.ts`
- **Rate Processing**: `scripts/populate-rate-category.ts`

### Recommended New Scripts
1. **Batch Rate Collector** - Scrape or collect rates from booking sites
2. **Private Bathroom Verifier** - Focused research on bathroom amenities
3. **Data Quality Dashboard** - Track completeness metrics
4. **Automated Refresh Script** - Update rates and status quarterly

---

## Best Practices for Adding Units/Sites to Existing Properties

### When to Add New Records to an Existing Property

Add new records when:
1. **New unit types discovered** - Property has additional unit types not yet in database
2. **Different rates/capacities** - Same unit type but significantly different pricing or capacity
3. **Different amenities** - Same unit type but different amenities (e.g., some have hot tubs, others don't)
4. **Specific site names** - Properties with named sites that differ meaningfully

**Do NOT add duplicate records for:**
- Same unit type, same rates, same amenities (unless there's a meaningful difference)
- Minor variations in site names if unit type and characteristics are identical

### Process for Adding Units to Existing Properties

1. **Check existing records**:
   ```sql
   SELECT property_name, unit_type, site_name, quantity_of_units
   FROM all_glamping_properties
   WHERE property_name = 'Property Name'
   ORDER BY unit_type;
   ```

2. **Research missing unit types**:
   - Visit property website/booking page
   - Identify unit types not yet in database
   - Collect unit-specific data for each missing type

3. **Create new records**:
   - Use same `property_name` (for grouping)
   - Use new `unit_type` (must be different)
   - Copy property-level data (location, website, description)
   - Add unit-specific data (rates, capacity, amenities)
   - Set `quantity_of_units` for this specific unit type

4. **Verify completeness**:
   - Check if `property__total_sites` exists - sum of `quantity_of_units` should match
   - Ensure all major unit types are captured
   - Verify no duplicate unit types with different names

### Example: Adding Units to Existing Property

**Existing Records:**
```
Property: "Mountain Glamping Resort"
- Record 1: unit_type="Safari Tent", quantity=5
- Record 2: unit_type="Yurt", quantity=3
```

**Research reveals property also has:**
- 2 Treehouses (not in database)
- 1 Luxury Cabin (not in database)

**Action:**
1. Create Record 3: `unit_type="Treehouse"`, `quantity_of_units=2`, with treehouse-specific rates/amenities
2. Create Record 4: `unit_type="Cabin"`, `site_name="Luxury Cabin"`, `quantity_of_units=1`, with cabin-specific rates/amenities
3. Update `property__total_sites` if provided (should now be 11: 5+3+2+1)

## Conclusion

The most effective approach combines multiple methods:

1. **Discovery**: AI research or OSM for initial property identification
   - **Critical**: Identify ALL unit types at each property
2. **Record Creation**: Create separate records for each unit type
   - Share property-level data across all unit records
   - Capture unit-specific data (rates, capacity, amenities) per record
3. **Enrichment**: Google Places API for standardized data (ratings, photos, contact)
   - One Place ID per property, shared across all unit records
4. **Gaps**: AI research or Upwork researchers for missing details
   - Focus on unit-specific data collection
5. **Quality**: Manual review for premium properties and quality control
   - Verify all unit types are captured
   - Validate unit-specific data accuracy

**Key Success Factors:**
- **Understand the data model**: Each record = one unit type, not one property
- **Capture all unit types**: Research properties thoroughly to identify all accommodation types
- **Prioritize Tier 1 fields**: Especially unit-specific rates and private bathroom status
- **Leverage Google Places API**: For scalable enrichment (one Place ID per property)
- **Use Upwork researchers**: For cost-effective bulk collection (train them to identify all unit types)
- **Maintain quality**: Manual review of high-value properties to ensure completeness
- **Track completeness**: Both property-level (all units captured) and unit-level (data quality per unit)

By following this plan, you can systematically expand the database while maintaining high data quality, ensuring all unit types are captured, and optimizing costs.

