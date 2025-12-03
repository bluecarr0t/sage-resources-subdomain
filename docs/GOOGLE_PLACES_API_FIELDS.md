# Google Places API (New) - Additional Data Fields for sage-glamping-data

## Currently Fetched Fields
Based on your existing scripts, you're currently fetching:
- ✅ **Rating** (`rating`) - Average user rating (1.0-5.0)
- ✅ **User Rating Count** (`userRatingCount`) - Total number of reviews
- ✅ **Location** (`location`) - Latitude and longitude coordinates
- ✅ **Place ID** (`id`) - Unique identifier for the place
- ✅ **Display Name** (`displayName`) - Official name of the place
- ✅ **Formatted Address** (`formattedAddress`) - Complete address string

## Additional Fields Available from Google Places API (New)

### 📞 Contact Information Fields
These fields help users contact properties directly:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **International Phone Number** | `internationalPhoneNumber` | String | Direct contact number for bookings/inquiries |
| **Website URI** | `websiteUri` | String | Official website URL (can validate/update your existing `url` field) |
| **National Phone Number** | `nationalPhoneNumber` | String | Local format phone number |

**Why useful:** 
- Phone numbers enable direct booking calls
- Website URI can validate/update existing URLs in your database
- Helps identify duplicate properties

---

### 🕐 Operating Information Fields
These fields provide business hours and operational status:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Opening Hours** | `regularOpeningHours` | Object | Operating hours (can validate `operating_season_months`) |
| **Current Opening Hours** | `currentOpeningHours` | Object | Today's hours (for real-time status) |
| **Secondary Opening Hours** | `secondaryOpeningHours` | Object | Special hours (holidays, events) |
| **Business Status** | `businessStatus` | Enum | OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY |

**Why useful:**
- Validate operating seasons against actual Google data
- Identify permanently closed properties
- Show real-time availability status

---

### 💰 Pricing & Atmosphere Fields
These fields provide pricing context and user sentiment:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Price Level** | `priceLevel` | Integer | 0-4 scale (FREE, INEXPENSIVE, MODERATE, EXPENSIVE, VERY_EXPENSIVE) |
| **Editorial Summary** | `editorialSummary` | Object | Google's curated description of the place |
| **Reviews** | `reviews` | Array | Up to 5 recent reviews with text, author, rating, date |

**Why useful:**
- Price level can complement your rate data
- Editorial summary provides SEO-friendly descriptions
- Reviews offer user-generated content and sentiment analysis

---

### 🚗 Parking & Accessibility Fields
These fields are highly relevant for glamping/RV sites:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Parking Options** | `parkingOptions` | Object | Details about parking availability and types |
| **Wheelchair Accessible Entrance** | `wheelchairAccessibleEntrance` | Boolean | Accessibility information |
| **Accessibility Options** | `accessibilityOptions` | Object | Additional accessibility features |

**Why useful:**
- Parking info directly relates to your RV fields (`rv_parking`, `rv_vehicle_length`)
- Accessibility data is important for inclusive travel
- Can validate/update existing parking-related fields

---

### 🍽️ Amenities & Services Fields
These fields can validate and enhance your existing amenity data:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Dine-In** | `dineIn` | Boolean | Restaurant/dining availability (validates `sage_p_amenity_restaurant`) |
| **Takeout** | `takeout` | Boolean | Food takeout availability |
| **Delivery** | `delivery` | Boolean | Food delivery services |
| **Serves Breakfast** | `servesBreakfast` | Boolean | Meal service details |
| **Serves Lunch** | `servesLunch` | Boolean | Meal service details |
| **Serves Dinner** | `servesDinner` | Boolean | Meal service details |
| **Serves Brunch** | `servesBrunch` | Boolean | Meal service details |
| **Outdoor Seating** | `outdoorSeating` | Boolean | Relevant for glamping sites |
| **Live Music** | `liveMusic` | Boolean | Entertainment amenity |
| **Menu for Place** | `menuForPlace` | Object | Link to menu if available |

**Why useful:**
- Validates existing amenity fields (`sage_p_amenity_restaurant`, `sage_p_amenity_food_on_site`)
- Provides additional amenity data not in your current schema
- Helps identify properties with dining options

---

### 📍 Location & Address Details
Enhanced location information:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Address Components** | `addressComponents` | Array | Detailed address breakdown (street, city, state, zip, country) |
| **Plus Code** | `plusCode` | Object | Google Plus Code for location sharing |
| **Viewport** | `viewport` | Object | Bounding box for the place |
| **Short Formatted Address** | `shortFormattedAddress` | String | Abbreviated address format |

**Why useful:**
- Address components can validate/update your existing address fields
- Plus codes useful for navigation
- Viewport helps with map display optimization

---

### 🏷️ Categorization Fields
These help classify and filter properties:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Types** | `types` | Array | Place categories (e.g., "lodging", "campground", "rv_park") |
| **Primary Type** | `primaryType` | String | Main category |
| **Primary Type Display Name** | `primaryTypeDisplayName` | Object | Human-readable category name |

**Why useful:**
- Validates property type classification
- Helps identify misclassified properties
- Enables better filtering and search

---

### 📸 Media Fields
Visual content for properties:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Photos** | `photos` | Array | Up to 10 photos with metadata (width, height, author, URI) |
| **Icon** | `icon` | String | Place icon URI |
| **Icon Background Color** | `iconBackgroundColor` | String | Icon background color |

**Why useful:**
- Photos can be used for property listings
- Icon helps with map markers
- Visual content improves user experience

---

### 🔄 Reservation & Booking Fields
Booking-related information:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Reservable** | `reservable` | Boolean | Whether reservations are accepted |

**Why useful:**
- Reservable field indicates booking availability
- Helps identify properties that accept reservations
- Can be used to filter properties by booking capability

---

### 🌐 Additional Metadata
Other useful fields:

| Field Name | API Field | Type | Use Case |
|------------|-----------|------|----------|
| **Adr Format Address** | `adrFormatAddress` | String | Address in hCard microformat |
| **Current Secondary Opening Hours** | `currentSecondaryOpeningHours` | Object | Current special hours |
| **Display Name** | `displayName` | Object | Localized display name |
| **Formatted Address** | `formattedAddress` | String | Already fetching this |
| **Good For Children** | `goodForChildren` | Boolean | Family-friendly indicator |
| **Good For Groups** | `goodForGroups` | Boolean | Group booking indicator |
| **Good For Watching Sports** | `goodForWatchingSports` | Boolean | Entertainment amenity |

---

## Recommended Priority Fields to Add

### High Priority (Most Useful for Glamping Sites)
1. **`internationalPhoneNumber`** - Direct contact for bookings
2. **`websiteUri`** - Validate/update existing URLs
3. **`priceLevel`** - Complement rate data
4. **`businessStatus`** - Identify closed properties
5. **`parkingOptions`** - Validate RV parking fields
6. **`regularOpeningHours`** - Validate operating seasons
7. **`types`** - Validate property classifications
8. **`photos`** - Visual content for listings

### Medium Priority
9. **`editorialSummary`** - SEO-friendly descriptions
10. **`reviews`** - User-generated content
11. **`dineIn`** / **`servesBreakfast`** etc. - Validate restaurant amenities
12. **`wheelchairAccessibleEntrance`** - Accessibility data
13. **`addressComponents`** - Validate address data

### Low Priority (Nice to Have)
14. **`plusCode`** - Location sharing
15. **`goodForChildren`** / **`goodForGroups`** - Family/group indicators
16. **`icon`** - Map marker customization

---

## Implementation Notes

### Field Mask Example
To fetch multiple fields, update your field mask:
```python
"X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.internationalPhoneNumber,places.websiteUri,places.priceLevel,places.businessStatus,places.parkingOptions,places.regularOpeningHours,places.types,places.photos"
```

### Database Schema Considerations
- Most fields can be stored as `TEXT` or `JSONB` (for complex objects like `openingHours`, `parkingOptions`, `photos`)
- Consider adding indexes on frequently queried fields (phone, website, business status)
- Use `JSONB` for arrays/objects to enable efficient querying

### Cost Considerations
- Basic fields (location, address, place ID) are included in base cost
- Contact fields (phone, website) may incur additional charges
- Atmosphere fields (reviews, photos) may incur additional charges
- Only request fields you actually need to minimize costs

### Rate Limiting
- Google Places API has rate limits
- Your current scripts use delays (0.1s) - may need to adjust for more fields
- Consider batching requests or using place IDs to reduce API calls

---

## Next Steps

1. **Add columns to database schema** for high-priority fields
2. **Update TypeScript types** in `lib/types/sage.ts`
3. **Modify existing scripts** to fetch additional fields
4. **Create migration script** to populate new fields for existing properties
5. **Update map components** to display new data where relevant

