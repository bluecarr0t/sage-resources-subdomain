import type { ReactNode } from 'react';

/** Olympic National Park topo line art — matches `/glamping-market-overview` */
export const EDITORIAL_TOPO_BG_URL = '/images/glamping-market-snapshot-topo.png';

export const EDITORIAL_PAGE_BG_STYLE = {
  backgroundColor: '#faf9f3',
  backgroundImage: `linear-gradient(to bottom, rgb(250 249 243 / 0.55), rgb(250 249 243 / 0.9)), url(${EDITORIAL_TOPO_BG_URL})`,
} as const;

/** Map sidebar — same palette, slightly stronger wash for narrow panel readability */
export const EDITORIAL_SIDEBAR_BG_STYLE = {
  backgroundColor: '#faf9f3',
  backgroundImage: `linear-gradient(to bottom, rgb(250 249 243 / 0.65), rgb(250 249 243 / 0.92)), url(${EDITORIAL_TOPO_BG_URL})`,
} as const;

export const EDITORIAL_LINK_CLASS =
  'text-neutral-700 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500';

/** Property count / key metric in compact panels (e.g. map sidebar) */
export const EDITORIAL_METRIC_COMPACT_CLASS =
  'font-light text-3xl tabular-nums tracking-tight text-neutral-900';

type EditorialPageShellProps = {
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Full-page editorial shell shared with glamping market overview pages:
 * warm topo background, centered column, optional footer.
 */
export function EditorialPageShell({ children, footer }: EditorialPageShellProps) {
  return (
    <div
      className="relative flex min-h-screen flex-col bg-cover bg-center bg-no-repeat text-neutral-900"
      style={EDITORIAL_PAGE_BG_STYLE}
    >
      {children}
      {footer ?? (
        <footer className="relative z-10 mt-auto w-full py-6 text-center">
          <div className="mx-auto max-w-4xl px-6">
            <p className="text-xs font-light text-neutral-500">
              Powered by{' '}
              <a
                href="https://sageoutdooradvisory.com/"
                className="text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
                rel="noopener noreferrer"
              >
                Sage Outdoor Advisory
              </a>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export const EDITORIAL_MAIN_CLASS =
  'relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-x-visible px-6 pt-16 pb-24 sm:pt-24 sm:pb-32';

/** Marketing index pages (home, guides, glossary) with site header */
export const EDITORIAL_MAIN_WITH_HEADER_CLASS =
  'relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-x-visible px-6 pt-28 pb-20 sm:pt-36 sm:pb-28';

export const EDITORIAL_BODY_CLASS = 'text-sm font-light leading-relaxed text-neutral-700';

export const EDITORIAL_LEAD_CLASS = 'mt-4 max-w-2xl text-sm font-light leading-relaxed text-neutral-600';

export const EDITORIAL_SECTION_LABEL_CLASS =
  'text-[11px] uppercase tracking-widest text-neutral-500';

export const EDITORIAL_H2_CLASS = EDITORIAL_SECTION_LABEL_CLASS;

export const EDITORIAL_CARD_CLASS =
  'block border border-sage-200/90 bg-white/50 p-5 transition-colors hover:border-sage-300 hover:bg-white/80';

/** Glossary index / home teaser card titles */
export const EDITORIAL_GLOSSARY_TERM_TITLE_CLASS =
  'text-base font-bold text-neutral-900';

export const EDITORIAL_INPUT_CLASS =
  'w-full border border-sage-200/90 bg-white/70 px-4 py-3 text-sm font-light text-neutral-900 placeholder:text-neutral-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-300';

export const EDITORIAL_BUTTON_PRIMARY_CLASS =
  'inline-block border border-sage-600 bg-sage-600 px-6 py-2.5 text-[11px] font-medium uppercase tracking-widest text-white transition-colors hover:bg-sage-700';

export const EDITORIAL_BUTTON_OUTLINE_CLASS =
  'inline-block border border-sage-300 bg-transparent px-6 py-2.5 text-[11px] font-medium uppercase tracking-widest text-neutral-800 transition-colors hover:border-sage-500 hover:bg-white/60';

export const EDITORIAL_FILTER_ACTIVE_CLASS =
  'border border-sage-600 bg-sage-600 text-[11px] font-medium uppercase tracking-wider text-white';

export const EDITORIAL_FILTER_IDLE_CLASS =
  'border border-sage-200/90 bg-white/50 text-[11px] font-medium uppercase tracking-wider text-neutral-600 transition-colors hover:border-sage-300 hover:bg-white/80';

export const EDITORIAL_DIVIDER_CLASS = 'border-sage-200/80';

/** Site header — matches glamping market overview palette */
export const EDITORIAL_HEADER_SHELL_CLASS =
  'border-b border-sage-200/80 bg-[#faf9f3]/90 backdrop-blur-md';

export const EDITORIAL_NAV_LINK_IDLE_CLASS =
  'px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-neutral-600 transition-colors hover:text-neutral-900';

export const EDITORIAL_NAV_LINK_ACTIVE_CLASS =
  'px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-neutral-900 bg-white/70';

export const EDITORIAL_NAV_DROPDOWN_PANEL_CLASS =
  'absolute top-full right-0 z-50 mt-1 min-w-[11rem] border border-sage-200/90 bg-white/95 py-1 shadow-sm';

export const EDITORIAL_NAV_DROPDOWN_ITEM_CLASS =
  'block px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-600 transition-colors hover:bg-[#faf9f3] hover:text-neutral-900';

export const EDITORIAL_NAV_DROPDOWN_ITEM_ACTIVE_CLASS =
  'block px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-900 bg-white/80';

export const EDITORIAL_H1_CLASS =
  'font-[Georgia] text-sm font-medium uppercase tracking-[0.28em] text-neutral-900 sm:text-lg';

/** Narrow sidebar titles (e.g. map) — tighter tracking so long headings stay on one line */
export const EDITORIAL_MAP_SIDEBAR_H1_CLASS =
  'font-[Georgia] whitespace-nowrap text-xs font-medium uppercase tracking-[0.14em] text-neutral-900 sm:text-sm';

/** Long-form guide / pillar page title */
export const EDITORIAL_GUIDE_TITLE_CLASS =
  'font-[Georgia] text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl md:text-5xl';

/** Wrapper for guide HTML bodies from CMS strings */
export const EDITORIAL_GUIDE_PROSE_CLASS =
  'text-sm font-light leading-relaxed text-neutral-700 [&_a]:text-sage-teal-text [&_a]:underline [&_a]:decoration-sage-200 [&_a]:underline-offset-2 hover:[&_a]:text-sage-teal-text-hover [&_a]:hover:decoration-sage-400 [&_img]:my-8 [&_img]:w-full [&_img]:border [&_img]:border-sage-200/90 [&_.aspect-square_img]:my-0 [&_.aspect-square_img]:h-full [&_.aspect-square_img]:border-0 [&_.aspect-square_img]:object-cover [&_.aspect-video_img]:my-0 [&_.aspect-video_img]:h-full [&_.aspect-video_img]:border-0 [&_.aspect-video_img]:object-cover [&_.aspect-square]:overflow-hidden [&_.aspect-video]:overflow-hidden [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-4 [&_h3]:font-bold [&_h3]:text-neutral-900 [&_strong]:font-medium [&_strong]:text-neutral-900';

export const EDITORIAL_METRIC_VALUE_CLASS =
  'mt-3 font-light text-4xl tabular-nums tracking-tight text-neutral-900 sm:text-5xl';

export function EditorialMetricLeader() {
  return (
    <span
      aria-hidden
      className="mb-[0.2em] min-w-[0.75rem] flex-1 border-b border-dotted border-neutral-300"
    />
  );
}
