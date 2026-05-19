'use client';

import { useCallback, useId, useState } from 'react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import {
  GLAMPING_MARKET_SCOPE_EXCLUDED,
  GLAMPING_MARKET_SCOPE_FOOTNOTE,
  GLAMPING_MARKET_SCOPE_INCLUDED,
  GLAMPING_MARKET_SCOPE_SHORT_LABEL,
} from '@/lib/glamping-market-overview-scope';

export function GlampingMarketScopeDisclosure() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);

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
          onClick={() => setOpen(true)}
          className="text-sage-700 underline decoration-sage-300 underline-offset-2 transition-colors hover:text-sage-800 hover:decoration-sage-500"
          aria-haspopup="dialog"
        >
          What&apos;s included
        </button>
      </p>

      <Modal open={open} onClose={close} className="max-w-lg" ariaLabelledBy={titleId}>
        <ModalContent className="border-neutral-200 bg-[#faf9f3] text-neutral-900 shadow-xl">
          <ScopePanel
            titleId={titleId}
            onClose={close}
            included={GLAMPING_MARKET_SCOPE_INCLUDED}
            excluded={GLAMPING_MARKET_SCOPE_EXCLUDED}
          />
        </ModalContent>
      </Modal>
    </>
  );
}

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

function ScopePanel({
  titleId,
  onClose,
  included,
  excluded,
}: {
  titleId: string;
  onClose: () => void;
  included: readonly string[];
  excluded: readonly string[];
}) {
  return (
    <div className="flex max-h-[min(85vh,32rem)] flex-col">
      <ScopePanelHeader titleId={titleId} onClose={onClose} />
      <div className="overflow-y-auto px-6 pt-6 pb-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <section>
            <h3 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
              Included
            </h3>
            <ScopeList items={included} />
          </section>
          <section>
            <h3 className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
              Excluded
            </h3>
            <ScopeList items={excluded} />
          </section>
        </div>
        <p className="mt-8 border-t border-neutral-200/80 pt-4 text-xs font-light leading-relaxed text-neutral-500">
          {GLAMPING_MARKET_SCOPE_FOOTNOTE}
        </p>
      </div>
    </div>
  );
}

function ScopePanelHeader({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-200/80 px-6 py-5">
      <h2 id={titleId} className="font-[Georgia] text-lg font-medium tracking-tight text-neutral-900">
        What&apos;s included in this snapshot
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
  );
}
