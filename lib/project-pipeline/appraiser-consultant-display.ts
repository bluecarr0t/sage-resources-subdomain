/** Split a sheet appraiser/consultant cell into unique display names. */
export function parseAppraiserConsultantValues(value: string | null | undefined): string[] {
  const trimmed = value?.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of trimmed.split(/\s*\/\s*|\s*,\s*/)) {
    const name = part.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    names.push(name);
  }

  return names;
}

/** Serialize consultant names for sheet / Supabase storage (slash-separated). */
export function formatAppraiserConsultantValues(names: readonly string[]): string {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }

  return unique.join(' / ');
}
