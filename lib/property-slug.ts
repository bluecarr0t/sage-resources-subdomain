/**
 * Convert property name to URL-safe slug.
 * Transliterates accented characters to ASCII equivalents.
 */
export function slugifyPropertyName(name: string): string {
  const transliterated = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
