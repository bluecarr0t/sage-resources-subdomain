'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import { Card } from '@/components/ui';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import {
  CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS,
  PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS,
  type PipelineEmailPreferenceKey,
  type PipelineEmailPreferences,
} from '@/lib/project-pipeline/notifications/email-preferences';

type AccountResponse = {
  email: string;
  display_name: string | null;
  role: 'admin' | 'author';
  is_project_manager: boolean;
  pipeline_email_preferences: PipelineEmailPreferences;
  error?: string;
};

function PreferenceToggle({
  checked,
  disabled,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <span
          className={`h-6 w-11 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sage-600 ${
            checked ? 'bg-sage-600' : 'bg-neutral-300 dark:bg-neutral-600'
          } ${disabled ? 'opacity-60' : ''}`}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
          aria-hidden
        />
      </label>
    </li>
  );
}

export default function AccountPage() {
  const t = useTranslations('admin.account');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'author'>('author');
  const [isProjectManager, setIsProjectManager] = useState(false);
  const [preferences, setPreferences] = useState<PipelineEmailPreferences | null>(null);
  const [savingKey, setSavingKey] = useState<PipelineEmailPreferenceKey | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null
  );

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/account');
      const body = (await res.json()) as AccountResponse;
      if (!res.ok) {
        throw new Error(body.error || t('loadError'));
      }
      setEmail(body.email);
      setRole(body.role);
      setIsProjectManager(Boolean(body.is_project_manager));
      setPreferences(body.pipeline_email_preferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updatePreference = async (key: PipelineEmailPreferenceKey, enabled: boolean) => {
    if (!preferences) return;

    const previous = preferences;
    setPreferences({ ...preferences, [key]: enabled });
    setSavingKey(key);
    setError(null);

    try {
      const res = await fetch('/api/admin/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: enabled }),
      });
      const body = (await res.json()) as {
        pipeline_email_preferences?: PipelineEmailPreferences;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('saveError'));
      }
      if (body.pipeline_email_preferences) {
        setPreferences(body.pipeline_email_preferences);
      }
      setToast({ message: t('saveSuccess'), variant: 'success' });
    } catch (err) {
      setPreferences(previous);
      const message = err instanceof Error ? err.message : t('saveError');
      setError(message);
      setToast({ message, variant: 'error' });
    } finally {
      setSavingKey(null);
    }
  };

  const roleLabel = role === 'admin' ? t('roleAdmin') : t('roleAuthor');

  const renderPreferenceGroup = (
    headingId: string,
    heading: string,
    description: string,
    keys: readonly PipelineEmailPreferenceKey[]
  ) => (
    <section aria-labelledby={headingId}>
      <h4
        id={headingId}
        className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
      >
        {heading}
      </h4>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
        {keys.map((key) => (
          <PreferenceToggle
            key={key}
            checked={preferences![key]}
            disabled={savingKey === key}
            onChange={(enabled) => void updatePreference(key, enabled)}
            label={t(`preference.${key}.label`)}
            description={t(`preference.${key}.description`)}
          />
        ))}
      </ul>
    </section>
  );

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className={adminPageHeadingMargin}>
          <h1 className={`${adminPageTitle} flex items-center gap-2`}>
            <User className="h-7 w-7 shrink-0 text-sage-600" aria-hidden />
            {t('title')}
          </h1>
          <p className={`${adminPageDescription} mt-1`}>{t('subtitle')}</p>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('loading')}</p>
        ) : error && !preferences ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : preferences ? (
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {t('profileHeading')}
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">{t('emailLabel')}</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">{email}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">{t('roleLabel')}</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100">{roleLabel}</dd>
                </div>
                {isProjectManager ? (
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">
                      {t('pipelineRoleLabel')}
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {t('pipelineRoleProjectManagerAndConsultant')}
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-neutral-500 dark:text-neutral-400">
                      {t('pipelineRoleLabel')}
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {t('pipelineRoleConsultant')}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">
                {t('notificationsHeading')}
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {t('notificationsDescription')}
              </p>

              <div className="mt-6">
                <section aria-labelledby="account-email-heading">
                  <h3
                    id="account-email-heading"
                    className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg"
                  >
                    {t('emailHeading')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {isProjectManager ? t('emailDescriptionBoth') : t('emailDescriptionConsultant')}
                  </p>

                  <div className="mt-6 space-y-6">
                    {isProjectManager
                      ? renderPreferenceGroup(
                          'account-email-pm-heading',
                          t('projectManagerHeading'),
                          t('projectManagerDescription'),
                          PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS
                        )
                      : null}
                    <div
                      className={
                        isProjectManager
                          ? 'border-t border-neutral-200 pt-6 dark:border-neutral-800'
                          : undefined
                      }
                    >
                      {renderPreferenceGroup(
                        'account-email-consultant-heading',
                        t('consultantHeading'),
                        t('consultantDescription'),
                        CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </Card>

            {toast ? (
              <p
                className={`text-sm ${
                  toast.variant === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
                role="status"
              >
                {toast.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
