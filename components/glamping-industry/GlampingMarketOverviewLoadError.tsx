'use client';

import {
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_LINK_CLASS,
} from '@/components/editorial/EditorialPageShell';

const SUPPORT_EMAIL = 'contact@sageoutdooradvisory.com';

export function GlampingMarketOverviewLoadError({
  title = 'Unable to load market data',
  message = 'Something went wrong while loading this snapshot. Please try again in a moment.',
  detail,
  className = 'mt-12',
}: {
  title?: string;
  message?: string;
  /** Optional technical detail (kept secondary for external readers). */
  detail?: string | null;
  className?: string;
}) {
  return (
    <div className={className} role="alert">
      <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">{title}</h2>
      <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-neutral-700">{message}</p>
      {detail ? (
        <p className="mt-2 max-w-md text-xs font-light leading-relaxed text-neutral-500">{detail}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={EDITORIAL_BUTTON_PRIMARY_CLASS}
          onClick={() => {
            window.location.reload();
          }}
        >
          Try again
        </button>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Glamping Market Overview: data load issue')}`}
          className={EDITORIAL_BUTTON_OUTLINE_CLASS}
        >
          Contact support
        </a>
      </div>
      <p className="mt-4 text-[11px] font-light text-neutral-500">
        Or email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className={EDITORIAL_LINK_CLASS}>
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}
