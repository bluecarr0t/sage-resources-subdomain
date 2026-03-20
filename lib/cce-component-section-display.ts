/**
 * CCE Component Costs – section name display mapping.
 * Maps column-header-only section names (e.g. "DEPTH SPAN LIGHT MEDIUM HEAVY")
 * to the full format "[Main Section] - [Column Headers]" per the CCE PDF structure.
 */

/** Maps raw section_name (column headers only) to display format "SECTION - COLUMNS" */
const SECTION_DISPLAY_MAP: Record<string, string> = {
  // ROOFS section (Section 57) – per CCE PDF structure
  'DEPTH SPAN LIGHT MEDIUM HEAVY': 'STEEL JOISTS - DEPTH SPAN LIGHT MEDIUM HEAVY',
  'TYPE SPAN LIGHT MEDIUM HEAVY': 'WOOD-TRUSSED JOISTS - TYPE SPAN LIGHT MEDIUM HEAVY',
  'SIZE COST': 'PURLINS - LIGHTWEIGHT STEEL CHANNELS - SIZE COST',
  'LIGHT MEDIUM HEAVY': 'SPACE FRAMES - LIGHT MEDIUM HEAVY',
};

/**
 * Returns the display label for a component section name.
 * If the raw value is a column-header-only name (e.g. "DEPTH SPAN LIGHT MEDIUM HEAVY"),
 * returns the full "SECTION - COLUMNS" format. Otherwise returns the raw value.
 */
export function formatComponentSectionName(raw: string | null): string {
  if (raw == null || raw.trim() === '') return '-';
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  return SECTION_DISPLAY_MAP[upper] ?? trimmed;
}
