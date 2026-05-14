import adjacencyJson from './us-state-border-adjacency.json';

type AdjacencyMap = Record<string, string[]>;

const ADJ = adjacencyJson as AdjacencyMap;

/**
 * US state abbreviation plus land-border neighbors (for narrowing ski_resorts /
 * wineries fetches). Returns null when the anchor is not a known 2-letter code.
 */
export function anchorUsStatesForRegionalDemandFetch(
  anchorStateAbbr: string | null | undefined
): string[] | null {
  if (anchorStateAbbr == null) return null;
  const abbr = anchorStateAbbr.trim().toUpperCase();
  if (abbr.length !== 2) return null;
  const neighbors = ADJ[abbr];
  if (neighbors === undefined) return null;
  const out = new Set<string>([abbr, ...neighbors]);
  return [...out];
}
