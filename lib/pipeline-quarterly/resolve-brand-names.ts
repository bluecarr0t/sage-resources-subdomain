import { createServerClient } from '@/lib/supabase';
import { isValidGlampingBrandId } from '@/lib/glamping-brands';

const PAGE_SIZE = 1000;

/** Resolve glamping brand UUIDs to human-readable display names. */
export async function fetchGlampingBrandDisplayNamesByIds(
  brandIds: readonly string[]
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      brandIds.filter((id): id is string => isValidGlampingBrandId(id))
    ),
  ];
  if (unique.length === 0) return new Map();

  const supabase = createServerClient();
  const byId = new Map<string, string>();

  for (let i = 0; i < unique.length; i += PAGE_SIZE) {
    const chunk = unique.slice(i, i + PAGE_SIZE);
    const { data, error } = await supabase
      .from('glamping_brands')
      .select('id, display_name')
      .in('id', chunk);

    if (error) continue;

    for (const row of data ?? []) {
      const id = row.id?.trim();
      const name = row.display_name?.trim();
      if (id && name) byId.set(id, name);
    }
  }

  return byId;
}

export function resolveBrandDisplayName(
  brandId: string | null | undefined,
  namesById: ReadonlyMap<string, string>
): string {
  if (!brandId?.trim()) return '';
  return namesById.get(brandId.trim()) ?? '';
}
