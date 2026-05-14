/**
 * Deterministic Tailwind surface classes per unit-type token so the same
 * type reads with the same color across tables and chips (light + dark).
 *
 * A few common types use fixed overrides; everything else hashes into a
 * shared palette. Each entry must stay a string literal so Tailwind can see
 * full class names.
 */
const NEUTRAL_SURFACE =
  'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300';

/** Explicit colors for common unit types (overrides hash palette). Keys must be lowercased. */
const UNIT_TYPE_SURFACE_OVERRIDES: Record<string, string> = {
  cabin:
    'border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-100',
  cabins:
    'border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-100',
  yurt:
    'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-600 dark:bg-cyan-950/45 dark:text-cyan-100',
  yurts:
    'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-600 dark:bg-cyan-950/45 dark:text-cyan-100',
  treehouse:
    'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950/45 dark:text-amber-100',
  treehouses:
    'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950/45 dark:text-amber-100',
  tree_house:
    'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950/45 dark:text-amber-100',
};

const PALETTE: readonly string[] = [
  'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-600 dark:bg-sky-950/45 dark:text-sky-100',
  'border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-100',
  'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-100',
  'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950/45 dark:text-amber-100',
  'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-600 dark:bg-rose-950/45 dark:text-rose-100',
  'border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-600 dark:bg-cyan-950/45 dark:text-cyan-100',
  'border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-600 dark:bg-orange-950/45 dark:text-orange-100',
  'border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-600 dark:bg-teal-950/45 dark:text-teal-100',
  'border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-100',
  'border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-600 dark:bg-fuchsia-950/45 dark:text-fuchsia-100',
  'border-lime-300 bg-lime-100 text-lime-900 dark:border-lime-600 dark:bg-lime-950/45 dark:text-lime-100',
  'border-pink-300 bg-pink-100 text-pink-900 dark:border-pink-600 dark:bg-pink-950/45 dark:text-pink-100',
  'border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-600 dark:bg-blue-950/45 dark:text-blue-100',
  'border-green-300 bg-green-100 text-green-900 dark:border-green-600 dark:bg-green-950/45 dark:text-green-100',
  'border-purple-300 bg-purple-100 text-purple-900 dark:border-purple-600 dark:bg-purple-950/45 dark:text-purple-100',
  'border-red-300 bg-red-100 text-red-900 dark:border-red-600 dark:bg-red-950/45 dark:text-red-100',
  'border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-600 dark:bg-yellow-950/45 dark:text-yellow-100',
  'border-stone-300 bg-stone-100 text-stone-900 dark:border-stone-600 dark:bg-stone-950/45 dark:text-stone-100',
];

function hashUnitTypeKey(key: string): number {
  const s = key.trim().toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Border + background + text classes for a unit-type pill or chip. */
export function unitTypePillSurfaceClasses(unitTypeKey: string | null | undefined): string {
  const raw = unitTypeKey?.trim();
  if (!raw) return NEUTRAL_SURFACE;
  const override = UNIT_TYPE_SURFACE_OVERRIDES[raw.toLowerCase()];
  if (override) return override;
  const idx = hashUnitTypeKey(raw) % PALETTE.length;
  return PALETTE[idx] ?? NEUTRAL_SURFACE;
}
