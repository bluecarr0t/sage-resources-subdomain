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
