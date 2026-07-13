'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import {
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_H1_CLASS,
  EDITORIAL_INPUT_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { trackFormSubmission } from '@/lib/analytics';
import { fireGateAccessConfetti } from '@/lib/gate-access-confetti';
import {
  GATED_ACCESS_EXISTING_LEAD_CODE,
  GATED_ACCESS_REQUIRE_LEAD_FORM_CODE,
  GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
} from '@/lib/gated-access';
import { supabase } from '@/lib/supabase';

type GateStep = 'form' | 'sent';
type FormMode = 'lead' | 'email-only';

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

export type GlampingMarketAccessGateCopy = {
  title?: string;
  leadDescription?: string;
  emailOnlyDescription?: string;
  successDescription?: string;
};

export function GlampingMarketAccessGate({
  pageSlug = GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  title = 'Glamping Market Overview',
  leadDescription = 'Enter your name and work email to unlock US & Canada glamping metrics. We\u2019ll send a secure sign-in link to your inbox. No password required.',
  emailOnlyDescription = 'Enter your work email and we\u2019ll send a secure sign-in link. No password required.',
  successDescription = 'Open it on this device to unlock the Glamping Market Overview.',
}: {
  pageSlug?: string;
} & GlampingMarketAccessGateCopy) {
  const [step, setStep] = useState<GateStep>('form');
  const [formMode, setFormMode] = useState<FormMode>('lead');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();

  const emailOnly = formMode === 'email-only';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus trap: keep Tab cycling inside the gate. Escape does not dismiss
  // (hard gate) but returns focus to the first field so keys are handled.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const focusFirst = () => {
      const items = listFocusable(panel);
      items[0]?.focus();
    };

    // Defer so autoFocus / step content has mounted.
    const t = window.setTimeout(focusFirst, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  }, [step, formMode]);

  // The auth callback returns here with `?access=link-expired` when a magic
  // link could not be verified (expired, already used, or opened on a
  // different device than it was requested). Prompt for a fresh link and
  // default to the email-only mode since they already submitted their details.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'link-expired') {
      setNotice(
        'That sign-in link has expired or was already used. Request a new one below, and open it on this device.'
      );
      setFormMode('email-only');
      const url = new URL(window.location.href);
      url.searchParams.delete('access');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formName = emailOnly
      ? 'glamping_market_overview_gate_email'
      : 'glamping_market_overview_gate_lead';
    try {
      // Drop any stale browser session so the server can issue a fresh magic link
      // (returning-user email-only sign-in often fails to send when a session exists).
      await supabase.auth.signOut();

      const res = await fetch('/api/gated-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          pageSlug,
          emailOnly,
          ...(emailOnly ? {} : { name }),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; code?: string; name?: string | null }
        | null;
      if (!res.ok || !data?.ok) {
        trackFormSubmission(formName, pageSlug, false);
        if (data?.code === GATED_ACCESS_REQUIRE_LEAD_FORM_CODE) {
          setFormMode('lead');
          setNotice(data.error ?? null);
          setError(null);
          return;
        }
        if (data?.code === GATED_ACCESS_EXISTING_LEAD_CODE) {
          setFormMode('lead');
          setNotice(data.error ?? null);
          setError(null);
          if (typeof data.name === 'string' && data.name.trim().length > 0) {
            setName(data.name.trim());
          }
          return;
        }
        setError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }
      trackFormSubmission(formName, pageSlug, true);
      void fireGateAccessConfetti();
      setNotice(null);
      setStep('sent');
    } catch {
      trackFormSubmission(formName, pageSlug, false);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(mode: FormMode) {
    setFormMode(mode);
    setError(null);
    setNotice(null);
    if (mode === 'email-only') {
      setName('');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-dialog-title"
      aria-describedby={descriptionId}
    >
      <div className="absolute inset-0 bg-[#faf9f3]/55" aria-hidden />

      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md border border-sage-200/90 bg-white/95 p-6 shadow-lg sm:max-w-lg sm:p-8"
      >
        <h1
          id="gate-dialog-title"
          className={`${EDITORIAL_H1_CLASS} sm:whitespace-nowrap sm:tracking-[0.22em]`}
        >
          {title}
        </h1>

        {step === 'form' ? (
          <>
            {notice ? (
              <p className="mt-4 border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                {notice}
              </p>
            ) : null}
            <p
              id={descriptionId}
              className="mt-4 text-sm font-light leading-relaxed text-neutral-600"
            >
              {emailOnly ? emailOnlyDescription : leadDescription}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!emailOnly ? (
                <div>
                  <label
                    htmlFor="gate-name"
                    className="mb-1.5 block text-[11px] uppercase tracking-widest text-neutral-500"
                  >
                    Full Name
                  </label>
                  <input
                    id="gate-name"
                    type="text"
                    autoComplete="name"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={EDITORIAL_INPUT_CLASS}
                    placeholder="Jane Doe"
                  />
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="gate-email"
                  className="mb-1.5 block text-[11px] uppercase tracking-widest text-neutral-500"
                >
                  Email
                </label>
                <input
                  id="gate-email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus={emailOnly}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={EDITORIAL_INPUT_CLASS}
                  placeholder="jane@company.com"
                />
              </div>

              {error ? (
                <p role="alert" className="text-xs text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className={`${EDITORIAL_BUTTON_PRIMARY_CLASS} w-full text-center disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {submitting
                  ? 'Sending link…'
                  : emailOnly
                    ? 'Send sign-in link'
                    : 'Get access'}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-neutral-500">
              {emailOnly ? (
                <>
                  First time here?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('lead')}
                    className="underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
                  >
                    Enter your name to get access
                  </button>
                </>
              ) : (
                <>
                  Already requested access?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('email-only')}
                    className="underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
                  >
                    Sign in with email only
                  </button>
                </>
              )}
            </p>

            <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">
              {emailOnly ? (
                <>
                  By continuing you agree to our{' '}
                  <a
                    href="/privacy-policy"
                    className="underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
                  >
                    Privacy Policy
                  </a>
                  .
                </>
              ) : (
                <>
                  By continuing you agree we may contact you about Sage Outdoor Advisory
                  services. See our{' '}
                  <a
                    href="/privacy-policy"
                    className="underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
                  >
                    Privacy Policy
                  </a>
                  .
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-4 flex items-center gap-2 text-base font-medium text-neutral-900">
              <Mail className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
              Check your email
            </h2>
            <p
              id={descriptionId}
              className="mt-3 text-sm font-light leading-relaxed text-neutral-600"
            >
              We&apos;ve sent a secure sign-in link to{' '}
              <span className="font-medium text-neutral-900">{email}</span>.
            </p>
            <p className="mt-2 mb-4 text-sm font-light leading-relaxed text-neutral-600">
              {successDescription}
            </p>
            <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
              Open the link on <span className="font-medium text-neutral-700">this device</span>{' '}
              (the same browser you used here). The link expires shortly. Don&apos;t see it? Check
              spam, or{' '}
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                }}
                className="underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
              >
                try a different email
              </button>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
