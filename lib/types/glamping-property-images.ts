import type { GlampingPropertyImageKind } from '@/lib/glamping-property-images';

export interface GlampingPropertyImageRow {
  id: string;
  property_id: number;
  storage_bucket: string;
  storage_path: string;
  kind: GlampingPropertyImageKind;
  sort_order: number;
  mime_type: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  source: string | null;
  content_hash: string | null;
  caption: string | null;
  site_label: string | null;
  created_at: string;
}

export interface GlampingPropertyImageListItem extends GlampingPropertyImageRow {
  public_url: string;
}
