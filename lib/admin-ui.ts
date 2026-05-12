/**
 * Admin design system — modern minimalist (aligned with /admin/dashboard).
 * Prefer these tokens in new admin UI; legacy pages can use matching Tailwind
 * or the `admin-*` classes from globals.css `@layer components`.
 */
export const adminRoot = 'admin-root';

export const adminSurface =
  'rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-950/50 overflow-hidden';

export const adminSurfaceSolid =
  'rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-950';

export const adminSurfaceMuted =
  'rounded-lg border border-neutral-200/55 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/35';

export const adminHairlineBorder = 'border-neutral-200/70 dark:border-neutral-800';

export const adminEyebrow =
  'text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500';

/** Main `<h1>` on admin pages — single typography scale for all `/admin/*` titles. */
export const adminPageTitle =
  'text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100';

/** Subtitle directly under the main admin page `<h1>`. */
export const adminPageDescription =
  'text-sm text-neutral-600 dark:text-neutral-400';

/** Space below the page title stack (before primary page content). */
export const adminPageHeadingMargin = 'mb-5 sm:mb-6';

export const adminSectionTitle =
  'text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100';

export const adminBodyMuted = 'text-sm text-neutral-600 dark:text-neutral-400';

export const adminMeta = 'text-[11px] text-neutral-500 dark:text-neutral-500';

export const adminInlineLink =
  'inline-flex items-center gap-0.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 rounded-sm';

export const adminDangerPanel =
  'rounded-lg border border-red-200/80 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 px-4 py-3';

export const adminGridHairline =
  'gap-px rounded-lg overflow-hidden border border-neutral-200/70 dark:border-neutral-800 bg-neutral-200/60 dark:bg-neutral-800/80';

export const adminPageHeader =
  'mb-3 border-b border-neutral-200/70 dark:border-neutral-800/80 pb-3';

/** Standard admin content width (aligned with comps / past-reports). */
export const adminPageContainer = 'w-full max-w-7xl mx-auto';