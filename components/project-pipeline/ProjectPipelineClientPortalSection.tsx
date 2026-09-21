'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@/components/ui';
import { isClientPortalService } from '@/lib/client-portal/eligibility';
import { jobMatchesProjectPipelineSegment } from '@/lib/project-pipeline/segment';
import { clientPortalJobPath } from '@/lib/client-portal/sanitize';
import type { ClientPortalStaffWorkspace } from '@/lib/client-portal/types';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function eligibilityMessage(
  t: ReturnType<typeof useTranslations<'admin.projectPipeline'>>,
  reasons: string[]
): string {
  if (reasons.includes('not_outdoor')) return t('clientPortal.notOutdoor');
  if (reasons.includes('unsupported_service')) return t('clientPortal.unsupportedService');
  if (reasons.includes('missing_contract')) return t('clientPortal.missingContract');
  if (reasons.includes('invalid_email')) return t('clientPortal.missingEmail');
  return t('clientPortal.notEligible');
}

export function ProjectPipelineClientPortalSection({
  job,
}: {
  job: ProjectPipelineJob;
}) {
  const t = useTranslations('admin.projectPipeline');
  const [workspace, setWorkspace] = useState<ClientPortalStaffWorkspace | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [emailNote, setEmailNote] = useState(true);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [fileLabel, setFileLabel] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const visible =
    jobMatchesProjectPipelineSegment(job.commercialOutdoor, 'Outdoor') &&
    isClientPortalService(job.service);

  useEffect(() => {
    if (!visible || !job.jobNumber.trim()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/admin/client-portal/${encodeURIComponent(job.jobNumber)}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setHidden(true);
          return;
        }
        const data = (await res.json()) as {
          workspace?: ClientPortalStaffWorkspace;
          error?: string;
        };
        if (!res.ok || !data.workspace) {
          if (!cancelled) setError(data.error || t('clientPortal.loadError'));
          return;
        }
        if (!cancelled) setWorkspace(data.workspace);
      })
      .catch(() => {
        if (!cancelled) setError(t('clientPortal.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [job.jobNumber, visible, t]);

  if (!visible || hidden) return null;

  async function postAction(payload: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/client-portal/${encodeURIComponent(job.jobNumber)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        workspace?: ClientPortalStaffWorkspace;
        error?: string;
      };
      if (!res.ok || !data.workspace) {
        setError(data.error || t('clientPortal.loadError'));
        return;
      }
      setWorkspace(data.workspace);
    } catch {
      setError(t('clientPortal.loadError'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('file');
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) return;
    const body = new FormData();
    body.append('file', fileInput.files[0]);
    if (fileLabel.trim()) body.append('label', fileLabel.trim());
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/client-portal/${encodeURIComponent(job.jobNumber)}/files`,
        { method: 'POST', body }
      );
      const data = (await res.json()) as {
        workspace?: ClientPortalStaffWorkspace;
        error?: string;
      };
      if (!res.ok || !data.workspace) {
        setError(data.error || t('clientPortal.loadError'));
        return;
      }
      setWorkspace(data.workspace);
      form.reset();
      setFileLabel('');
    } catch {
      setError(t('clientPortal.loadError'));
    } finally {
      setSaving(false);
    }
  }

  const enabled = Boolean(workspace?.engagement?.enabled);

  return (
    <div className="mt-6 space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {t('clientPortal.sectionTitle')}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">{t('clientPortal.sectionHint')}</p>
        </div>
        {enabled ? (
          <a
            href={clientPortalJobPath(job.jobNumber)}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-sage-800 hover:underline dark:text-sage-200"
          >
            {t('clientPortal.previewLink')}
          </a>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-neutral-500">{t('loading')}</p> : null}

      {workspace && !workspace.eligible ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {eligibilityMessage(t, workspace.eligibilityReasons)}
        </p>
      ) : null}

      {workspace ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {enabled ? t('clientPortal.enabled') : t('clientPortal.disabled')}
          {workspace.invitedEmail
            ? ` · ${t('clientPortal.invitedEmail', { email: workspace.invitedEmail })}`
            : ''}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving || !workspace?.eligible}
          onClick={() => void postAction({ action: enabled ? 'invite' : 'enable' })}
        >
          {saving ? t('clientPortal.saving') : t('clientPortal.enable')}
        </Button>
        {enabled ? (
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void postAction({ action: 'disable' })}
          >
            {t('clientPortal.disable')}
          </Button>
        ) : null}
      </div>

      {enabled ? (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('clientPortal.noteLabel')}
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder={t('clientPortal.notePlaceholder')}
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={emailNote}
                onChange={(event) => setEmailNote(event.target.checked)}
              />
              {t('clientPortal.emailNote')}
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || !note.trim()}
              onClick={async () => {
                await postAction({ action: 'add_update', note, emailClient: emailNote });
                setNote('');
              }}
            >
              {t('clientPortal.postNote')}
            </Button>
          </div>

          {workspace && workspace.updates.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {workspace.updates.map((update) => (
                <li
                  key={update.id}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                >
                  <p className="whitespace-pre-wrap">{update.body}</p>
                  <p className="mt-1 text-xs text-neutral-500">{update.createdByDisplayName}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-2">
            <Input
              label={t('clientPortal.requestTitle')}
              value={requestTitle}
              onChange={(event) => setRequestTitle(event.target.value)}
            />
            <textarea
              value={requestBody}
              onChange={(event) => setRequestBody(event.target.value)}
              rows={2}
              placeholder={t('clientPortal.requestBody')}
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={saving || !requestTitle.trim()}
              onClick={async () => {
                await postAction({
                  action: 'add_request',
                  title: requestTitle,
                  body: requestBody,
                });
                setRequestTitle('');
                setRequestBody('');
              }}
            >
              {t('clientPortal.addRequest')}
            </Button>
          </div>

          {workspace && workspace.requests.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {workspace.requests.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                >
                  <div>
                    <p className="font-medium">
                      {item.title}{' '}
                      <span className="text-xs font-normal text-neutral-500">({item.status})</span>
                    </p>
                    {item.body ? <p className="mt-1 text-neutral-600">{item.body}</p> : null}
                    {item.clientResponse ? (
                      <p className="mt-1 text-neutral-700">
                        {t('clientPortal.clientResponse', { response: item.clientResponse })}
                      </p>
                    ) : null}
                  </div>
                  {item.status !== 'cleared' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={saving}
                      onClick={() =>
                        void postAction({ action: 'clear_request', requestId: item.id })
                      }
                    >
                      {t('clientPortal.clearRequest')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-2">
            <Input
              label={t('clientPortal.fileLabel')}
              value={fileLabel}
              onChange={(event) => setFileLabel(event.target.value)}
            />
            <Input
              label={t('clientPortal.fileUrl')}
              value={fileUrl}
              onChange={(event) => setFileUrl(event.target.value)}
              placeholder="https://"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={saving || !fileUrl.trim()}
              onClick={async () => {
                await postAction({
                  action: 'add_file_link',
                  url: fileUrl,
                  label: fileLabel,
                });
                setFileUrl('');
                setFileLabel('');
              }}
            >
              {t('clientPortal.addFileLink')}
            </Button>
            <form className="space-y-2" onSubmit={(event) => void uploadFile(event)}>
              <Input type="file" name="file" label={t('clientPortal.uploadFile')} />
              <Button type="submit" variant="secondary" disabled={saving}>
                {t('clientPortal.uploadFile')}
              </Button>
            </form>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
