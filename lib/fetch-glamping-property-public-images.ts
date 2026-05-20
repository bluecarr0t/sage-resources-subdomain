import { createServerClient } from '@/lib/supabase';
import { GLAMPING_PROPERTY_IMAGES_BUCKET } from '@/lib/glamping-property-images';

export type GlampingPropertyPublicImages = {
  heroUrl: string | null;
  galleryUrls: string[];
};

/**
 * Public Storage URLs for a property detail page (hero first, then gallery by sort_order).
 */
export async function fetchGlampingPropertyPublicImages(
  propertyRowId: number
): Promise<GlampingPropertyPublicImages> {
  const supabase = createServerClient();
  const { data: rows, error } = await supabase
    .from('glamping_property_images')
    .select('kind, storage_bucket, storage_path, sort_order')
    .eq('property_id', propertyRowId)
    .in('kind', ['hero', 'gallery'])
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('[fetchGlampingPropertyPublicImages]', propertyRowId, error.message);
    return { heroUrl: null, galleryUrls: [] };
  }
  if (!rows?.length) {
    return { heroUrl: null, galleryUrls: [] };
  }

  const toUrl = (bucket: string, path: string) => {
    const b = bucket || GLAMPING_PROPERTY_IMAGES_BUCKET;
    const { data } = supabase.storage.from(b).getPublicUrl(path);
    return data.publicUrl;
  };

  let heroUrl: string | null = null;
  const galleryUrls: string[] = [];

  for (const row of rows) {
    const bucket = String((row as { storage_bucket?: string }).storage_bucket || GLAMPING_PROPERTY_IMAGES_BUCKET);
    const path = String((row as { storage_path?: string }).storage_path || '');
    if (!path) continue;
    const url = toUrl(bucket, path);
    if ((row as { kind?: string }).kind === 'hero') {
      heroUrl = url;
    } else {
      galleryUrls.push(url);
    }
  }

  return { heroUrl, galleryUrls };
}
