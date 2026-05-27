/**
 * Collect distinct unit types from all inventory rows for one logical property.
 */
export function collectDistinctUnitTypes(
  properties: Array<{ unit_type?: string | null }>
): string[] {
  return Array.from(
    new Set(
      properties
        .map((p) => p.unit_type?.trim())
        .filter((type): type is string => Boolean(type))
    )
  ).sort((a, b) => a.localeCompare(b));
}

/** Human-readable label for one or more unit types (FAQ, metadata, summaries). */
export function formatUnitTypesDisplay(unitTypes: string[]): string | null {
  if (unitTypes.length === 0) return null;
  if (unitTypes.length === 1) return unitTypes[0];
  if (unitTypes.length === 2) return `${unitTypes[0]} and ${unitTypes[1]}`;
  return `${unitTypes.slice(0, -1).join(', ')}, and ${unitTypes[unitTypes.length - 1]}`;
}
