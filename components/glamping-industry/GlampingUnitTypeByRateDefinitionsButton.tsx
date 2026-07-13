'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { findGlampingUnitSubtype } from '@/lib/glamping-unit-type-classification';

const LINK_CLASS =
  'text-sage-700 underline decoration-sage-300 underline-offset-2 transition-colors hover:text-sage-800 hover:decoration-sage-500';

type Props = {
  /** Unit type labels currently shown on the Unit Type by Rate chart (chart order). */
  labels: string[];
};

function definitionForLabel(label: string): string {
  const found = findGlampingUnitSubtype(label);
  const raw =
    found?.subtype.description ??
    'Definition not yet listed in the Sage unit-type taxonomy.';
  // Modal copy: prefer semicolon over em dash.
  return raw.replace(/\s*—\s*/g, '; ');
}

/**
 * “View Unit Types” link + modal defining each unit type on the rate chart.
 */
export function GlampingUnitTypeByRateDefinitionsButton({ labels }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);

  const entries = useMemo(
    () =>
      labels
        .map((label) => ({ label, description: definitionForLabel(label) }))
        .filter((e) => e.label.trim().length > 0),
    [labels]
  );

  if (entries.length === 0) return null;

  return (
    <>
      {' '}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`font-medium ${LINK_CLASS}`}
        aria-haspopup="dialog"
      >
        View Unit Types
      </button>
      <Modal open={open} onClose={close} className="max-w-lg" ariaLabelledBy={titleId}>
        <ModalContent className="border-neutral-200 bg-[#faf9f3] text-neutral-900 shadow-xl">
          <div className="flex max-h-[min(85vh,36rem)] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200/80 px-6 py-5">
              <h2
                id={titleId}
                className="font-[Georgia] text-lg font-medium tracking-tight text-neutral-900"
              >
                Unit types on this chart
              </h2>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-sm px-2 py-1 text-xs font-medium uppercase tracking-wide text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-800"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-6 pt-6 pb-6">
              <p className="text-sm font-light leading-relaxed text-neutral-600">
                Definitions for the unit types shown in Unit Type by Rate (same left-to-right
                order as the chart).
              </p>
              <ul className="mt-8 space-y-3">
                {entries.map(({ label, description }) => (
                  <li
                    key={label}
                    className="rounded-sm border border-sage-200/90 border-l-[3px] border-l-sage-600 bg-white/70 px-4 py-3.5"
                  >
                    <h3 className="text-[11px] font-medium uppercase tracking-widest text-sage-700">
                      {label}
                    </h3>
                    <p className="mt-2 text-sm font-light leading-relaxed text-neutral-700">
                      {description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

export default GlampingUnitTypeByRateDefinitionsButton;
