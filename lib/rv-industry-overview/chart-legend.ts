export type RvOverviewLegendItem = {
  label: string;
  kind: 'line' | 'bar';
  color: string;
  opacity?: number;
};

/** Matches Recharts default `itemSorter: "value"` (alphabetical by label). */
export function sortRvOverviewLegendItems(items: RvOverviewLegendItem[]): RvOverviewLegendItem[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}
