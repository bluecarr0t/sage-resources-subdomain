'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_H1_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { DropdownSelect } from '@/components/ui';
import { trackFormSubmission } from '@/lib/analytics';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import {
  GATED_ACCESS_BUSINESS_TYPES,
  gatedAccessBusinessTypeLabel,
  type GatedAccessBusinessType,
} from '@/lib/gated-access-business-type';

const BUSINESS_TYPE_OPTIONS = GATED_ACCESS_BUSINESS_TYPES.map((type) => ({
  value: type,
  label: gatedAccessBusinessTypeLabel(type),
}));

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function listFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Hard-required modal for unlocked Market Overview visitors missing
 * `business_type` (signed up before the field existed, or email-only return).
 * Escape does not dismiss; the page is frozen until they submit.
 */
export function GlampingMarketBusinessTypePrompt({
  pageSlug = GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
}: {
  pageSlug?: string;
}) {
  const router = useRouter();
  const [businessType, setBusinessType] = useState<GatedAccessBusinessType | ''>(
    ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || done) return;

    const focusFirst = () => {
      const items = listFocusable(panel);
      items[0]?.focus();
    };

    const t = window.setTimeout(focusFirst, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (
          panel.querySelector(
            '[aria-expanded="true"][aria-haspopup="listbox"]'
          )
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        focusFirst();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = listFocusable(panel);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [done]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!businessType) {
      setError('Please select what best describes you.');
      return;
    }
    setSubmitting(true);
    const formName = 'glamping_market_overview_business_type_backfill';
    try {
      const res = await fetch('/api/gated-access/business-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessType, pageSlug }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        trackFormSubmission(formName, pageSlug, false);
        setError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }
      trackFormSubmission(formName, pageSlug, true);
      setDone(true);
      router.refresh();
    } catch {
      trackFormSubmission(formName, pageSlug, false);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-type-prompt-title"
      aria-describedby={descriptionId}
    >
      <div className="absolute inset-0 bg-[#faf9f3]/70 backdrop-blur-[2px]" aria-hidden />

      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md border border-sage-200/90 bg-white/95 p-6 shadow-lg sm:max-w-lg sm:p-8"
      >
        <h2
          id="business-type-prompt-title"
          className={`${EDITORIAL_H1_CLASS} sm:tracking-[0.18em]`}
        >
          Quick update
        </h2>
        <p
          id={descriptionId}
          className="mt-4 text-sm font-light leading-relaxed text-neutral-600"
        >
          One quick question so we can tailor follow-up. Select what best
          describes you to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              id="business-type-prompt-label"
              htmlFor="business-type-prompt-select"
              className="mb-1.5 block text-[11px] uppercase tracking-widest text-neutral-500"
            >
              I am a…
            </label>
            <DropdownSelect
              id="business-type-prompt-select"
              variant="editorial"
              value={businessType}
              placeholder="Select one…"
              aria-labelledby="business-type-prompt-label"
              aria-required
              aria-invalid={Boolean(error && !businessType)}
              options={BUSINESS_TYPE_OPTIONS}
              onChange={(next) => {
                setBusinessType(
                  GATED_ACCESS_BUSINESS_TYPES.includes(
                    next as GatedAccessBusinessType
                  )
                    ? (next as GatedAccessBusinessType)
                    : ''
                );
                if (error) setError(null);
              }}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={`${EDITORIAL_BUTTON_PRIMARY_CLASS} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
