/** Round down to the nearest step (e.g. 710 → 700, 725 → 725) for display copy like "700+". */
export function roundDownToStep(value: number, step = 25): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value / step) * step;
}
