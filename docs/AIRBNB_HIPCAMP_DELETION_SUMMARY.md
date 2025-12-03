# Airbnb & Hipcamp Properties Deletion Summary

**Date:** Deletion completed  
**Table:** `sage-glamping-data`  
**Purpose:** Remove non-professional listings, keep only glamping resorts with their own websites

---

## ✅ Deletion Completed

### Properties Deleted: 2

**Deleted Properties:**
1. **Treehouse Skye** (ID: 9710)
   - URL: https://www.airbnb.com/rooms/treehouse-skye
   - Reason: Airbnb listing (not a professional glamping resort website)

2. **SnugLife Camping** (ID: 9754)
   - URL: https://www.hipcamp.com/
   - Reason: Hipcamp listing (not a professional glamping resort website)

---

## 📊 Results

- **Properties Deleted:** 2
- **Properties Remaining:** 1,288
- **Status:** ✅ All Airbnb/Hipcamp listings removed

---

## 🎯 Criteria for Deletion

Properties were deleted if their website URL (in either `url` or `google_website_uri` fields) contained:
- **airbnb** (case-insensitive)
- **hipcamp** (case-insensitive)

This ensures only professional glamping resorts with their own dedicated websites remain in the database.

---

## ✅ Verification

- ✅ Both properties successfully deleted from database
- ✅ No remaining properties with Airbnb or Hipcamp URLs
- ✅ All remaining properties are professional glamping resorts

---

## 📝 Notes

- Deletion was permanent and cannot be undone
- The database now contains only professional glamping resorts
- All remaining properties have their own dedicated websites (not third-party booking platforms)

---

*Deletion completed successfully - Database now contains only professional glamping resorts!*

