'use client';

import { useEffect, useState } from 'react';
import {
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_H1_CLASS,
  EDITORIAL_INPUT_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { fireGateAccessConfetti } from '@/lib/gate-access-confetti';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';

type GateStep = 'form' | 'sent';
type FormMode = 'lead' | 'email-only';

export function GlampingMarketAccessGate({
  pageSlug = GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
}: {
  pageSlug?: string;
}) {
  const [step, setStep] = useState<GateStep>('form');
  const [formMode, setFormMode] = useState<FormMode>('lead');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOnly = formMode === 'email-only';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/gated-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pageSlug,
          ...(emailOnly ? { emailOnly: true } : { name }),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }
      void fireGateAccessConfetti();
      setStep('sent');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(mode: FormMode) {
    setFormMode(mode);
    setError(null);
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
    >
      <div className="absolute inset-0 bg-[#faf9f3]/40" aria-hidden />

      <div className="relative z-10 w-full max-w-md border border-sage-200/90 bg-white/95 p-6 shadow-lg sm:max-w-lg sm:p-8">
        <h1
          id="gate-dialog-title"
          className={`${EDITORIAL_H1_CLASS} sm:whitespace-nowrap sm:tracking-[0.22em]`}
        >
          Glamping Market Overview
        </h1>

        {step === 'form' ? (
          <>
            <p className="mt-4 text-sm font-light leading-relaxed text-neutral-600">
              {emailOnly
                ? 'Enter your work email and we\u2019ll send a secure sign-in link. No password required.'
                : 'Enter your name and work email to unlock US & Canada glamping metrics. We\u2019ll send a secure sign-in link to your inbox. No password required.'}
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
            <h2 className="mt-4 text-base font-medium text-neutral-900">Check your email</h2>
            <p className="mt-3 text-sm font-light leading-relaxed text-neutral-600">
              We&apos;ve sent a secure sign-in link to{' '}
              <span className="font-medium text-neutral-900">{email}</span>. Open it on this
              device to unlock the Glamping Market Overview.
            </p>
            <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
              The link expires shortly. Don&apos;t see it? Check spam, or{' '}
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
