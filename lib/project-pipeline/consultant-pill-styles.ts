/**
 * Deterministic Tailwind surface classes per consultant/appraiser name so the
 * same person reads with the same color across Job Pipeline pills.
 */
const NEUTRAL_SURFACE =
  'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';

/** Explicit pill colors for common consultants (overrides hash palette). Keys must be lowercased. */
const CONSULTANT_PILL_OVERRIDES: Record<string, string> = {
  greg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200',
  aidan: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200',
};

const PALETTE: readonly string[] = [
  'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200',
  'bg-lime-100 text-lime-900 dark:bg-lime-950/50 dark:text-lime-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200',
  'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
  'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-200',
  'bg-stone-100 text-stone-800 dark:bg-stone-950/50 dark:text-stone-200',
];

function hashConsultantName(name: string): number {
  const normalized = name.trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Background + text classes for a consultant/appraiser pill. */
export function consultantPillSurfaceClasses(name: string | null | undefined): string {
  const raw = name?.trim();
  if (!raw) return NEUTRAL_SURFACE;

  const override = CONSULTANT_PILL_OVERRIDES[raw.toLowerCase()];
  if (override) return override;

  const index = hashConsultantName(raw) % PALETTE.length;
  return PALETTE[index] ?? NEUTRAL_SURFACE;
}
