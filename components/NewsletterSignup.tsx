'use client';

import { useState } from 'react';
import { DEFAULT_NEWSLETTER_SOURCE } from '@/lib/newsletter';

type NewsletterSignupProps = {
  source?: string;
  className?: string;
};

const inputClassName =
  'w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/40 disabled:opacity-60';

export function NewsletterSignup({
  source = DEFAULT_NEWSLETTER_SOURCE,
  className = '',
}: NewsletterSignupProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, source }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
      setFirstName('');
      setLastName('');
      setEmail('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={className} aria-labelledby="newsletter-signup-heading">
      <h4 id="newsletter-signup-heading" className="font-semibold mb-2 text-white">
        Newsletter
      </h4>
      <p className="text-sm text-gray-400 mb-4 max-w-xl">
        Outdoor hospitality insights, market updates, and Sage resources — delivered to your inbox.
      </p>

      {submitted ? (
        <p className="text-sm text-sage-300" role="status">
          Thanks for subscribing. Check your inbox for updates from Sage.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="newsletter-first-name" className="sr-only">
                First name
              </label>
              <input
                id="newsletter-first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                disabled={submitting}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="newsletter-last-name" className="sr-only">
                Last name
              </label>
              <input
                id="newsletter-last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name"
                disabled={submitting}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                disabled={submitting}
                className={inputClassName}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="shrink-0 rounded-md bg-sage-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>

          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-gray-500">
            By subscribing you agree to our{' '}
            <a href="/privacy-policy" className="underline hover:text-gray-300">
              Privacy Policy
            </a>
            . Unsubscribe anytime.
          </p>
        </form>
      )}
    </section>
  );
}
