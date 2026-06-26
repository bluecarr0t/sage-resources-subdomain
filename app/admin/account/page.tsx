'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import { Card } from '@/components/ui';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import {
  CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS,
  VISIBLE_PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS,
  type PipelineEmailPreferenceKey,
  type PipelineEmailPreferences,
} from '@/lib/project-pipeline/notifications/email-preferences';
import {
  CONSULTANT_PIPELINE_SLACK_PREFERENCE_KEYS,
  VISIBLE_PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS,
  type PipelineSlackPreferenceKey,
  type PipelineSlackPreferences,
} from '@/lib/project-pipeline/notifications/slack-preferences';

type NotificationPreferenceKey = PipelineEmailPreferenceKey | PipelineSlackPreferenceKey;

type PreferenceSectionId = 'email-pm' | 'email-consultant' | 'slack-pm' | 'slack-consultant';

type AccountResponse = {
  email: string;
  display_name: string | null;
  role: 'admin' | 'author';
  is_project_manager: boolean;
  pipeline_email_preferences: PipelineEmailPreferences;
  pipeline_slack_preferences: PipelineSlackPreferences;
  slack_email: string | null;
  error?: string;
};

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={ariaLabel}
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
  );
}

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
      <ToggleSwitch checked={checked} disabled={disabled} onChange={onChange} ariaLabel={label} />
    </li>
  );
}

function sectionKeysAllEnabled<T extends PipelineEmailPreferences | PipelineSlackPreferences>(
  preferences: T,
  keys: readonly NotificationPreferenceKey[]
): boolean {
  return keys.every((key) => preferences[key as keyof T]);
}

export default function AccountPage() {
  const t = useTranslations('admin.account');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'author'>('author');
  const [isProjectManager, setIsProjectManager] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState<PipelineEmailPreferences | null>(null);
  const [slackPreferences, setSlackPreferences] = useState<PipelineSlackPreferences | null>(null);
  const [savingKey, setSavingKey] = useState<NotificationPreferenceKey | null>(null);
  const [savingSection, setSavingSection] = useState<PreferenceSectionId | null>(null);
  const [slackEmailInput, setSlackEmailInput] = useState('');
  const [savedSlackEmail, setSavedSlackEmail] = useState<string | null>(null);
  const [slackProfileName, setSlackProfileName] = useState<string | null>(null);
  const [slackEmailBusy, setSlackEmailBusy] = useState<'verify' | 'save' | null>(null);
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
      setEmailPreferences(body.pipeline_email_preferences);
      setSlackPreferences(body.pipeline_slack_preferences);
      setSavedSlackEmail(body.slack_email);
      setSlackEmailInput(body.slack_email ?? body.email);
      setSlackProfileName(null);
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

  const persistPreferences = async (
    channel: 'email' | 'slack',
    patch: Record<string, boolean>,
    rollback: () => void
  ) => {
    try {
      const res = await fetch('/api/admin/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, ...patch }),
      });
      const body = (await res.json()) as {
        pipeline_email_preferences?: PipelineEmailPreferences;
        pipeline_slack_preferences?: PipelineSlackPreferences;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('saveError'));
      }
      if (body.pipeline_email_preferences) {
        setEmailPreferences(body.pipeline_email_preferences);
      }
      if (body.pipeline_slack_preferences) {
        setSlackPreferences(body.pipeline_slack_preferences);
      }
      setToast({ message: t('saveSuccess'), variant: 'success' });
    } catch (err) {
      rollback();
      const message = err instanceof Error ? err.message : t('saveError');
      setError(message);
      setToast({ message, variant: 'error' });
    }
  };

  const updatePreference = async (
    channel: 'email' | 'slack',
    key: NotificationPreferenceKey,
    enabled: boolean
  ) => {
    const preferences = channel === 'email' ? emailPreferences : slackPreferences;
    if (!preferences) return;

    const previousEmail = emailPreferences;
    const previousSlack = slackPreferences;

    if (channel === 'email') {
      setEmailPreferences({ ...preferences, [key]: enabled } as PipelineEmailPreferences);
    } else {
      setSlackPreferences({ ...preferences, [key]: enabled } as PipelineSlackPreferences);
    }
    setSavingKey(key);
    setError(null);

    await persistPreferences(channel, { [key]: enabled }, () => {
      setEmailPreferences(previousEmail);
      setSlackPreferences(previousSlack);
    });

    setSavingKey(null);
  };

  const updateSectionPreferences = async (
    sectionId: PreferenceSectionId,
    channel: 'email' | 'slack',
    keys: readonly NotificationPreferenceKey[],
    enabled: boolean
  ) => {
    const preferences = channel === 'email' ? emailPreferences : slackPreferences;
    if (!preferences) return;

    const previousEmail = emailPreferences;
    const previousSlack = slackPreferences;
    const patch = Object.fromEntries(keys.map((key) => [key, enabled]));

    if (channel === 'email') {
      setEmailPreferences({ ...preferences, ...patch } as PipelineEmailPreferences);
    } else {
      setSlackPreferences({ ...preferences, ...patch } as PipelineSlackPreferences);
    }
    setSavingSection(sectionId);
    setError(null);

    await persistPreferences(channel, patch, () => {
      setEmailPreferences(previousEmail);
      setSlackPreferences(previousSlack);
    });

    setSavingSection(null);
  };

  const lookupSlackEmail = async () => {
    const candidate = slackEmailInput.trim();
    if (!candidate) return;

    setSlackEmailBusy('verify');
    setError(null);

    try {
      const res = await fetch('/api/admin/account/slack-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candidate }),
      });
      const body = (await res.json()) as {
        email?: string;
        slack_name?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('slackEmailLookupError'));
      }
      if (body.email) {
        setSlackEmailInput(body.email);
      }
      setSlackProfileName(body.slack_name ?? null);
      setToast({ message: t('slackEmailLookupSuccess'), variant: 'success' });
    } catch (err) {
      setSlackProfileName(null);
      const message = err instanceof Error ? err.message : t('slackEmailLookupError');
      setError(message);
      setToast({ message, variant: 'error' });
    } finally {
      setSlackEmailBusy(null);
    }
  };

  const saveSlackEmail = async () => {
    const candidate = slackEmailInput.trim();
    setSlackEmailBusy('save');
    setError(null);

    try {
      const res = await fetch('/api/admin/account/slack-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slack_email: candidate || null,
        }),
      });
      const body = (await res.json()) as {
        slack_email?: string | null;
        slack_name?: string | null;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('slackEmailSaveError'));
      }
      setSavedSlackEmail(body.slack_email ?? null);
      setSlackEmailInput(body.slack_email ?? email);
      setSlackProfileName(body.slack_name ?? null);
      setToast({ message: t('slackEmailSaveSuccess'), variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('slackEmailSaveError');
      setError(message);
      setToast({ message, variant: 'error' });
    } finally {
      setSlackEmailBusy(null);
    }
  };

  const roleLabel = role === 'admin' ? t('roleAdmin') : t('roleAuthor');

  const renderPreferenceGroup = <T extends PipelineEmailPreferences | PipelineSlackPreferences>(
    sectionId: PreferenceSectionId,
    channel: 'email' | 'slack',
    preferences: T,
    headingId: string,
    heading: string,
    description: string,
    keys: readonly NotificationPreferenceKey[],
    descriptionPrefix: 'preference' | 'slackPreference'
  ) => {
    const sectionBusy = savingSection === sectionId;
    const enableAllChecked = sectionKeysAllEnabled(preferences, keys);
    const enableAllLabel = `${t('enableAllLabel')} — ${heading}`;

    return (
      <section aria-labelledby={headingId}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4
              id={headingId}
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {heading}
            </h4>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <ToggleSwitch
              checked={enableAllChecked}
              disabled={sectionBusy || savingKey !== null}
              onChange={(enabled) =>
                void updateSectionPreferences(sectionId, channel, keys, enabled)
              }
              ariaLabel={enableAllLabel}
            />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('enableAllLabel')}
            </span>
          </div>
        </div>
        <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
          {keys.map((key) => (
            <PreferenceToggle
              key={`${channel}-${key}`}
              checked={preferences[key as keyof T] as boolean}
              disabled={sectionBusy || savingKey === key}
              onChange={(enabled) => void updatePreference(channel, key, enabled)}
              label={t(`preference.${key}.label`)}
              description={t(`${descriptionPrefix}.${key}.description`)}
            />
          ))}
        </ul>
      </section>
    );
  };

  const hasPreferences = emailPreferences && slackPreferences;

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
        ) : error && !hasPreferences ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : hasPreferences ? (
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

              <div className="mt-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                <label
                  htmlFor="account-slack-email"
                  className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  {t('slackEmailLabel')}
                </label>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {t('slackEmailDescription')}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="account-slack-email"
                    type="email"
                    autoComplete="email"
                    value={slackEmailInput}
                    disabled={slackEmailBusy !== null}
                    onChange={(event) => {
                      setSlackEmailInput(event.target.value);
                      setSlackProfileName(null);
                    }}
                    placeholder={email}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/30 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={slackEmailBusy !== null || !slackEmailInput.trim()}
                      onClick={() => void lookupSlackEmail()}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {slackEmailBusy === 'verify' ? t('slackEmailVerifying') : t('slackEmailVerify')}
                    </button>
                    <button
                      type="button"
                      disabled={
                        slackEmailBusy !== null ||
                        slackEmailInput.trim() === (savedSlackEmail ?? email)
                      }
                      onClick={() => void saveSlackEmail()}
                      className="rounded-lg bg-sage-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sage-700 disabled:opacity-60"
                    >
                      {slackEmailBusy === 'save' ? t('slackEmailSaving') : t('slackEmailSave')}
                    </button>
                  </div>
                </div>
                {slackProfileName ? (
                  <p className="mt-2 text-sm text-green-700 dark:text-green-300" role="status">
                    {t('slackEmailMatched', { name: slackProfileName })}
                  </p>
                ) : savedSlackEmail ? (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {t('slackEmailSaved', { email: savedSlackEmail })}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {t('slackEmailFallback', { email })}
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">
                {t('notificationsHeading')}
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {t('notificationsDescription')}
              </p>

              <div className="mt-6 space-y-8">
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
                          'email-pm',
                          'email',
                          emailPreferences,
                          'account-email-pm-heading',
                          t('projectManagerHeading'),
                          t('projectManagerDescription'),
                          VISIBLE_PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS,
                          'preference'
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
                        'email-consultant',
                        'email',
                        emailPreferences,
                        'account-email-consultant-heading',
                        t('consultantHeading'),
                        t('consultantDescription'),
                        CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS,
                        'preference'
                      )}
                    </div>
                  </div>
                </section>

                <section
                  aria-labelledby="account-slack-heading"
                  className="border-t border-neutral-200 pt-8 dark:border-neutral-800"
                >
                  <h3
                    id="account-slack-heading"
                    className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg"
                  >
                    {t('slackHeading')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {isProjectManager ? t('slackDescriptionBoth') : t('slackDescriptionConsultant')}
                  </p>

                  <div className="mt-6 space-y-6">
                    {isProjectManager
                      ? renderPreferenceGroup(
                          'slack-pm',
                          'slack',
                          slackPreferences,
                          'account-slack-pm-heading',
                          t('projectManagerHeading'),
                          t('slackProjectManagerDescription'),
                          VISIBLE_PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS,
                          'slackPreference'
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
                        'slack-consultant',
                        'slack',
                        slackPreferences,
                        'account-slack-consultant-heading',
                        t('consultantHeading'),
                        t('slackConsultantDescription'),
                        CONSULTANT_PIPELINE_SLACK_PREFERENCE_KEYS,
                        'slackPreference'
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
