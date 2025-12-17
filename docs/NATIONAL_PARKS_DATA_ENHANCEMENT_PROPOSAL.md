# National Parks Data Enhancement Proposal

## Overview

This document proposes additional data points to enhance the `national-parks` table to provide more comprehensive information for visitors, especially those interested in glamping and outdoor recreation. The goal is to make national park pages more informative and useful for trip planning.

## Current Table Structure

The `national-parks` table currently contains:
- Basic info: `name`, `park_code`, `state`, `slug`
- Location: `latitude`, `longitude`, `acres`
- Historical: `date_established`
- Statistics: `area_2021`, `recreation_visitors_2021`
- Content: `description`
- Metadata: `created_at`, `updated_at`

---

## Proposed Data Enhancements

### Category 1: Visitor Access & Operations

#### 1.1 `operating_months` (TEXT or JSONB)
- **Description**: Months/seasons when the park is fully operational (e.g., "May-October", "Year-round", "June-September")
- **Data Type**: `TEXT` (simple) or `JSONB` (structured: `{"start_month": 5, "end_month": 10, "year_round": false}`)
- **Use Case**: Help visitors plan trips during operational periods
- **Research Feasibility**: ✅ High - Available from NPS websites and API
- **Priority**: High

#### 1.2 `best_time_to_visit` (TEXT)
- **Description**: Recommended months/seasons for optimal weather and conditions (e.g., "May-June, September-October")
- **Data Type**: `TEXT`
- **Use Case**: Guide visitors on when to plan their glamping trips
- **Research Feasibility**: ✅ High - Can be researched from travel guides and NPS recommendations
- **Priority**: High

#### 1.3 `entry_fee_per_vehicle` (NUMERIC)
- **Description**: Standard entrance fee per private vehicle (in USD)
- **Data Type**: `NUMERIC(10,2)`
- **Use Case**: Help visitors budget for their trip
- **Research Feasibility**: ✅ High - Available from NPS websites
- **Priority**: Medium

#### 1.4 `entry_fee_per_person` (NUMERIC)
- **Description**: Standard entrance fee per person (in USD) - for parks without vehicle fees
- **Data Type**: `NUMERIC(10,2)`
- **Use Case**: Budget planning
- **Research Feasibility**: ✅ High - Available from NPS websites
- **Priority**: Medium

#### 1.5 `annual_pass_available` (BOOLEAN)
- **Description**: Whether the park offers an annual pass
- **Data Type**: `BOOLEAN`
- **Use Case**: Inform frequent visitors about pass options
- **Research Feasibility**: ✅ High - Available from NPS websites
- **Priority**: Low

#### 1.6 `reservation_required` (BOOLEAN)
- **Description**: Whether advance reservations are required for entry (timed-entry system)
- **Data Type**: `BOOLEAN`
- **Use Case**: Critical for trip planning - visitors need to know if they must book in advance
- **Research Feasibility**: ✅ High - Available from NPS websites and alerts
- **Priority**: High

#### 1.7 `reservation_website` (TEXT)
- **Description**: URL for making reservations (e.g., Recreation.gov link)
- **Data Type**: `TEXT`
- **Use Case**: Direct visitors to booking system
- **Research Feasibility**: ✅ High - Available from NPS websites
- **Priority**: Medium

---

### Category 2: Pet & Animal Policies

#### 2.1 `dogs_allowed` (BOOLEAN)
- **Description**: Whether dogs are allowed in the park
- **Data Type**: `BOOLEAN`
- **Use Case**: Essential for pet owners planning glamping trips
- **Research Feasibility**: ✅ High - Available from NPS websites and pet policy pages
- **Priority**: High

#### 2.2 `dogs_allowed_restrictions` (TEXT)
- **Description**: Restrictions on dogs (e.g., "On leash only", "Only in developed areas", "Not allowed on trails")
- **Data Type**: `TEXT`
- **Use Case**: Provide detailed pet policy information
- **Research Feasibility**: ✅ High - Available from NPS websites
- **Priority**: Medium

#### 2.3 `pet_friendly_areas` (TEXT)
- **Description**: Specific areas where pets are allowed (e.g., "Campgrounds and parking areas only")
- **Data Type**: `TEXT`
- **Use Case**: Help pet owners plan their visit
- **Research Feasibility**: ✅ Medium - May require detailed research per park
- **Priority**: Low

---

### Category 3: Camping & Accommodations

#### 3.1 `camping_available` (BOOLEAN)
- **Description**: Whether the park has campgrounds
- **Data Type**: `BOOLEAN`
- **Use Case**: Help visitors know if they can camp in the park
- **Research Feasibility**: ✅ High - Available from NPS websites and campground listings
- **Priority**: High

#### 3.2 `number_of_campgrounds` (INTEGER)
- **Description**: Total number of campgrounds in the park
- **Data Type**: `INTEGER`
- **Use Case**: Indicate camping capacity
- **Research Feasibility**: ✅ High - Available from NPS campground data
- **Priority**: Medium

#### 3.3 `camping_reservation_required` (BOOLEAN)
- **Description**: Whether camping reservations are required
- **Data Type**: `BOOLEAN`
- **Use Case**: Critical for planning camping trips
- **Research Feasibility**: ✅ High - Available from Recreation.gov and NPS websites
- **Priority**: High

#### 3.4 `lodging_available` (BOOLEAN)
- **Description**: Whether the park has lodges, cabins, or other accommodations
- **Data Type**: `BOOLEAN`
- **Use Case**: Help visitors find alternative to camping
- **Research Feasibility**: ✅ High - Available from NPS websites
- **Priority**: Medium

#### 3.5 `rv_camping_available` (BOOLEAN)
- **Description**: Whether RV camping is available
- **Data Type**: `BOOLEAN`
- **Use Case**: Important for RV travelers
- **Research Feasibility**: ✅ High - Available from campground amenities data
- **Priority**: Medium

---

### Category 4: Activities & Recreation

#### 4.1 `hiking_trails_available` (BOOLEAN)
- **Description**: Whether the park has hiking trails
- **Data Type**: `BOOLEAN`
- **Use Case**: Basic activity indicator
- **Research Feasibility**: ✅ High - Most parks have trails
- **Priority**: Medium

#### 4.2 `number_of_trails` (INTEGER)
- **Description**: Approximate number of hiking trails
- **Data Type**: `INTEGER`
- **Use Case**: Indicate hiking opportunities
- **Research Feasibility**: ⚠️ Medium - May require manual counting or estimation
- **Priority**: Low

#### 4.3 `water_activities` (TEXT or JSONB)
- **Description**: Available water activities (e.g., "Kayaking, Swimming, Fishing")
- **Data Type**: `TEXT` (comma-separated) or `JSONB` (array)
- **Use Case**: Help visitors plan water-based activities
- **Research Feasibility**: ✅ High - Available from NPS activity listings
- **Priority**: Medium

#### 4.4 `wildlife_viewing` (BOOLEAN)
- **Description**: Whether the park is known for wildlife viewing
- **Data Type**: `BOOLEAN`
- **Use Case**: Attract wildlife enthusiasts
- **Research Feasibility**: ✅ High - Can be determined from park descriptions
- **Priority**: Medium

#### 4.5 `scenic_drives` (BOOLEAN)
- **Description**: Whether the park has scenic drives
- **Data Type**: `BOOLEAN`
- **Use Case**: Attract visitors who prefer driving tours
- **Research Feasibility**: ✅ High - Available from NPS websites
- **Priority**: Low

#### 4.6 `visitor_centers_count` (INTEGER)
- **Description**: Number of visitor centers in the park
- **Data Type**: `INTEGER`
- **Use Case**: Indicate visitor services availability
- **Research Feasibility**: ✅ High - Available from NPS visitor center data
- **Priority**: Low

---

### Category 5: Climate & Weather

#### 5.1 `climate_type` (TEXT)
- **Description**: General climate classification (e.g., "Desert", "Alpine", "Temperate", "Tropical")
- **Data Type**: `TEXT`
- **Use Case**: Help visitors prepare for weather conditions
- **Research Feasibility**: ✅ High - Can be researched from climate data
- **Priority**: Medium

#### 5.2 `average_summer_temp` (NUMERIC)
- **Description**: Average summer temperature in Fahrenheit
- **Data Type**: `NUMERIC(5,1)`
- **Use Case**: Help visitors pack appropriately
- **Research Feasibility**: ✅ High - Available from weather/climate databases
- **Priority**: Medium

#### 5.3 `average_winter_temp` (NUMERIC)
- **Description**: Average winter temperature in Fahrenheit
- **Data Type**: `NUMERIC(5,1)`
- **Use Case**: Help visitors prepare for winter visits
- **Research Feasibility**: ✅ High - Available from weather/climate databases
- **Priority**: Medium

#### 5.4 `snow_season` (TEXT)
- **Description**: Months when snow is typically present (e.g., "November-April", "Year-round at elevation")
- **Data Type**: `TEXT`
- **Use Case**: Important for winter recreation planning
- **Research Feasibility**: ✅ Medium - Can be researched from climate data
- **Priority**: Low

---

### Category 6: Accessibility

#### 6.1 `wheelchair_accessible` (BOOLEAN)
- **Description**: Whether the park has wheelchair-accessible facilities and trails
- **Data Type**: `BOOLEAN`
- **Use Case**: Essential for accessibility planning
- **Research Feasibility**: ✅ High - Available from NPS accessibility information
- **Priority**: High

#### 6.2 `accessible_trails_count` (INTEGER)
- **Description**: Number of wheelchair-accessible trails
- **Data Type**: `INTEGER`
- **Use Case**: Detailed accessibility information
- **Research Feasibility**: ✅ Medium - Available from NPS accessibility guides
- **Priority**: Medium

#### 6.3 `accessible_camping` (BOOLEAN)
- **Description**: Whether accessible campsites are available
- **Data Type**: `BOOLEAN`
- **Use Case**: Important for accessible camping trips
- **Research Feasibility**: ✅ High - Available from campground accessibility data
- **Priority**: Medium

---

### Category 7: Location & Transportation

#### 7.1 `nearest_major_city` (TEXT)
- **Description**: Nearest major city (e.g., "Las Vegas, NV", "Denver, CO")
- **Data Type**: `TEXT`
- **Use Case**: Help visitors plan travel routes
- **Research Feasibility**: ✅ High - Can be determined from coordinates
- **Priority**: Medium

#### 7.2 `distance_from_nearest_city` (NUMERIC)
- **Description**: Distance in miles from nearest major city
- **Data Type**: `NUMERIC(6,1)`
- **Use Case**: Help visitors estimate travel time
- **Research Feasibility**: ✅ High - Can be calculated from coordinates
- **Priority**: Medium

#### 7.3 `nearest_airport` (TEXT)
- **Description**: Nearest major airport code (e.g., "LAS", "DEN")
- **Data Type**: `TEXT`
- **Use Case**: Help visitors plan flights
- **Research Feasibility**: ✅ High - Can be determined from coordinates
- **Priority**: Medium

#### 7.4 `driving_time_from_nearest_city` (TEXT)
- **Description**: Estimated driving time from nearest major city (e.g., "2.5 hours")
- **Data Type**: `TEXT`
- **Use Case**: Help visitors plan travel time
- **Research Feasibility**: ✅ High - Can be calculated using mapping APIs
- **Priority**: Low

---

### Category 8: Park Features & Designation

#### 8.1 `designation_type` (TEXT)
- **Description**: Type of designation (e.g., "National Park", "National Monument", "National Preserve")
- **Data Type**: `TEXT`
- **Use Case**: Clarify park type (though most are "National Park")
- **Research Feasibility**: ✅ High - Available from NPS data
- **Priority**: Low

#### 8.2 `unesco_world_heritage` (BOOLEAN)
- **Description**: Whether the park is a UNESCO World Heritage Site
- **Data Type**: `BOOLEAN`
- **Use Case**: Highlight special significance
- **Research Feasibility**: ✅ High - Available from UNESCO listings
- **Priority**: Low

#### 8.3 `notable_landmarks` (TEXT or JSONB)
- **Description**: Famous landmarks or features (e.g., "Old Faithful, Grand Prismatic Spring" for Yellowstone)
- **Data Type**: `TEXT` (comma-separated) or `JSONB` (array)
- **Use Case**: Highlight key attractions
- **Research Feasibility**: ✅ High - Well-documented for most parks
- **Priority**: Medium

#### 8.4 `primary_ecosystem` (TEXT)
- **Description**: Primary ecosystem type (e.g., "Desert", "Alpine Tundra", "Temperate Rainforest")
- **Data Type**: `TEXT`
- **Use Case**: Help visitors understand the environment
- **Research Feasibility**: ✅ High - Available from park descriptions and scientific data
- **Priority**: Low

---

### Category 9: Practical Information

#### 9.1 `cell_phone_coverage` (TEXT)
- **Description**: Cell phone coverage quality (e.g., "Limited", "Good", "None")
- **Data Type**: `TEXT`
- **Use Case**: Important for safety and communication planning
- **Research Feasibility**: ⚠️ Medium - May require crowdsourced or carrier data
- **Priority**: Medium

#### 9.2 `wifi_available` (BOOLEAN)
- **Description**: Whether WiFi is available at visitor centers or campgrounds
- **Data Type**: `BOOLEAN`
- **Use Case**: Help visitors plan connectivity needs
- **Research Feasibility**: ✅ High - Available from NPS facility information
- **Priority**: Low

#### 9.3 `backcountry_permits_required` (BOOLEAN)
- **Description**: Whether backcountry camping requires permits
- **Data Type**: `BOOLEAN`
- **Use Case**: Important for backcountry enthusiasts
- **Research Feasibility**: ✅ High - Available from NPS regulations
- **Priority**: Medium

#### 9.4 `fire_restrictions` (TEXT)
- **Description**: General fire restriction information (e.g., "Campfires allowed in designated areas", "No fires during fire season")
- **Data Type**: `TEXT`
- **Use Case**: Important for camping and safety
- **Research Feasibility**: ⚠️ Medium - May vary by season, could be general policy
- **Priority**: Low

---

### Category 10: Additional Statistics

#### 10.1 `recreation_visitors_2022` (TEXT)
- **Description**: Visitor count for 2022 (to keep data current)
- **Data Type**: `TEXT` (to match existing format)
- **Use Case**: More recent visitor statistics
- **Research Feasibility**: ✅ High - Available from NPS statistics
- **Priority**: Low

#### 10.2 `recreation_visitors_2023` (TEXT)
- **Description**: Visitor count for 2023 (most recent)
- **Data Type**: `TEXT` (to match existing format)
- **Use Case**: Most current visitor statistics
- **Research Feasibility**: ✅ High - Available from NPS statistics
- **Priority**: Medium

---

## Recommended Priority Implementation Plan

### Phase 1: High Priority (Essential for Trip Planning)
1. `operating_months` - When parks are open
2. `best_time_to_visit` - Optimal visiting seasons
3. `reservation_required` - Critical for entry planning
4. `dogs_allowed` - Important for pet owners
5. `camping_available` - Core accommodation info
6. `camping_reservation_required` - Critical for camping planning
7. `wheelchair_accessible` - Essential accessibility info

### Phase 2: Medium Priority (Enhances User Experience)
8. `entry_fee_per_vehicle` / `entry_fee_per_person` - Budget planning
9. `dogs_allowed_restrictions` - Detailed pet policies
10. `lodging_available` - Alternative accommodations
11. `water_activities` - Activity planning
12. `wildlife_viewing` - Attraction highlight
13. `climate_type` - Weather preparation
14. `nearest_major_city` - Travel planning
15. `nearest_airport` - Flight planning
16. `notable_landmarks` - Key attractions

### Phase 3: Lower Priority (Nice to Have)
17. Remaining fields as needed based on user feedback

---

## Data Research Strategy

### Using OpenAI API for Research

Once fields are approved, we can create a script that:
1. Fetches each national park from the database
2. Uses OpenAI API to research the approved fields from:
   - NPS official websites
   - Travel guides and resources
   - Climate and weather databases
   - Accessibility information
3. Validates and structures the data
4. Updates the database with the new information

### Data Sources
- **NPS Official Websites**: Primary source for policies, fees, and operational info
- **NPS API**: For structured data where available
- **Recreation.gov**: For camping and reservation information
- **Weather/Climate APIs**: For temperature and climate data
- **Mapping APIs**: For distance and location calculations
- **UNESCO**: For World Heritage status

---

## Implementation Considerations

### Database Schema Changes
- All new fields should be nullable (`NULL` allowed) to support gradual data population
- Consider adding indexes on frequently queried fields (e.g., `dogs_allowed`, `camping_available`)
- Add appropriate column comments for documentation

### TypeScript Types
- Update `NationalPark` interface in `lib/types/national-parks.ts`
- Ensure all new fields are properly typed

### UI/UX Updates
- Update `NationalParkDetailTemplate.tsx` to display new fields
- Consider adding filter/sort capabilities on map for fields like `dogs_allowed`, `camping_available`
- Add icons or badges for quick visual indicators (e.g., 🐕 for dog-friendly)

### Data Maintenance
- Some fields may need periodic updates (e.g., fees, reservation requirements)
- Consider adding a `last_verified` timestamp for fields that change frequently
- Set up automated checks or manual review process for accuracy

---

## Next Steps

1. **Review & Approval**: Review this proposal and select which fields to implement
2. **Schema Design**: Create SQL migration script for approved fields
3. **Research Script**: Develop OpenAI-powered research script for data collection
4. **Data Population**: Run research script to populate approved fields
5. **UI Updates**: Update components to display new data
6. **Testing**: Verify data accuracy and UI functionality
7. **Documentation**: Update documentation with new fields

---

## Questions for Consideration

1. Which fields are most important for your glamping/marketing use case?
2. Should we prioritize fields that enable filtering/searching on the map?
3. Do you want to collect data for all 62 parks, or focus on high-traffic parks first?
4. How frequently should data be updated/verified?
5. Are there any specific fields not listed that would be valuable for your audience?

---

**Document Version**: 1.0  
**Created**: 2024  
**Last Updated**: 2024
