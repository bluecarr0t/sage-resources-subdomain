'use client';

import Link from 'next/link';
import { useCallback, useId, useState } from 'react';
import { Modal, ModalContent } from '@/components/ui/Modal';
import {
  GLAMPING_MARKET_CLASSIFICATION_FILTER_OPTIONS,
  glampingMarketOverviewPath,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import {
  GLAMPING_SERVICE_TIERS,
  GLAMPING_SERVICE_TIER_DEFINITIONS,
  TIER_ADR_GUIDANCE,
  tierDisplayLabel,
} from '@/lib/glamping-service-tier';

const METHOD_LINK_CLASS =
  'text-sage-700 underline decoration-sage-300 underline-offset-2 transition-colors hover:text-sage-800 hover:decoration-sage-500';

const LOCKED_REASON_TITLE = 'Classification locked';
const LOCKED_REASON_US_REGION =
  'Regional views always include all service tiers. Choose All US to filter by Luxury, Upscale, Comfort, or Rustic.';
const LOCKED_REASON_CANADA =
  'Canada views always include all service tiers. Choose United States to filter by Luxury, Upscale, Comfort, or Rustic.';

type Props = {
  market: GlampingMarketSnapshotMarket;
  tier: GlampingMarketSnapshotTierFilter;
  pathForMarketTier?: (
    market: GlampingMarketSnapshotMarket,
    tier: GlampingMarketSnapshotTierFilter
  ) => string;
  /** Hide the “What do these mean?” link (e.g. sticky header). */
  compact?: boolean;
  /**
   * Freeze the control (Canada and regional US views always use all
   * classifications). Options become non-interactive and All is shown as
   * the active value.
   */
  disabled?: boolean;
};

export function GlampingMarketClassificationFilter({
  market,
  tier,
  pathForMarketTier = glampingMarketOverviewPath,
  compact = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const hintId = useId();
  const close = useCallback(() => setOpen(false), []);
  const displayTier = disabled ? 'all' : tier;
  const lockedReason = market === 'ca' ? LOCKED_REASON_CANADA : LOCKED_REASON_US_REGION;

  const active =
    'rounded-sm bg-sage-600 px-3 py-2 text-[11px] font-medium tracking-wide text-white';
  const idle =
    'rounded-sm px-3 py-2 text-[11px] font-medium tracking-wide text-neutral-600 transition-colors hover:text-neutral-900';
  const idleLocked =
    'rounded-sm px-3 py-2 text-[11px] font-medium tracking-wide text-neutral-400';

  return (
    <div
      className={
        compact
          ? 'flex max-w-full flex-col items-start sm:items-end'
          : 'flex max-w-full flex-col items-start gap-2 sm:items-end'
      }
    >
      <div
        className={`relative inline-flex max-w-full shrink-0 flex-col self-start sm:self-end ${
          disabled ? 'group' : ''
        }`}
      >
        <div
          className={`inline-flex max-w-full shrink-0 flex-wrap rounded border border-sage-200 p-0.5 ${
            disabled
              ? 'cursor-help opacity-60 transition-opacity group-hover:opacity-80 group-focus-within:opacity-80 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-sage-600'
              : ''
          }`}
          role="group"
          aria-label={disabled ? 'Classification (locked to All)' : 'Classification'}
          aria-disabled={disabled || undefined}
          aria-describedby={disabled ? hintId : undefined}
          tabIndex={disabled ? 0 : undefined}
        >
          {GLAMPING_MARKET_CLASSIFICATION_FILTER_OPTIONS.map((opt) => {
            const isActive = displayTier === opt.value;
            const className = isActive ? active : disabled ? idleLocked : idle;
            if (disabled) {
              return (
                <span
                  key={opt.value}
                  className={className}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {opt.label}
                </span>
              );
            }
            return (
              <Link
                key={opt.value}
                href={pathForMarketTier(market, opt.value)}
                scroll={false}
                className={className}
                aria-current={isActive ? 'true' : undefined}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
        {disabled ? (
          <div
            id={hintId}
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-max max-w-[16.5rem] rounded-sm bg-neutral-900 px-3 py-2 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:left-auto sm:right-0"
          >
            <p className="text-[11px] font-medium tracking-wide text-white">
              {LOCKED_REASON_TITLE}
            </p>
            <p className="mt-1 text-[11px] font-light leading-relaxed text-neutral-300">
              {lockedReason}
            </p>
          </div>
        ) : null}
      </div>
      {!compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`self-start text-[11px] font-light sm:self-end ${METHOD_LINK_CLASS}`}
          aria-haspopup="dialog"
        >
          What do these mean?
        </button>
      ) : null}

      {!compact ? (
      <Modal open={open} onClose={close} className="max-w-lg" ariaLabelledBy={titleId}>
        <ModalContent className="border-neutral-200 bg-[#faf9f3] text-neutral-900 shadow-xl">
          <div className="flex max-h-[min(85vh,36rem)] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200/80 px-6 py-5">
              <h2
                id={titleId}
                className="font-[Georgia] text-lg font-medium tracking-tight text-neutral-900"
              >
                Classification tiers
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
                Sage service tiers describe property-level positioning from amenities and published
                avg. retail daily rates (ARDR), not brand names or OTA star ratings.
              </p>
              <ul className="mt-8 space-y-3">
                {GLAMPING_SERVICE_TIERS.map((key) => {
                  const def = GLAMPING_SERVICE_TIER_DEFINITIONS[key];
                  const guidance = TIER_ADR_GUIDANCE[key];
                  return (
                    <li
                      key={key}
                      className="rounded-sm border border-sage-200/90 border-l-[3px] border-l-sage-600 bg-white/70 px-4 py-3.5"
                    >
                      <h3 className="text-[11px] font-medium uppercase tracking-widest text-sage-700">
                        {tierDisplayLabel(key, 'short')}
                      </h3>
                      <p className="mt-2 text-sm font-light leading-relaxed text-neutral-700">
                        {def.summary}
                      </p>
                      <p className="mt-2.5 border-t border-sage-100 pt-2.5 text-[11px] font-light leading-relaxed text-neutral-500">
                        <span className="font-medium text-sage-700/80">Typical ARDR:</span>{' '}
                        {guidance.note}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </ModalContent>
      </Modal>
      ) : null}
    </div>
  );
}
