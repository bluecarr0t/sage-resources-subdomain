/** Shared keyboard-focus affordance for interactive state paths on RV overview maps. */
export const MAP_STATE_GEOGRAPHY_CLASS =
  'cursor-pointer outline-none focus-visible:stroke-[2.5px] focus-visible:stroke-slate-900 dark:focus-visible:stroke-slate-100';

export function mapStateGeographyA11yProps(ariaLabel: string) {
  return {
    tabIndex: 0,
    role: 'button' as const,
    'aria-label': ariaLabel,
    className: MAP_STATE_GEOGRAPHY_CLASS,
  };
}
