# Image Storage Migration to Supabase Storage

**Date:** December 2024  
**Status:** ✅ Complete

## Summary

All glamping unit images have been successfully migrated from local storage (`/public/images/`) to Supabase Storage (blob storage). All image URLs in the codebase have been updated to use the Supabase Storage URLs.

---

## Migration Details

### Images Uploaded

**Total:** 23 images  
**Storage Location:** Supabase Storage bucket `images`  
**Path:** `glamping-units/`

### Uploaded Images

1. `a-frame-cabin-1.jpg`
2. `a-frame-cabin-2.jpg`
3. `a-frame-cabin.jpg`
4. `bell-tent.jpg`
5. `blurred-image.jpg`
6. `blurry-image.jpg`
7. `bubble-tent.jpg`
8. `cabin-1.jpg`
9. `cabin.jpg`
10. `canvas-tent-1.jpg`
11. `canvas-tent.jpg`
12. `forest-scene.jpg`
13. `geodesic-dome.jpg`
14. `mountain-view.jpg`
15. `safari-tent-1.jpg`
16. `safari-tent.jpg`
17. `solid-color.jpg`
18. `tipi.jpg`
19. `tipis.jpg`
20. `treehouse.jpg`
21. `yurt-1.jpg`
22. `yurt.jpg`
23. `yurts.jpg`

### Storage Configuration

- **Bucket Name:** `images`
- **Bucket Type:** Public (accessible via public URLs)
- **File Size Limit:** 50MB
- **Allowed MIME Types:** image/jpeg, image/jpg, image/png, image/webp, image/avif

### URL Format

All images are accessible via:
```
https://mdlniwrgrszdhzwxjdal.supabase.co/storage/v1/object/public/images/glamping-units/{filename}
```

---

## Files Updated

### Core Application Files
- ✅ `app/page.tsx` - Home page (20 replacements)
- ✅ `app/[locale]/page.tsx` - Localized home page (20 replacements)

### Glossary Files
- ✅ `lib/glossary/terms/glamping.ts` - All glamping unit terms (12 replacements)
- ✅ `app/glossary/page.tsx` - Glossary index page
- ✅ `app/[locale]/glossary/page.tsx` - Localized glossary index

### Guide Files
- ✅ `lib/guides/feasibility.ts` - Feasibility study guide (6 replacements)
- ✅ `lib/guides/appraisal.ts` - Appraisal guide

### Other Pages
- ✅ `app/guides/page.tsx` - Guides index
- ✅ `app/[locale]/guides/page.tsx` - Localized guides index
- ✅ `app/partners/page.tsx` - Partners page
- ✅ `app/[locale]/partners/page.tsx` - Localized partners page

**Total Files Updated:** 10 files  
**Total URL Replacements:** 59+

---

## Gradient Image Replacements

The following gradient images (which were renamed during optimization) were replaced with appropriate landscape images:

- `gradient-1.jpg` → `forest-scene.jpg` (used in partners pages)
- `gradient-2.jpg` → `forest-scene.jpg` (used in glossary pages)
- `gradient-3.jpg` → `mountain-view.jpg` (used in guides pages)
- `gradient-4.jpg` → `mountain-view.jpg` (used in appraisal guide)

---

## Scripts Created

### 1. `scripts/upload-images-to-supabase-storage.ts`
- Uploads all images from `/public/images/` to Supabase Storage
- Creates the storage bucket if it doesn't exist
- Generates a URL mapping JSON file

**Usage:**
```bash
npx tsx scripts/upload-images-to-supabase-storage.ts
```

### 2. `scripts/update-image-urls-to-blob-storage.ts`
- Reads the URL mapping JSON file
- Finds all files containing image references
- Updates all local image paths to Supabase Storage URLs

**Usage:**
```bash
npx tsx scripts/update-image-urls-to-blob-storage.ts
```

### 3. `scripts/image-url-mapping.json`
- Generated mapping file containing local path → Supabase Storage URL mappings
- Used by the URL update script

---

## Benefits

1. **CDN Performance:** Images served from Supabase's CDN for faster global delivery
2. **Scalability:** No need to bundle images with the application
3. **Bandwidth Savings:** Reduced application bundle size
4. **Centralized Management:** All images managed in one place (Supabase Dashboard)
5. **Optimization:** Images already optimized before upload (81.5% size reduction)

---

## Verification

To verify images are loading correctly:

1. Check browser Network tab - images should load from `*.supabase.co` domain
2. Verify images display correctly on:
   - Home page hero section
   - Glossary term pages
   - Feasibility study guide
   - All other pages using images

---

## Future Image Uploads

When adding new images:

1. **Optimize the image** using the existing optimization script
2. **Upload to Supabase Storage** using:
   ```bash
   npx tsx scripts/upload-images-to-supabase-storage.ts
   ```
3. **Use the Supabase Storage URL** in your code (the mapping file will show the URL)

Or manually upload via Supabase Dashboard:
- Go to Storage → `images` bucket → `glamping-units/` folder
- Upload new image
- Copy the public URL and use it in your code

---

## Notes

- Local images in `/public/images/` are still present but no longer referenced in code
- The mapping JSON file (`scripts/image-url-mapping.json`) can be used for reference
- All images maintain their SEO-optimized alt text and attributes
- Images are served via Supabase's CDN for optimal performance
