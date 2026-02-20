/**
 * Generate Google Places Photo URL from photo object
 * Uses API route to proxy the request (handles authentication securely)
 */
export function getGooglePhotoUrl(
  photo: {
    name: string;
    widthPx?: number;
    heightPx?: number;
  },
  fixedDimensions?: boolean
): string {
  if (!photo || !photo.name) {
    console.warn('[photoUtils] No photo name provided', photo);
    return '';
  }

  const photoName = photo.name.trim();
  if (photoName === '' || photoName === 'null' || photoName === 'undefined') {
    console.warn('[photoUtils] Invalid photo name (empty or null string):', photoName);
    return '';
  }

  if (!photoName.startsWith('places/') || !photoName.includes('/photos/')) {
    console.warn('[photoUtils] Photo name does not match expected format:', photoName.substring(0, 100));
  }

  const encodedPhotoName = encodeURIComponent(photoName);

  if (fixedDimensions) {
    return `/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=400&maxHeightPx=225`;
  }

  const maxWidth = photo.widthPx ? Math.min(photo.widthPx, 800) : 800;
  const maxHeight = photo.heightPx ? Math.min(photo.heightPx, 600) : 600;

  return `/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
}

/**
 * Parse and validate Google Places photos from property data
 * Handles both JSON string and array formats from Supabase
 */
export function parseGooglePhotos(
  photosData: any,
  propertyName?: string | null
): Array<{ name: string; widthPx?: number; heightPx?: number }> | null {
  if (!photosData) return null;

  let photos = photosData;

  if (typeof photos === 'string') {
    try {
      photos = JSON.parse(photos);
    } catch (e) {
      console.error('[photoUtils] Failed to parse google_photos JSON:', {
        error: e,
        photosString: photos.substring(0, 200),
        property: propertyName,
      });
      return null;
    }
  }

  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return null;
  }

  const validPhotos = photos.filter((photo: any) => {
    if (!photo || !photo.name) return false;
    const name = String(photo.name).trim();
    return name !== '' && name !== 'null' && name !== 'undefined';
  });

  return validPhotos.length === 0 ? null : validPhotos;
}
