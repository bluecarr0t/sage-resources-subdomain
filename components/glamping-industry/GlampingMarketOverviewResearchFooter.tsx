'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import {
  GLAMPING_MARKET_METHODOLOGY_NOTES,
  GLAMPING_MARKET_SCOPE_EXCLUDED,
  GLAMPING_MARKET_SCOPE_INCLUDED,
  GLAMPING_MARKET_SCOPE_INCLUDED_INTRO,
  GLAMPING_MARKET_SCOPE_SHORT_LABEL,
  glampingMarketOverviewFooterDisclaimer,
} from '@/lib/glamping-market-overview-scope';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

const METHOD_LINK_CLASS =
  'text-sage-700 underline decoration-sage-300 underline-offset-2 transition-colors hover:text-sage-800 hover:decoration-sage-500';

type MethodologyModalContextValue = {
  openMethodology: () => void;
};

const MethodologyModalContext = createContext<MethodologyModalContextValue | null>(null);

function ScopeList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm font-light leading-relaxed text-neutral-700">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-sage-500" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MethodologyPanel({
  titleId,
  onClose,
}: {
  titleId: string;
  onClose: () => void;
}) {
  return (
    <div className="flex max-h-[min(85vh,36rem)] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200/80 px-6 py-5">
        <h2
          id={titleId}
          className="font-[Georgia] text-lg font-medium tracking-tight text-neutral-900"
        >
          Methodology &amp; research notes
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-sm px-2 py-1 text-xs font-medium uppercase tracking-wide text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-800"
          aria-label="Close"
        >
          Close
        </button>
      </div>
      <div className="overflow-y-auto px-6 pt-6 pb-6">
        <p className="text-sm font-light leading-relaxed text-neutral-600">
          Scope: <span className="text-neutral-800">{GLAMPING_MARKET_SCOPE_SHORT_LABEL}</span>
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <section>
            <h3 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
              Included
            </h3>
            <p className="mt-3 text-sm font-light leading-relaxed text-neutral-700">
              {GLAMPING_MARKET_SCOPE_INCLUDED_INTRO}
            </p>
            <ScopeList items={GLAMPING_MARKET_SCOPE_INCLUDED} />
          </section>
          <section>
            <h3 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
              Excluded
            </h3>
            <ScopeList items={GLAMPING_MARKET_SCOPE_EXCLUDED} />
          </section>
        </div>

        <section className="mt-10 border-t border-neutral-200/80 pt-8">
          <h3 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
            Research notes
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm font-light leading-relaxed text-neutral-700">
            {GLAMPING_MARKET_METHODOLOGY_NOTES.map((note) => {
              const colonIdx = note.indexOf(':');
              const label = colonIdx >= 0 ? note.slice(0, colonIdx + 1) : null;
              const body = colonIdx >= 0 ? note.slice(colonIdx + 1) : note;
              return (
                <li key={note} className="flex gap-2">
                  <span
                    className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-sage-500"
                    aria-hidden
                  />
                  <span>
                    {label ? (
                      <>
                        <strong className="font-semibold text-neutral-900">{label}</strong>
                        {body}
                      </>
                    ) : (
                      note
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MethodologyModal({
  open,
  onClose,
  titleId,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" ariaLabelledBy={titleId}>
      <ModalContent className="border-neutral-200 bg-[#faf9f3] text-neutral-900 shadow-xl">
        <MethodologyPanel titleId={titleId} onClose={onClose} />
      </ModalContent>
    </Modal>
  );
}

/**
 * One shared methodology modal for “What’s included” + footer “Methodology”.
 * Wrap overview page content so both triggers open the same dialog.
 */
export function GlampingMarketMethodologyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const openMethodology = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openMethodology }), [openMethodology]);

  return (
    <MethodologyModalContext.Provider value={value}>
      {children}
      <MethodologyModal open={open} onClose={close} titleId={titleId} />
    </MethodologyModalContext.Provider>
  );
}

function useMethodologyTrigger(): { openMethodology: () => void; localModal: ReactNode } {
  const ctx = useContext(MethodologyModalContext);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);
  const openLocal = useCallback(() => setOpen(true), []);

  if (ctx) {
    return { openMethodology: ctx.openMethodology, localModal: null };
  }

  return {
    openMethodology: openLocal,
    localModal: <MethodologyModal open={open} onClose={close} titleId={titleId} />,
  };
}

/** Inline scope line under filters — opens the shared methodology modal. */
export function GlampingMarketScopeDisclosure() {
  const { openMethodology, localModal } = useMethodologyTrigger();

  return (
    <>
      <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-neutral-600">
        <span className="text-neutral-500">Scope:</span>{' '}
        <span className="text-neutral-700">{GLAMPING_MARKET_SCOPE_SHORT_LABEL}</span>
        <span className="text-neutral-400" aria-hidden>
          {' '}
          ·{' '}
        </span>
        <button
          type="button"
          onClick={openMethodology}
          className={METHOD_LINK_CLASS}
          aria-haspopup="dialog"
        >
          What&apos;s included
        </button>
      </p>
      {localModal}
    </>
  );
}

/**
 * Shared page footer: A-level research disclaimer + Methodology, then Powered by (hybrid D).
 */
export function GlampingMarketOverviewResearchFooter({
  market = 'us',
}: {
  market?: GlampingMarketSnapshotMarket;
}) {
  const { openMethodology, localModal } = useMethodologyTrigger();

  return (
    <footer className="relative z-10 mt-auto w-full py-6 text-center">
      <div className="mx-auto max-w-4xl px-6">
        <p className="mx-auto max-w-2xl text-[11px] font-light leading-relaxed text-neutral-500">
          {glampingMarketOverviewFooterDisclaimer(market)}{' '}
          <button
            type="button"
            onClick={openMethodology}
            className={METHOD_LINK_CLASS}
            aria-haspopup="dialog"
          >
            Methodology
          </button>
        </p>
        <p className="mt-3 text-xs font-light text-neutral-500">
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
      {localModal}
    </footer>
  );
}
