/** Anchor categories for proximity insights (ski, parks, wineries). */
export type AnchorPointAnchorType = 'ski' | 'national-parks' | 'wineries';

export const ANCHOR_POINT_ANCHOR_TYPES: AnchorPointAnchorType[] = [
  'ski',
  'national-parks',
  'wineries',
];

export function parseAnchorPointAnchorType(
  value: string | null | undefined
): AnchorPointAnchorType {
  const v = value?.toLowerCase();
  if (v === 'national-parks' || v === 'wineries') return v;
  return 'ski';
}

export function anchorUsesSlugFilter(type: AnchorPointAnchorType): boolean {
  return type === 'national-parks';
}

/** National parks and wineries use blended seasonal rates in state charts; ski uses winter. */
export function anchorUsesYearAvgStateRate(type: AnchorPointAnchorType): boolean {
  return type !== 'ski';
}
