/**
 * Configuration for glamping unit type discovery pages
 * Maps URL slugs to display names and database match patterns
 */

export interface UnitTypeConfig {
  slug: string;
  displayName: string;
  /** Patterns for Supabase ilike (e.g. "%yurt%") */
  matchPatterns: string[];
}

export const UNIT_TYPE_CONFIGS: UnitTypeConfig[] = [
  { slug: 'yurts', displayName: 'Yurts', matchPatterns: ['%yurt%'] },
  {
    slug: 'safari-tents',
    displayName: 'Safari Tents',
    matchPatterns: ['%safari%tent%', '%safari tent%'],
  },
  {
    slug: 'a-frames',
    displayName: 'A-Frames',
    matchPatterns: ['%a-frame%', '%a frame%'],
  },
  {
    slug: 'treehouses',
    displayName: 'Treehouses',
    matchPatterns: ['%treehouse%'],
  },
];

export function getUnitTypeConfigBySlug(slug: string): UnitTypeConfig | null {
  const normalized = slug?.trim().toLowerCase();
  return UNIT_TYPE_CONFIGS.find((c) => c.slug === normalized) ?? null;
}

export function getAllUnitTypeSlugs(): string[] {
  return UNIT_TYPE_CONFIGS.map((c) => c.slug);
}
