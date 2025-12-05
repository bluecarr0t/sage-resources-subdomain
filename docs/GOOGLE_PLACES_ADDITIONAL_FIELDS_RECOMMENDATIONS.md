# Google Places API - Additional Fields for sage-glamping-data

## Overview
This document outlines additional Google Places API (New) fields you can add to enrich your property data, with special consideration for expanding beyond glamping resorts to include **RV Resorts, RV Parks, Marinas, and Campgrounds**.

## Currently Implemented Fields ✅

Based on your existing implementation, you're already fetching:
- ✅ Rating (`rating`) & User Rating Count (`userRatingCount`)
- ✅ Phone Number (`internationalPhoneNumber`)
- ✅ Website URI (`websiteUri`)
- ✅ Dining Amenities (`dineIn`, `takeout`, `delivery`, `servesBreakfast`, `servesLunch`, `servesDinner`, `servesBrunch`)
- ✅ Entertainment (`outdoorSeating`, `liveMusic`)
- ✅ Place Types (`types`, `primaryType`, `primaryTypeDisplayName`)
- ✅ Photos (`photos` - top 5)
- ✅ Reservable Status (`reservable`)

---

## Recommended Additional Fields (Priority Order)

### 🔴 HIGH PRIORITY - Essential for All Property Types

#### 1. Business Status
**API Field:** `businessStatus`  
**Type:** Enum (OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY)  
**Database Column:** `google_business_status TEXT`  
**Use Case:**
- Filter out permanently closed properties
- Show "temporarily closed" status to users
- Data quality validation

**Why Critical:** Prevents showing closed properties to users, especially important when expanding to new property types.

---

#### 2. Opening Hours
**API Fields:** `regularOpeningHours`, `currentOpeningHours`, `regularSecondaryOpeningHours`  
**Type:** Complex Object  
**Database Column:** `google_opening_hours JSONB`, `google_current_opening_hours JSONB`, `google_secondary_opening_hours JSONB`  
**Use Case:**
- Validate against your existing `operating_season_months` field
- Display real-time availability status
- Show seasonal hours (especially important for marinas and campgrounds)
- Secondary hours for drive-through, delivery, or special services

**Why Critical:** 
- RV parks and campgrounds often have seasonal operations
- Marinas have specific hours for boat launches/returns
- Real-time hours help users plan visits

**Example Structure:**
```json
{
  "openNow": true,
  "weekdayDescriptions": ["Monday: 8:00 AM – 6:00 PM", ...],
  "periods": [...]
}
```

---

#### 3. Parking Options
**API Field:** `parkingOptions`  
**Type:** Object  
**Database Column:** `google_parking_options JSONB`  
**Use Case:**
- **Critical for RV Resorts/RV Parks:** Validates and enriches your existing `rv_parking`, `rv_vehicle_length` fields
- Shows parking availability (paid vs free)
- Parking lot details (number of spaces, RV-specific parking)
- **Marinas:** Boat trailer parking availability

**Why Critical:** Parking is THE primary concern for RV travelers. Google's data can validate your existing parking fields.

**Example Structure:**
```json
{
  "parkingLot": true,
  "parkingValet": false,
  "parkingGarage": false,
  "parkingStreet": false,
  "parkingFree": true,
  "parkingPaid": false
}
```

---

#### 4. Price Level
**API Field:** `priceLevel`  
**Type:** Integer (0-4)  
**Database Column:** `google_price_level INTEGER`  
**Use Case:**
- Complements your rate data (`avg_rate_next_12_months`)
- Quick filtering by price category
- SEO-rich price indicators
- Validates pricing tiers (FREE=0, INEXPENSIVE=1, MODERATE=2, EXPENSIVE=3, VERY_EXPENSIVE=4)

**Why Critical:** Helps users quickly filter by budget, especially useful across different property types.

---

### 🟡 MEDIUM PRIORITY - Highly Valuable for Specific Property Types

#### 5. Payment Options
**API Field:** `paymentOptions`  
**Type:** Object  
**Database Column:** `google_payment_options JSONB`  
**Use Case:**
- Shows accepted payment methods (credit cards, cash, NFC/mobile payments)
- **Important for RV parks/campgrounds:** Many rural locations are cash-only
- Helps travelers prepare appropriately

**Why Important:** Travelers need to know payment options, especially in remote camping locations.

**Example Structure:**
```json
{
  "acceptsCreditCards": true,
  "acceptsDebitCards": true,
  "acceptsCashOnly": false,
  "acceptsNfc": true
}
```

---

#### 6. Accessibility Options
**API Fields:** `wheelchairAccessibleParking`, `wheelchairAccessibleEntrance`, `wheelchairAccessibleRestroom`, `wheelchairAccessibleSeating`  
**Type:** Boolean  
**Database Column:** `google_wheelchair_accessible_parking BOOLEAN`, `google_wheelchair_accessible_entrance BOOLEAN`, `google_wheelchair_accessible_restroom BOOLEAN`, `google_wheelchair_accessible_seating BOOLEAN`  
**Use Case:**
- Inclusive travel information
- Filter properties by accessibility features
- **RV Parks:** Accessible RV sites and facilities
- **Marinas:** Accessible boat ramps and facilities

**Why Important:** Accessibility is increasingly important for travelers, and many properties lack this information.

---

#### 7. Reviews
**API Field:** `reviews`  
**Type:** Array (up to 5 reviews)  
**Database Column:** `google_reviews JSONB`  
**Use Case:**
- User-generated content for property pages
- Sentiment analysis
- Rich snippets for SEO
- Authentic traveler experiences

**Why Important:** Reviews add credibility and provide user-generated content, but may incur additional API costs.

**Example Structure:**
```json
[
  {
    "name": "review_name",
    "relativePublishTimeDescription": "2 weeks ago",
    "rating": 5,
    "text": {...},
    "authorAttribution": {...},
    "publishTime": "2024-01-15T10:30:00Z"
  },
  ...
]
```

---

#### 8. Editorial Summary
**API Field:** `editorialSummary`  
**Type:** Object  
**Database Column:** `google_editorial_summary JSONB` or `google_editorial_summary_text TEXT`  
**Use Case:**
- SEO-friendly property descriptions
- Google's curated description of the place
- Fallback when `description` field is empty
- Can be used for meta descriptions and rich snippets

**Why Important:** Provides professional, SEO-optimized descriptions that can improve search rankings.

---

#### 9. Address Components
**API Field:** `addressComponents`  
**Type:** Array  
**Database Column:** `google_address_components JSONB`  
**Use Case:**
- Validate and normalize address data
- Extract specific components (street number, route, locality, administrative_area_level_1, postal_code, country)
- Fix address inconsistencies
- Better geocoding accuracy

**Why Important:** Address validation is crucial when expanding to new property types and regions.

---

#### 10. Allows Dogs / Pet-Friendly
**API Field:** `allowsDogs`  
**Type:** Boolean  
**Database Column:** `google_allows_dogs BOOLEAN`  
**Use Case:**
- Validates your existing `pets` field
- Critical filter for RV travelers (many travel with pets)
- Important for campgrounds and RV parks

**Why Important:** Pet-friendliness is a major decision factor for RV and camping travelers.

---

### 🟢 LOWER PRIORITY - Nice to Have

#### 11. Additional Amenities
**API Fields:** 
- `restroom` (Boolean) - Restroom availability
- `servesCocktails` (Boolean) - Bar/alcohol service
- `servesCoffee` (Boolean) - Coffee service
- `servesDessert` (Boolean) - Dessert options
- `menuForChildren` (Boolean) - Kids menu availability

**Database Columns:** Individual BOOLEAN columns or combined in JSONB  
**Use Case:** Additional amenity filters and property enrichment

---

#### 12. Good For Indicators
**API Fields:**
- `goodForChildren` (Boolean)
- `goodForGroups` (Boolean)
- `goodForWatchingSports` (Boolean)

**Database Columns:** Individual BOOLEAN columns  
**Use Case:** Target audience filters (family-friendly, group bookings)

---

#### 13. Location Enhancements
**API Fields:**
- `plusCode` (Object) - Google Plus Code for location sharing
- `viewport` (Object) - Bounding box for map display optimization
- `shortFormattedAddress` (String) - Abbreviated address format

**Database Columns:** JSONB for objects, TEXT for strings  
**Use Case:** Navigation, map optimization, location sharing

---

## Property Type-Specific Recommendations

### RV Resorts & RV Parks
**Highest Priority Fields:**
1. `parkingOptions` - **CRITICAL** - RV parking details
2. `businessStatus` - Avoid closed parks
3. `openingHours` - Seasonal operations
4. `allowsDogs` - Many RV travelers have pets
5. `paymentOptions` - Many are cash-only
6. `wheelchairAccessibleParking` - Accessible RV sites

### Marinas
**Highest Priority Fields:**
1. `openingHours` - Boat launch/return hours
2. `parkingOptions` - Trailer parking availability
3. `businessStatus` - Seasonal marina closures
4. `paymentOptions` - Dock fees, launch fees
5. `priceLevel` - Slip rental costs

### Campgrounds
**Highest Priority Fields:**
1. `openingHours` - Seasonal operations
2. `businessStatus` - Closed campgrounds
3. `allowsDogs` - Pet policies
4. `parkingOptions` - Vehicle/tent site parking
5. `paymentOptions` - Many are cash-only
6. `restroom` - Sanitation facilities

---

## Implementation Recommendations

### Phase 1: High Priority Fields (Week 1)
Add these fields first as they provide the most value:
- `businessStatus`
- `regularOpeningHours`
- `parkingOptions`
- `priceLevel`

### Phase 2: Medium Priority Fields (Week 2-3)
Add after validating Phase 1:
- `paymentOptions`
- `wheelchairAccessibleEntrance`, `wheelchairAccessibleParking`, `wheelchairAccessibleRestroom`
- `allowsDogs`
- `addressComponents`

### Phase 3: Content Enrichment (Week 4+)
Add for SEO and user experience:
- `editorialSummary`
- `reviews` (consider API costs)
- `goodForChildren`, `goodForGroups`

---

## Database Schema Example

```sql
-- High Priority Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_business_status TEXT,
ADD COLUMN IF NOT EXISTS google_opening_hours JSONB,
ADD COLUMN IF NOT EXISTS google_current_opening_hours JSONB,
ADD COLUMN IF NOT EXISTS google_secondary_opening_hours JSONB,
ADD COLUMN IF NOT EXISTS google_parking_options JSONB,
ADD COLUMN IF NOT EXISTS google_price_level INTEGER;

-- Medium Priority Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_payment_options JSONB,
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_parking BOOLEAN,
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_entrance BOOLEAN,
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_restroom BOOLEAN,
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_seating BOOLEAN,
ADD COLUMN IF NOT EXISTS google_reviews JSONB,
ADD COLUMN IF NOT EXISTS google_editorial_summary JSONB,
ADD COLUMN IF NOT EXISTS google_address_components JSONB,
ADD COLUMN IF NOT EXISTS google_allows_dogs BOOLEAN;

-- Lower Priority Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_restroom BOOLEAN,
ADD COLUMN IF NOT EXISTS google_serves_cocktails BOOLEAN,
ADD COLUMN IF NOT EXISTS google_serves_coffee BOOLEAN,
ADD COLUMN IF NOT EXISTS google_serves_dessert BOOLEAN,
ADD COLUMN IF NOT EXISTS google_menu_for_children BOOLEAN,
ADD COLUMN IF NOT EXISTS google_good_for_children BOOLEAN,
ADD COLUMN IF NOT EXISTS google_good_for_groups BOOLEAN,
ADD COLUMN IF NOT EXISTS google_plus_code JSONB,
ADD COLUMN IF NOT EXISTS google_viewport JSONB,
ADD COLUMN IF NOT EXISTS google_short_formatted_address TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_business_status 
ON "sage-glamping-data" (google_business_status) 
WHERE google_business_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_price_level 
ON "sage-glamping-data" (google_price_level) 
WHERE google_price_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_allows_dogs 
ON "sage-glamping-data" (google_allows_dogs) 
WHERE google_allows_dogs IS NOT NULL;
```

---

## Updated Field Mask Example

To fetch these additional fields, update your field mask in `fetch_google_places_extended.py`:

```python
field_mask = (
    # Existing fields
    "id,"
    "internationalPhoneNumber,"
    "websiteUri,"
    "rating,"
    "userRatingCount,"
    "dineIn,"
    "takeout,"
    "delivery,"
    "servesBreakfast,"
    "servesLunch,"
    "servesDinner,"
    "servesBrunch,"
    "outdoorSeating,"
    "liveMusic,"
    "types,"
    "primaryType,"
    "primaryTypeDisplayName,"
    "photos,"
    "reservable,"
    # New high priority fields
    "businessStatus,"
    "regularOpeningHours,"
    "currentOpeningHours,"
    "regularSecondaryOpeningHours,"
    "parkingOptions,"
    "priceLevel,"
    # New medium priority fields
    "paymentOptions,"
    "wheelchairAccessibleParking,"
    "wheelchairAccessibleEntrance,"
    "wheelchairAccessibleRestroom,"
    "wheelchairAccessibleSeating,"
    "allowsDogs,"
    "addressComponents,"
    "editorialSummary,"
    # Optional: reviews (increases API cost)
    "reviews,"
    # Lower priority
    "restroom,"
    "servesCocktails,"
    "servesCoffee,"
    "servesDessert,"
    "menuForChildren,"
    "goodForChildren,"
    "goodForGroups,"
    "plusCode,"
    "viewport,"
    "shortFormattedAddress"
)
```

---

## Cost Considerations

### Free/Basic Fields (included in base cost):
- `businessStatus`
- `regularOpeningHours`
- `parkingOptions` (basic info)
- `addressComponents`
- `plusCode`
- `viewport`

### May Increase Cost:
- `paymentOptions` (may require Atmosphere Details)
- `reviews` (increases cost significantly - up to 5 reviews)
- `editorialSummary` (may require Atmosphere Details)
- Some accessibility fields

**Recommendation:** Start with high-priority fields and monitor API costs. Add reviews and editorialSummary only if budget allows.

---

## Next Steps

1. **Add database columns** using the SQL schema above (start with Phase 1)
2. **Update TypeScript types** in `lib/types/sage.ts`
3. **Update fetch script** (`fetch_google_places_extended.py`) with new field mask
4. **Update TypeScript/application code** to display new fields
5. **Run migration** to populate new fields for existing properties
6. **Update map/info components** to show new data (business status, opening hours, parking info)

---

## Benefits for Expansion to RV Resorts, RV Parks, Marinas, Campgrounds

1. **Better Property Classification:** `types` and `primaryType` help identify property subtypes
2. **Seasonal Operations:** `openingHours` critical for seasonal properties
3. **RV-Specific Data:** `parkingOptions` validates your existing RV fields
4. **Accessibility:** Important for all property types, especially campgrounds
5. **Pet Policies:** `allowsDogs` is critical for RV/camping travelers
6. **Payment Methods:** Many rural camping locations are cash-only
7. **Business Status:** Avoids showing closed properties across all types

---

**Last Updated:** 2024-01-XX  
**Google Places API Version:** Places API (New)
