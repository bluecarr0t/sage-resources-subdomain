'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_BUTTON_PRIMARY_CLASS,
} from '@/components/editorial/EditorialPageShell';
import {
  MARKET_OVERVIEW_PROMO_HREF,
  MARKET_OVERVIEW_PROMO_STORAGE_KEY,
  shouldShowMarketOverviewPromoOnPath,
} from '@/lib/promo-market-overview';

const SHOW_DELAY_MS = 900;

/** Always re-show the promo on every page load while developing locally. */
const FORCE_PROMO_EVERY_VISIT = process.env.NODE_ENV === 'development';

function hasLocalSeenFlag(): boolean {
  if (FORCE_PROMO_EVERY_VISIT) return false;
  try {
    return window.localStorage.getItem(MARKET_OVERVIEW_PROMO_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function setLocalSeenFlag(): void {
  if (FORCE_PROMO_EVERY_VISIT) return;
  try {
    window.localStorage.setItem(MARKET_OVERVIEW_PROMO_STORAGE_KEY, '1');
  } catch {
    // Private mode / blocked storage — IP mark still applies when available.
  }
}

async function markPromoSeen(): Promise<void> {
  if (FORCE_PROMO_EVERY_VISIT) return;
  setLocalSeenFlag();
  try {
    await fetch('/api/promo/market-overview', { method: 'POST' });
  } catch {
    // Best-effort IP tracking.
  }
}

/**
 * Site-wide first-visit promo for the free 2026 Glamping Market Overview.
 * One impression per visitor IP (Upstash) and per browser (localStorage).
 */
export default function GlampingMarketOverviewPromo() {
  const pathname = usePathname();
  const titleId = useId();
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    setOpen(false);
    void markPromoSeen();
  }, []);

  useEffect(() => {
    if (!shouldShowMarketOverviewPromoOnPath(pathname)) {
      setOpen(false);
      return;
    }
    if (hasLocalSeenFlag()) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch('/api/promo/market-overview', {
            method: 'GET',
            cache: 'no-store',
          });
          if (!res.ok) return;
          const data = (await res.json()) as { show?: boolean };
          if (!cancelled && data.show === true && !hasLocalSeenFlag()) {
            setOpen(true);
            // Count the impression so this IP is not prompted again.
            void markPromoSeen();
          }
        } catch {
          if (!cancelled && !hasLocalSeenFlag()) {
            setOpen(true);
            void markPromoSeen();
          }
        }
      })();
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neutral-900/45 backdrop-blur-[2px]"
        aria-hidden
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md border border-sage-200/90 bg-[#faf9f3] p-6 shadow-xl sm:p-8"
      >
        <p className="inline-flex items-center rounded-full border border-sage-600/30 bg-sage-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sage-800">
          New · Free · 2026
        </p>
        <h2
          id={titleId}
          className="mt-4 font-[Georgia] text-xl font-medium leading-snug tracking-tight text-neutral-900 sm:text-2xl"
        >
          Glamping Market Overview
        </h2>
        <p className="mt-4 text-sm font-light leading-relaxed text-neutral-600">
          Explore free US &amp; Canada supply, rates, and unit-type benchmarks from Sage
          research, updated for 2026.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={MARKET_OVERVIEW_PROMO_HREF}
            className={`${EDITORIAL_BUTTON_PRIMARY_CLASS} text-center`}
            onClick={() => void markPromoSeen()}
          >
            View market overview
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className={`${EDITORIAL_BUTTON_OUTLINE_CLASS} text-center`}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
