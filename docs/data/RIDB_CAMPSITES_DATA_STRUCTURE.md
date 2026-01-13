# RIDB Campsites Data Structure Explanation

## Overview

This document explains the data structure and answers common questions about the campsite data collected from recreation.gov's RIDB API.

## Data Source

**100% from recreation.gov RIDB API** - All data is fetched directly from:
- Base URL: `https://ridb.recreation.gov/api/v1`
- Recreation Information Database (RIDB) API

## Key Questions Answered

### 1. Why are Campsite Coordinates Missing?

**Answer**: Most individual campsites don't have GPS coordinates in the RIDB API.

**Details**:
- The API returns `CampsiteLatitude: 0` and `CampsiteLongitude: 0` for campsites without coordinates
- This is **normal behavior** - individual campsites within a campground typically don't have GPS coordinates
- Only the **facility (campground)** has coordinates, which is why `facility_latitude` and `facility_longitude` are always populated
- Some campsites (like group shelters) may have coordinates if they're standalone structures

**Example**:
- Campsite "4" at "Frank Gross Campground": `latitude: null, longitude: null`
- Facility "Frank Gross Campground": `facility_latitude: 34.701446, facility_longitude: -84.149406`
- This means the campsite is at the campground location, but the exact site location within the campground isn't GPS-mapped

**Solution**: Use `facility_latitude` and `facility_longitude` for mapping campsites. These represent the campground location where the campsite is located.

### 2. Why is Description Always Null?

**Answer**: The RIDB API does not provide description fields for individual campsites.

**Details**:
- The API response does not include a `Description` or `CampsiteDescription` field
- Campsite information is provided through:
  - `CampsiteName` (e.g., "4", "2 Creek Site")
  - `CampsiteType` (e.g., "STANDARD NONELECTRIC", "GROUP SHELTER ELECTRIC")
  - `TypeOfUse` (e.g., "Overnight", "Day")
  - `ATTRIBUTES` array (detailed attributes like "Pets Allowed", "Site Length", etc.)
  - `Loop` (loop identifier within the campground)

**Solution**: Use the `attributes` JSONB field for detailed campsite information. Attributes include:
- Site dimensions (length, width)
- Capacity (max people, vehicles)
- Amenities (pets, campfire, water hookup, etc.)
- Check-in/check-out times
- Driveway information
- And many more

### 3. Is Each Record a Unique Site?

**Answer**: **Yes, each record is a unique campsite.**

**Details**:
- Each record has a unique `ridb_campsite_id` (e.g., 10176088, 10176091, 10176087)
- Each campsite has a unique `name` within its facility (e.g., "4", "7", "3", "1", "6", "2 Creek Site")
- Multiple campsites can share the same `facility_id` (they're all at the same campground)
- The combination of `facility_id` + `ridb_campsite_id` is globally unique

**Example from your data**:
- All 8 campsites (IDs: 10176088, 10176091, 10176087, 10176085, 10176090, 10176086, 10176089, 10176092) are at the same facility: "Frank Gross Campground" (facility_id: 10176084)
- Each is a unique site within that campground:
  - Site "4" (ridb_campsite_id: 10176088)
  - Site "7" (ridb_campsite_id: 10176091)
  - Site "3" (ridb_campsite_id: 10176087)
  - etc.

## Data Completeness

### What Data IS Available

✅ **Always Available**:
- Campsite ID, Name, Type, Use Type
- Facility information (name, coordinates, type, contact info)
- Attributes (detailed site information)
- Permitted Equipment
- Entity Media (images)
- Dates (created, last updated)

✅ **Sometimes Available**:
- Individual campsite coordinates (rare - most are null)
- Loop identifier
- Site identifier
- Recreation area information

### What Data is NOT Available

❌ **Not in API**:
- Campsite descriptions (not provided by RIDB)
- Individual GPS coordinates for most campsites (use facility coordinates instead)

## Best Practices for Using This Data

### For Mapping/Display:
- Use `facility_latitude` and `facility_longitude` for campsite locations
- Group campsites by `facility_id` to show multiple sites at one location
- Use `facility_name` as the primary location identifier

### For Site Details:
- Use `attributes` JSONB field for detailed information
- Parse attributes to show amenities, capacity, restrictions, etc.
- Use `permitted_equipment` to show RV compatibility
- Use `entity_media` for campsite images

### For Filtering:
- Filter by `campsite_type` (STANDARD NONELECTRIC, GROUP SHELTER, etc.)
- Filter by `campsite_use_type` (Overnight, Day)
- Filter by `campsite_accessible` for accessibility
- Filter by `facility_state` for location-based searches

## Data Quality Notes

- **Coordinates**: Most campsites use facility coordinates (this is expected and correct)
- **Descriptions**: Not available from API (use attributes instead)
- **Uniqueness**: Each record is a unique campsite (verified by unique `ridb_campsite_id`)
- **Completeness Scores**: Range from 38-57% in test data, which is normal given that:
  - Individual campsite coordinates are often missing (expected)
  - Descriptions are not provided by API
  - Some facilities don't have addresses or recreation area info

## Summary

1. **Coordinates**: Missing for most campsites (use facility coordinates) - **This is normal**
2. **Descriptions**: Not provided by RIDB API - **Use attributes field instead**
3. **Uniqueness**: Each record is a unique campsite - **Yes, confirmed**

The data structure is correct and matches what the RIDB API provides. The "missing" data (coordinates, descriptions) is expected behavior from the API, not a bug in our collection.

