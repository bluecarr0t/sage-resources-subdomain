'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@/components/ui';

export function ClientPortalLogin({ expired }: { expired?: boolean }) {
  const t = useTranslations('clientPortal');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/client-portal/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setStatus('error');
        setError(data.error || t('requestError'));
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setError(t('requestError'));
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">{t('subtitle')}</p>
        {expired ? (
          <p className="mt-4 text-sm text-amber-800 dark:text-amber-200" role="status">
            {t('linkExpired')}
          </p>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Input
            type="email"
            label={t('emailLabel')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('emailPlaceholder')}
            required
            autoComplete="email"
          />
          <Button type="submit" className="w-full" disabled={status === 'loading' || !email.trim()}>
            {status === 'loading' ? t('requesting') : t('requestLink')}
          </Button>
        </form>
        {status === 'success' ? (
          <p className="mt-4 text-sm text-sage-800 dark:text-sage-200" role="status">
            {t('requestSuccess')}
          </p>
        ) : null}
        {status === 'error' && error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
